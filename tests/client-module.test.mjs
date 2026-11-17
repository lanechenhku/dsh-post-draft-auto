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