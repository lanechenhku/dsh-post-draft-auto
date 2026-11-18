import test from "node:test";
import assert from "node:assert/strict";

test("插件导出 cordis 契约（name / inject / apply）", async function () {
  const mod = await import("../lib/plugin.mjs");
  assert.equal(mod.name, "post-draft-auto");
  assert.deepEqual(mod.inject, ["tools", "systemPrompt", "webServer"]);
  assert.equal(typeof mod.apply, "function");
});

test("apply(ctx) 真的注册了四个工具并挂上 systemPrompt", async function () {
  const mod = await import("../lib/plugin.mjs");
  const registered = [];
  const sections = [];
  const effects = [];
  const ctx = {
    tools: { register: function (t) { registered.push(t); return function () {}; } },
    systemPrompt: { section: function (s) { sections.push(s); return function () {}; } },
    effect: function (fn, label) { effects.push(label); return fn(); }
  };
  mod.apply(ctx);
  assert.deepEqual(registered.map(function (t) { return t.name; }).sort(),
    ["post_facts", "post_list", "post_mark_posted", "post_save"]);
  registered.forEach(function (t) {
    assert.equal(typeof t.execute, "function");
    assert.ok(t.parameters && t.parameters.type === "object", t.name + " 需要 JSON Schema");
    assert.ok(t.description && t.description.length > 20, t.name + " 需要描述");
  });
  assert.equal(sections.length, 1);
  assert.ok(sections[0].text.indexOf("post_facts") !== -1);
  assert.ok(effects.length >= 2);
});

test("apply(ctx) 在 webServer 可用时注册侧栏面板的全部路由", async function () {
  const mod = await import("../lib/plugin.mjs");
  const routes = [];
  const ctx = {
    tools: { register: function () { return function () {}; } },
    systemPrompt: { section: function () { return function () {}; } },
    webServer: { register: function (route) { routes.push(route); return function () {}; } },
    effect: function (fn) { return fn(); }
  };
  mod.apply(ctx);
  assert.deepEqual(routes.map(function (r) { return r.path; }).sort(),
    ["/post-draft/copy", "/post-draft/draft", "/post-draft/list", "/post-draft/mark-posted",
      "/post-draft/rewrite-prompt", "/post-draft/send-prompt", "/post-draft/target", "/post-draft/tones"]);
  routes.forEach(function (route) {
    assert.equal(route.kind, "exact");
    assert.equal(typeof route.handler, "function");
  });
});

test("没有 webServer（tui / headless profile）时不报错，工具照常注册", async function () {
  const mod = await import("../lib/plugin.mjs");
  const registered = [];
  const ctx = {
    tools: { register: function (t) { registered.push(t.name); return function () {}; } },
    systemPrompt: { section: function () { return function () {}; } },
    effect: function (fn) { return fn(); }
  };
  assert.doesNotThrow(function () { mod.apply(ctx); });
  assert.equal(registered.length, 4);
});