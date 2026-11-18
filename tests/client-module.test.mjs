import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const CLIENT = fileURLToPath(new URL("../lib/client.js", import.meta.url));

/** 在假 window 里加载浏览器半部分，返回插件对象。 */
function loadClient() {
  const source = fs.readFileSync(CLIENT, "utf8");
  let definition = null;
  globalThis.window = {
    __ModuleLoader__: {
      load(def) { definition = def; }
    }
  };
  try {
    // eslint-disable-next-line no-eval
    (0, eval)(source);
  } finally {
    delete globalThis.window;
  }
  assert.ok(definition, "客户端模块必须调用 __ModuleLoader__.load");
  assert.equal(definition.id, "dsh-post-draft-auto");
  const react = {
    createElement(type, props) {
      return { type, props: props || {}, children: Array.prototype.slice.call(arguments, 2) };
    },
    useState(initial) { return [initial, function () {}]; },
    useEffect() {},
    useCallback(fn) { return fn; }
  };
  return definition.factory(function (name) {
    if (name === "react") return react;
    throw new Error("unexpected require: " + name);
  });
}

test("客户端模块导出 cordis 契约与侧栏注册", function () {
  const mod = loadClient();
  assert.equal(mod.name, "dsh-post-draft-auto");
  assert.deepEqual(mod.inject, ["slots", "sidebarRightTabs"]);
  assert.equal(typeof mod.apply, "function");
});

test("apply 注册「出稿」页签 + 两个 slot", function () {
  const mod = loadClient();
  const tabs = [];
  const slots = [];
  const ctx = {
    effect(fn) { return fn(); },
    get(name) {
      if (name === "slots") return {
        inject(slotName, fn) { slots.push(slotName); fn(); },
        register(spec, component) { return { spec, component }; }
      };
      if (name === "sidebarRightTabs") return {
        register(spec) { tabs.push(spec); return function () {}; }
      };
      return undefined;
    }
  };
  mod.apply(ctx);
  assert.equal(tabs.length, 1);
  assert.equal(tabs[0].kind, "post-draft");
  assert.equal(tabs[0].id, "post-draft");
  assert.equal(typeof tabs[0].title, "function");
  assert.equal(tabs[0].title(), "出稿");
  assert.deepEqual(slots, ["sidebar.right.pane.tab", "sidebar.right.pane.tab.title"]);
});

test("复制：优先 navigator.clipboard", async function () {
  const mod = loadClient();
  const written = [];
  const result = await mod.__internals.copyText("hello", {
    navigator: { clipboard: { writeText: async (t) => { written.push(t); } } },
    document: {}
  });
  assert.deepEqual(result, { ok: true, method: "clipboard" });
  assert.deepEqual(written, ["hello"]);
});

test("复制：clipboard 被拒时退到 textarea + execCommand", async function () {
  const mod = loadClient();
  const area = { value: "", style: {}, setAttribute() {}, focus() {}, select() {} };
  const doc = {
    createElement() { return area; },
    body: { appendChild(node) { doc.appended = node; }, removeChild() { doc.removed = true; } },
    execCommand(cmd) { return cmd === "copy"; }
  };
  const result = await mod.__internals.copyText("正文", {
    navigator: { clipboard: { writeText: async () => { throw new Error("NotAllowedError"); } } },
    document: doc
  });
  assert.deepEqual(result, { ok: true, method: "execCommand" });
  assert.equal(area.value, "正文");
  assert.equal(doc.removed, true, "复制成功后移除临时 textarea");
});

test("复制：两者都失败时保留选中并返回提示", async function () {
  const mod = loadClient();
  const area = { value: "", style: {}, setAttribute() {}, focus() {}, select() {} };
  const doc = {
    createElement() { return area; },
    body: { appendChild() {}, removeChild() {} },
    execCommand() { return false; }
  };
  const result = await mod.__internals.copyText("x", {
    navigator: { clipboard: { writeText: async () => { throw new Error("denied"); } } },
    document: doc
  });
  assert.equal(result.ok, false);
  assert.equal(result.method, "selected");
  assert.equal(result.selection, area, "留着选中让用户按 ⌘C");
});

