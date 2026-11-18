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
  assert.equal(mod.__internals.archivedLabel(g.archived, "zh"), "", "没有归档时 label 必须为空，面板据此不渲染该组");
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
  assert.equal(mod.__internals.archivedLabel(g.archived, "zh"), "已发 3 · 丢弃 1");
});

test("分组：只有一种状态时文案不出现 0", function () {
  const mod = loadClient();
  assert.equal(mod.__internals.archivedLabel([{ status: "published" }, { status: "published" }], "zh"), "已发 2");
  assert.equal(mod.__internals.archivedLabel([{ status: "discarded" }], "zh"), "丢弃 1");
  assert.equal(mod.__internals.archivedLabel([], "zh"), "");
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
  assert.equal(mod.__internals.archivedLabel(g.archived, "zh"), "已发 1");
});
// ---------- 界面语言 ----------

test("语言：默认中文，写过的 en 会被读回", function () {
  const mod = loadClient();
  const empty = fakeStorage({});
  assert.equal(mod.__internals.readLang({ storage: empty }), "zh", "默认必须是中文");
  assert.equal(mod.__internals.LANG_KEY, "postDraft.lang");
  mod.__internals.writeLang("en", { storage: empty });
  assert.equal(empty.dump()[mod.__internals.LANG_KEY], "en");
  assert.equal(mod.__internals.readLang({ storage: empty }), "en");
});

test("语言：localStorage 不可用时按中文处理，不抛错", function () {
  const mod = loadClient();
  const broken = { getItem: function () { throw new Error("denied"); }, setItem: function () { throw new Error("denied"); } };
  assert.equal(mod.__internals.readLang({ storage: broken }), "zh");
  assert.doesNotThrow(function () { mod.__internals.writeLang("en", { storage: broken }); });
});

test("语言：折叠组文案跟着语言走", function () {
  const mod = loadClient();
  const archived = [{ status: "published" }, { status: "published" }, { status: "discarded" }];
  assert.equal(mod.__internals.archivedLabel(archived, "zh"), "已发 2 · 丢弃 1");
  assert.equal(mod.__internals.archivedLabel(archived, "en"), "Posted 2 · Discarded 1");
});
// ---------- 保存失败的可读错误（用户报的 P0） ----------

function fakeResponse(spec) {
  return {
    ok: spec.ok,
    status: spec.status,
    headers: { get: function () { return spec.contentType || ""; } },
    text: function () { return Promise.resolve(spec.body === undefined ? "" : spec.body); }
  };
}

test("readJsonResponse：500 + 空 body 不抛 JSON 解析错误，给出 HTTP 状态码", async function () {
  const mod = loadClient();
  await assert.rejects(
    function () { return mod.__internals.readJsonResponse(fakeResponse({ ok: false, status: 500, body: "" }), "保存失败"); },
    function (err) {
      assert.ok(err.message.indexOf("保存失败") !== -1, err.message);
      assert.ok(err.message.indexOf("HTTP 500") !== -1, err.message);
      assert.ok(err.message.indexOf("empty body") !== -1, err.message);
      assert.equal(err.message.indexOf("Unexpected end of JSON input"), -1, "不能再把 JSON 解析错误抛给用户");
      return true;
    }
  );
});

test("readJsonResponse：HTTP 200 + 非 JSON 原文，错误里带原文前 200 字", async function () {
  const mod = loadClient();
  await assert.rejects(
    function () { return mod.__internals.readJsonResponse(fakeResponse({ ok: true, status: 200, body: "Internal Server Error: boom", contentType: "text/plain" }), "保存失败："); },
    function (err) {
      assert.ok(err.message.indexOf("HTTP 200") !== -1, err.message);
      assert.ok(err.message.indexOf("Internal Server Error") !== -1, err.message);
      assert.equal(err.message.indexOf("保存失败："), -1, "标签尾部的冒号要清掉，避免出现「保存失败：（HTTP…」");
      return true;
    }
  );
});

test("readJsonResponse：200 + 合法 JSON 正常返回；ok:false 也当错误", async function () {
  const mod = loadClient();
  const ok = await mod.__internals.readJsonResponse(fakeResponse({ ok: true, status: 200, body: JSON.stringify({ ok: true, value: 1 }), contentType: "application/json" }), "x");
  assert.equal(ok.value, 1);
  await assert.rejects(function () {
    return mod.__internals.readJsonResponse(fakeResponse({ ok: true, status: 200, body: JSON.stringify({ ok: false, error: "too_long" }), contentType: "application/json" }), "保存失败");
  }, /too_long/);
});

// ---------- 设置：默认值 / 持久化 / 恢复默认 ----------

test("设置：默认值（neutral + 两个开关都开）", function () {
  const mod = loadClient();
  const s = mod.__internals.readSettings({ storage: fakeStorage({}) });
  assert.deepEqual(s, { defaultTone: "neutral", includeFacts: true, includeVoice: true, sendMode: "send", deliveryMode: "queue" });
  assert.equal(mod.__internals.SETTINGS_KEY, "postDraft.settings");
});

test("设置：写入后能读回，未知语气回落 neutral", function () {
  const mod = loadClient();
  const st = fakeStorage({});
  mod.__internals.writeSettings({ defaultTone: "shorter", includeFacts: false, includeVoice: true }, { storage: st });
  const back = mod.__internals.readSettings({ storage: st });
  assert.deepEqual(back, { defaultTone: "shorter", includeFacts: false, includeVoice: true, sendMode: "send", deliveryMode: "queue" });

  st.setItem(mod.__internals.SETTINGS_KEY, JSON.stringify({ defaultTone: "" }));
  assert.equal(mod.__internals.readSettings({ storage: st }).defaultTone, "neutral");
});