test("复制：没有 document 也没有 clipboard 时明确失败", async function () {
  const mod = loadClient();
  const result = await mod.__internals.copyText("x", { navigator: {}, document: undefined });
  assert.equal(result.ok, false);
  assert.equal(result.method, "none");
});
// ---------- 折叠组：分组 / 文案 / 记忆 / 乐观更新 ----------

function fakeStorage(initial) {
  const map = Object.assign({}, initial || {});
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
    setItem: function (k, v) { map[k] = String(v); },
    removeItem: function (k) { delete map[k]; },
    dump: function () { return map; }
  };
}

test("分组：没有已发/丢弃时不出现折叠组，文案为空", function () {
  const mod = loadClient();
  const drafts = [{ id: "a", status: "drafted" }, { id: "b", status: "copied" }];
  const g = mod.__internals.splitDrafts(drafts);
  assert.equal(g.active.length, 2);
  assert.equal(g.archived.length, 0);
  assert.equal(g.archivedLabel, "", "没有归档时 label 必须为空，面板据此不渲染该组");
});

test("分组：已发 3 + 丢弃 1 → 文案「已发 3 · 丢弃 1」，顶部只剩待发/已复制", function () {
  const mod = loadClient();
  const drafts = [
    { id: "a", status: "drafted" },
    { id: "b", status: "published" },
    { id: "c", status: "published" },
    { id: "d", status: "discarded" },
    { id: "e", status: "published" },
    { id: "f", status: "copied" }
  ];
  const g = mod.__internals.splitDrafts(drafts);
  assert.deepEqual(g.active.map(function (d) { return d.id; }), ["a", "f"]);
  assert.deepEqual(g.archived.map(function (d) { return d.id; }), ["b", "c", "d", "e"]);
  assert.equal(g.archivedLabel, "已发 3 · 丢弃 1");
});

test("分组：只有一种状态时文案不出现 0", function () {
  const mod = loadClient();
  assert.equal(mod.__internals.archivedLabel([{ status: "published" }, { status: "published" }]), "已发 2");
  assert.equal(mod.__internals.archivedLabel([{ status: "discarded" }]), "丢弃 1");
  assert.equal(mod.__internals.archivedLabel([]), "");
});

test("折叠状态：默认收起，写过的值会被读回", function () {
  const mod = loadClient();
  const empty = fakeStorage({});
  assert.equal(mod.__internals.readArchivedOpen({ storage: empty }), false, "默认必须收起");
  assert.equal(mod.__internals.ARCHIVED_KEY, "postDraft.publishedOpen");

  mod.__internals.writeArchivedOpen(true, { storage: empty });
  assert.equal(empty.dump()[mod.__internals.ARCHIVED_KEY], "1");
  assert.equal(mod.__internals.readArchivedOpen({ storage: empty }), true);

  mod.__internals.writeArchivedOpen(false, { storage: empty });
  assert.equal(mod.__internals.readArchivedOpen({ storage: empty }), false);
});

test("折叠状态：localStorage 不可用时不抛错、按收起处理", function () {
  const mod = loadClient();
  const broken = { getItem: function () { throw new Error("denied"); }, setItem: function () { throw new Error("denied"); } };
  assert.equal(mod.__internals.readArchivedOpen({ storage: broken }), false);
  assert.doesNotThrow(function () { mod.__internals.writeArchivedOpen(true, { storage: broken }); });
  assert.equal(mod.__internals.readArchivedOpen({ storage: null }), false);
});

test("乐观更新：markPublished 把目标改成 published，不改原数组、不动其它条目顺序", function () {
  const mod = loadClient();
  const before = [{ id: "a", status: "drafted" }, { id: "b", status: "drafted" }];
  const after = mod.__internals.markPublished(before, "b");
  assert.equal(after[1].status, "published");
  assert.equal(after[0].status, "drafted");
  assert.equal(before[1].status, "drafted", "不能改到原数组，失败回滚要靠它");
  assert.deepEqual(after.map(function (d) { return d.id; }), ["a", "b"]);

  const g = mod.__internals.splitDrafts(after);
  assert.deepEqual(g.active.map(function (d) { return d.id; }), ["a"], "点完已发，卡片立刻离开顶部");
  assert.deepEqual(g.archived.map(function (d) { return d.id; }), ["b"]);
  assert.equal(g.archivedLabel, "已发 1");
});