test("设置：损坏的 JSON / storage 抛错时回落默认，不炸面板", function () {
  const mod = loadClient();
  const bad = fakeStorage({});
  bad.setItem(mod.__internals.SETTINGS_KEY, "{not json");
  assert.deepEqual(mod.__internals.readSettings({ storage: bad }), { defaultTone: "neutral", includeFacts: true, includeVoice: true, sendMode: "send", deliveryMode: "queue" });

  const broken = { getItem: function () { throw new Error("denied"); }, setItem: function () { throw new Error("denied"); } };
  assert.equal(mod.__internals.readSettings({ storage: broken }).defaultTone, "neutral");
  assert.doesNotThrow(function () { mod.__internals.writeSettings({ defaultTone: "technical" }, { storage: broken }); });
});

test("设置：恢复默认会写回 DEFAULT_SETTINGS", function () {
  const mod = loadClient();
  const st = fakeStorage({});
  mod.__internals.writeSettings({ defaultTone: "casual", includeFacts: false, includeVoice: false }, { storage: st });
  const reset = mod.__internals.writeSettings(mod.__internals.DEFAULT_SETTINGS, { storage: st });
  assert.deepEqual(reset, { defaultTone: "neutral", includeFacts: true, includeVoice: true, sendMode: "send", deliveryMode: "queue" });
  assert.deepEqual(mod.__internals.readSettings({ storage: st }), reset);
});

// ---------- 一键投递 / 降级复制 ----------

function deliveryDeps(overrides) {
  const state = { copied: [], sends: [], targets: 0 };
  const deps = {
    state: state,
    getPrompt: async function () { return "PROMPT TEXT"; },
    copy: async function (text) { state.copied.push(text); return { ok: true, method: "clipboard" }; },
    getTarget: async function () { state.targets += 1; return { session: overrides && overrides.noSession ? null : { sessionId: "sess-1", short: "sess-1", cwd: "/w" } }; },
    confirmTarget: function () { return overrides && overrides.confirmTarget === false ? false : true; },
    send: async function (payload) {
      state.sends.push(payload);
      if (overrides && overrides.sendThrows) throw new Error("boom");
      if (overrides && overrides.rejected) return { ok: false, error: "rejected" };
      return { ok: true, sessionId: "sess-1", short: "sess-1", mode: payload.mode, requestId: payload.requestId };
    },
    newRequestId: function () { return "req-fixed"; }
  };
  return deps;
}

test("投递：默认一键投递，成功时不复制", async function () {
  const mod = loadClient();
  const deps = deliveryDeps();
  const result = await mod.__internals.deliverOrCopy("d1", { tone: "shorter", lang: "zh", sendMode: "send", deliveryMode: "queue" }, deps);
  assert.equal(result.delivered, true);
  assert.equal(result.copied, false);
  assert.equal(deps.state.copied.length, 0);
  assert.equal(deps.state.sends.length, 1);
  assert.equal(deps.state.sends[0].requestId, "req-fixed");
  assert.equal(deps.state.sends[0].mode, "queue");
  assert.equal(deps.state.sends[0].facts, true, "默认带 facts");
});

test("投递：被拒 / 抛错 / 没有会话都退回复制指令", async function () {
  const mod = loadClient();
  for (const scenario of [{ rejected: true }, { sendThrows: true }, { noSession: true }]) {
    const deps = deliveryDeps(scenario);
    const result = await mod.__internals.deliverOrCopy("d1", { tone: "neutral", lang: "zh", sendMode: "send" }, deps);
    assert.equal(result.delivered, false, JSON.stringify(scenario));
    assert.equal(result.copied, true, JSON.stringify(scenario));
    assert.deepEqual(deps.state.copied, ["PROMPT TEXT"]);
  }
});

test("投递：sendMode=copy 时完全不碰会话", async function () {
  const mod = loadClient();
  const deps = deliveryDeps();
  const result = await mod.__internals.deliverOrCopy("d1", { sendMode: "copy" }, deps);
  assert.equal(result.copied, true);
  assert.equal(deps.state.targets, 0);
  assert.equal(deps.state.sends.length, 0);
});

test("投递：用户取消投递不发送也不复制", async function () {
  const mod = loadClient();
  const deps = deliveryDeps({ confirmTarget: false });
  const result = await mod.__internals.deliverOrCopy("d1", { sendMode: "send" }, deps);
  assert.equal(result.delivered, false);
  assert.equal(result.reason, "cancelled");
  assert.equal(deps.state.sends.length, 0);
  assert.equal(deps.state.copied.length, 0);
});

test("设置：新增 sendMode / deliveryMode 默认值与持久化", function () {
  const mod = loadClient();
  const st = fakeStorage({});
  const defaults = mod.__internals.readSettings({ storage: st });
  assert.equal(defaults.sendMode, "send");
  assert.equal(defaults.deliveryMode, "queue");
  mod.__internals.writeSettings({ sendMode: "copy", deliveryMode: "steer" }, { storage: st });
  const back = mod.__internals.readSettings({ storage: st });
  assert.equal(back.sendMode, "copy");
  assert.equal(back.deliveryMode, "steer");
  assert.equal(mod.__internals.DEFAULT_SETTINGS.sendMode, "send");
});
