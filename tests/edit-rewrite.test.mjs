import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "xdd-edit-"));
process.env.XDD_DATA_DIR = TMP;

const store = await import("../lib/store.mjs");
const weight = await import("../lib/weight.mjs");
const { updateDraftText } = store;
const { buildRewritePrompt, tonesFrom, findTone } = await import("../lib/rewrite.mjs");
const { routes, ROUTE_PATHS } = await import("../lib/web-api.mjs");

const config = {
  limits: { tweet: 280 },
  brand: { name: "Acme", product: "DSH", color: "#0f766e", accent: "#14b8a6", footer: "example.com" },
  voice: { banned: ["excited to announce", "revolutionary"], maxHashtags: 2, maxEmoji: 3 },
  sources: {}
};

function makeDraft(overrides) {
  return store.createDraft(Object.assign({
    sourceKey: "paper:test:edit-" + Math.random().toString(36).slice(2, 7),
    source: { kind: "paper", label: "test", url: "https://example.org/p", version: "v1" },
    title: "Editable draft",
    facts: [{ id: "f1", kind: "version", value: "1.2.3", detail: "v1.2.3", sourceUrl: "https://example.org/p" }],
    enText: "Original English body.\n\nhttps://example.org/p",
    zhText: "原始中文正文。\n\nhttps://example.org/p",
    enWeight: 50,
    zhWeight: 60,
    pending: [],
    blockers: [],
    warnings: [],
    card: { title: "T", subtitle: "", version: "v1", bullets: [], brand: config.brand },
    reference: null,
    guard: null
  }, overrides || {}), config, { force: true }).draft;
}

test("编辑保存：重算计权、写 history、打「已改」标记", function () {
  const draft = makeDraft();
  const en = "Edited English body, shorter.";
  const zh = "改过的中文正文。";
  const result = updateDraftText(draft.id, { en: en, zh: zh }, config);
  assert.equal(result.ok, true);
  assert.equal(result.enWeight, weight.weightedLength(en));
  assert.equal(result.zhWeight, weight.weightedLength(zh));

  const saved = store.getDraft(draft.id);
  assert.equal(saved.enText, en);
  assert.equal(saved.zhText, zh);
  assert.equal(saved.enWeight, weight.weightedLength(en));
  assert.equal(saved.zhWeight, weight.weightedLength(zh));
  assert.equal(saved.manualEdit, true, "编辑后要标「已改」");
  const entry = saved.history[saved.history.length - 1];
  assert.equal(entry.event, "manual edit");
  assert.ok(entry.note.indexOf("EN " + saved.enWeight) !== -1);
});

test("编辑保存：超过 280 拒绝，磁盘内容不变", function () {
  const draft = makeDraft();
  const before = store.getDraft(draft.id);
  const tooLong = "x".repeat(281);
  const result = updateDraftText(draft.id, { en: tooLong, zh: before.zhText }, config);
  assert.equal(result.ok, false);
  assert.equal(result.code, "too_long");
  assert.equal(result.limit, 280);
  assert.ok(result.enWeight > 280);

  const after = store.getDraft(draft.id);
  assert.equal(after.enText, before.enText, "拒绝时不能落盘");
  assert.equal(after.zhText, before.zhText);
  assert.equal(after.manualEdit, undefined);
});

test("编辑保存：CJK 按 2 计权（140 字中文就满 280）", function () {
  const draft = makeDraft();
  const zh140 = "中".repeat(140);
  const okResult = updateDraftText(draft.id, { en: "ok", zh: zh140 }, config);
  assert.equal(okResult.ok, true);
  assert.equal(okResult.zhWeight, 280);

  const overResult = updateDraftText(draft.id, { en: "ok", zh: "中".repeat(141) }, config);
  assert.equal(overResult.ok, false);
  assert.equal(overResult.code, "too_long");
});

test("编辑保存：内容没变时不写 history", function () {
  const draft = makeDraft();
  const before = store.getDraft(draft.id);
  const result = updateDraftText(draft.id, { en: before.enText, zh: before.zhText }, config);
  assert.equal(result.ok, true);
  assert.equal(result.unchanged, true);
  const after = store.getDraft(draft.id);
  assert.equal(after.history.length, before.history.length);
});

test("语气：默认四个选项，config.rewriteTones 可以只覆盖 instruction", function () {
  assert.deepEqual(tonesFrom(config).map(function (x) { return x.id; }), ["neutral", "shorter", "technical", "casual"]);
  const custom = { rewriteTones: [{ id: "neutral", instruction: "只保留事实" }, { id: "shorter" }] };
  const tones = tonesFrom(custom);
  assert.equal(tones.length, 2);
  assert.equal(tones[0].instruction, "只保留事实");
  assert.equal(tones[0].label, "中性", "label 没写就沿用默认");
  assert.equal(findTone(config, "nope").id, "neutral", "未知语气回退第一个");
});

test("重写指令：带上选中的语气、facts、现有正文与硬规则", function () {
  const draft = makeDraft();
  const prompt = buildRewritePrompt(draft, config, "shorter", "zh");
  assert.ok(prompt.indexOf(draft.id) !== -1, "要带上 draft id");
  assert.ok(prompt.indexOf("更短") !== -1, "要带上语气标签");
  assert.ok(prompt.indexOf("60-70%") !== -1, "要带上该语气的改写要求");
  assert.ok(prompt.indexOf("v1.2.3") !== -1, "要带上 facts");
  assert.ok(prompt.indexOf("Original English body") !== -1, "要带上现有正文");
  assert.ok(prompt.indexOf("excited to announce") !== -1, "要带上 voice 禁用词");
  assert.ok(prompt.indexOf("280") !== -1, "要带上计权上限");

  const english = buildRewritePrompt(draft, config, "technical", "en");
  assert.ok(english.indexOf("More technical") !== -1);
  assert.ok(english.indexOf("paper:test") !== -1 || english.indexOf("sourceKey") !== -1);
});

function fakeRes() {
  const state = { status: 0, headers: {}, body: "" };
  return {
    state: state,
    writeHead(status, headers) { state.status = status; state.headers = headers || {}; },
    end(body) { state.body = body === undefined ? "" : String(body); }
  };
}

function fakeReq(method, url, payload) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  return {
    method: method,
    url: url,
    on(evt, cb) { if (evt === "data") cb(Buffer.from(body)); if (evt === "end") cb(); }
  };
}

function route(p) {
  const found = routes().filter(function (r) { return r.path === p; })[0];
  assert.ok(found, "缺失路由: " + p);
  return found;
}

test("PUT /post-draft/draft：真实处理请求，200 并回新权重", async function () {
  const draft = makeDraft();
  const res = fakeRes();
  await route("/post-draft/draft").handler(fakeReq("PUT", "/post-draft/draft", { id: draft.id, en: "Edited EN.", zh: "改过的中文。" }), res);
  assert.equal(res.state.status, 200);
  const payload = JSON.parse(res.state.body);
  assert.equal(payload.ok, true);
  assert.equal(payload.enWeight, weight.weightedLength("Edited EN."));
  assert.equal(payload.draft.edited, true);
});

test("PUT /post-draft/draft：超 280 返回 422，GET 能读回原文", async function () {
  const draft = makeDraft();
  const res = fakeRes();
  await route("/post-draft/draft").handler(fakeReq("PUT", "/post-draft/draft", { id: draft.id, en: "y".repeat(300), zh: "ok" }), res);
  assert.equal(res.state.status, 422);
  const payload = JSON.parse(res.state.body);
  assert.equal(payload.error, "too_long");
  assert.ok(payload.enWeight > 280);

  const getRes = fakeRes();
  await route("/post-draft/draft").handler(fakeReq("GET", "/post-draft/draft?id=" + draft.id), getRes);
  assert.equal(JSON.parse(getRes.state.body).draft.enText.indexOf("yyy"), -1, "超限内容不能落盘");
});

test("GET /post-draft/rewrite-prompt：语气进入返回文本", async function () {
  const draft = makeDraft();
  const res = fakeRes();
  await route("/post-draft/rewrite-prompt").handler(fakeReq("GET", "/post-draft/rewrite-prompt?id=" + draft.id + "&tone=casual&lang=zh"), res);
  assert.equal(res.state.status, 200);
  assert.ok(res.state.body.indexOf("更口语") !== -1);
  assert.ok(res.state.body.indexOf(draft.id) !== -1);
});

test("GET /post-draft/tones：返回可选语气", async function () {
  const res = fakeRes();
  await route("/post-draft/tones").handler(fakeReq("GET", "/post-draft/tones"), res);
  const payload = JSON.parse(res.state.body);
  assert.deepEqual(payload.tones.map(function (x) { return x.id; }), ["neutral", "shorter", "technical", "casual"]);
});

test("客户端 weighText 与 lib/weight.mjs 结果一致（编辑框数字不能骗人）", async function () {
  const clientPath = fileURLToPath(new URL("../lib/client.js", import.meta.url));
  let def = null;
  globalThis.window = { __ModuleLoader__: { load(d) { def = d; } } };
  try { (0, eval)(fs.readFileSync(clientPath, "utf8")); } finally { delete globalThis.window; }
  const internals = def.factory(function () { return { createElement() { return {}; }, useState(v) { return [v, function () {}]; }, useEffect() {}, useCallback(fn) { return fn; } }; }).__internals;
  const samples = [
    "hello world",
    "中文一条推",
    "https://www.biorxiv.org/content/10.64898/2026.11.02.763731v1",
    "· 70 omni-loci at FDR 5% across 444 GWAS",
    "混合 English 与中文，还有 emoji 🚀 和链接 https://example.org/a?b=1"
  ];
  samples.forEach(function (s) {
    assert.equal(internals.weighText(s), weight.weightedLength(s), "不一致: " + s);
  });
});
test("PUT 与 POST 都能保存（宿主只保证 GET/POST 转发）", async function () {
  const draft = makeDraft();
  const putRes = fakeRes();
  await route("/post-draft/draft").handler(fakeReq("PUT", "/post-draft/draft", { id: draft.id, en: "via PUT", zh: "走 PUT" }), putRes);
  assert.equal(putRes.state.status, 200);

  const postRes = fakeRes();
  await route("/post-draft/draft").handler(fakeReq("POST", "/post-draft/draft", { id: draft.id, en: "via POST", zh: "走 POST" }), postRes);
  assert.equal(postRes.state.status, 200);
  const saved = store.getDraft(draft.id);
  assert.equal(saved.enText, "via POST", "POST 必须真的落盘");
  assert.equal(saved.zhText, "走 POST");
});

test("GET / DELETE 等不支持的方法回 405（不是空 body）", async function () {
  const draft = makeDraft();
  const res = fakeRes();
  await route("/post-draft/draft").handler(fakeReq("DELETE", "/post-draft/draft?id=" + draft.id), res);
  assert.equal(res.state.status, 405);
  const payload = JSON.parse(res.state.body);
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "method not allowed");
});

test("ROUTE_PATHS 与 routes() 完全一致（新增路由不会漏登记）", function () {
  const paths = routes().map(function (r) { return r.path; }).sort();
  assert.deepEqual(ROUTE_PATHS.slice().sort(), paths);
  ["/post-draft/draft", "/post-draft/tones", "/post-draft/rewrite-prompt", "/post-draft/list", "/post-draft/copy", "/post-draft/mark-posted"]
    .forEach(function (p) { assert.ok(ROUTE_PATHS.indexOf(p) !== -1, "缺路由: " + p); });
});

test("重写指令开关：facts / voice 可单独关掉", function () {
  const draft = makeDraft();
  const full = buildRewritePrompt(draft, config, "neutral", "zh");
  assert.ok(full.indexOf("v1.2.3") !== -1, "默认带 facts");
  assert.ok(full.indexOf("excited to announce") !== -1, "默认带禁用词");

  const noFacts = buildRewritePrompt(draft, config, "neutral", "zh", { facts: false });
  assert.equal(noFacts.indexOf("v1.2.3"), -1, "关掉后不带 facts 明细");

  const noVoice = buildRewritePrompt(draft, config, "neutral", "zh", { voice: false });
  assert.equal(noVoice.indexOf("excited to announce"), -1, "关掉后不带禁用词");
  assert.ok(noVoice.indexOf("链接保留") !== -1, "仍然要求保留链接");
});

test("GET /post-draft/rewrite-prompt 支持 facts=0 / voice=0", async function () {
  const draft = makeDraft();
  const off = fakeRes();
  await route("/post-draft/rewrite-prompt").handler(fakeReq("GET", "/post-draft/rewrite-prompt?id=" + draft.id + "&tone=neutral&lang=zh&facts=0&voice=0"), off);
  assert.equal(off.state.status, 200);
  assert.equal(off.state.body.indexOf("v1.2.3"), -1);
  assert.equal(off.state.body.indexOf("excited to announce"), -1);

  const on = fakeRes();
  await route("/post-draft/rewrite-prompt").handler(fakeReq("GET", "/post-draft/rewrite-prompt?id=" + draft.id + "&tone=neutral&lang=zh"), on);
  assert.ok(on.state.body.indexOf("v1.2.3") !== -1);
});

// ---------- 一键投递（sessionController.prompt） ----------

function fakeController(spec) {
  const calls = [];
  const controller = {
    calls: calls,
    list: async function () { return { items: spec.items || [] }; },
    prompt: async function (request, signal) {
      // 模拟宿主 SessionController.prompt(request, signal)：第一件事就是 throwIfAborted
      signal.throwIfAborted();
      calls.push({ request: request, signal: signal, source: { kind: "user", rpcId: request.requestId } });
      if (spec.reject) throw new Error("agent-busy");
      return { accepted: spec.accepted === false ? false : true };
    }
  };
  return controller;
}

function routeWith(host, path) {
  const found = routes(host).filter(function (r) { return r.path === path; })[0];
  assert.ok(found, "缺失路由: " + path);
  return found;
}

test("send-prompt 路由已注册（ROUTE_PATHS 里有）", function () {
  assert.ok(ROUTE_PATHS.indexOf("/post-draft/send-prompt") !== -1);
  assert.ok(ROUTE_PATHS.indexOf("/post-draft/target") !== -1);
});

test("send-prompt：没有宿主能力时 503，客户端据此降级", async function () {
  const draft = makeDraft();
  const res = fakeRes();
  await route("/post-draft/send-prompt").handler(fakeReq("POST", "/post-draft/send-prompt", { id: draft.id }), res);
  assert.equal(res.state.status, 503);
  const payload = JSON.parse(res.state.body);
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "host-unavailable");
});

test("send-prompt：投递给最近活动会话，带可追溯前缀与 mode", async function () {
  const draft = makeDraft();
  const controller = fakeController({ items: [{ sessionId: "sess-1", cwd: "/w", updatedAt: 2 }, { sessionId: "sess-2", cwd: "/w", updatedAt: 1 }] });
  const res = fakeRes();
  await routeWith({ getController: function () { return controller; } }, "/post-draft/send-prompt")
    .handler(fakeReq("POST", "/post-draft/send-prompt", { id: draft.id, tone: "shorter", lang: "zh", requestId: "req-1", mode: "queue" }), res);
  assert.equal(res.state.status, 200);
  const payload = JSON.parse(res.state.body);
  assert.equal(payload.ok, true);
  assert.equal(payload.sessionId, "sess-1");
  assert.equal(payload.mode, "queue");

  assert.equal(controller.calls.length, 1);
  const call = controller.calls[0];
  assert.equal(call.request.sessionId, "sess-1");
  assert.equal(call.request.requestId, "req-1");
  assert.equal(call.request.mode, "queue");
  const text = call.request.content[0].text;
  assert.ok(text.indexOf("[出稿面板]") === 0, "要能看出是插件发的: " + text.slice(0, 30));
  assert.ok(text.indexOf(draft.id) !== -1);
  assert.ok(text.indexOf("更短") !== -1);
  assert.equal(typeof call.signal.throwIfAborted, "function", "宿主 SessionController.prompt 需要 AbortSignal");
  assert.deepEqual(call.source, { kind: "user", rpcId: "req-1" }, "宿主用 requestId 作为 rpcId 建 user source");
});

test("send-prompt：同一个 requestId 不重复投递", async function () {
  const draft = makeDraft();
  const controller = fakeController({ items: [{ sessionId: "sess-1" }] });
  const host = { getController: function () { return controller; } };
  const table = routes(host);
  const handler = table.filter(function (r) { return r.path === "/post-draft/send-prompt"; })[0].handler;
  const first = fakeRes();
  const second = fakeRes();
  const body = { id: draft.id, requestId: "req-dup", mode: "queue" };
  await handler(fakeReq("POST", "/post-draft/send-prompt", body), first);
  await handler(fakeReq("POST", "/post-draft/send-prompt", body), second);
  assert.equal(first.state.status, 200);
  assert.equal(second.state.status, 200);
  assert.equal(controller.calls.length, 1, "同一个 requestId 只能投递一次");
  assert.equal(JSON.parse(second.state.body).duplicate, true);
});

test("send-prompt：accepted:false 时回 502 rejected（客户端会转复制）", async function () {
  const draft = makeDraft();
  const controller = fakeController({ items: [{ sessionId: "sess-1" }], accepted: false });
  const res = fakeRes();
  await routeWith({ getController: function () { return controller; } }, "/post-draft/send-prompt")
    .handler(fakeReq("POST", "/post-draft/send-prompt", { id: draft.id, requestId: "req-rej" }), res);
  assert.equal(res.state.status, 502);
  assert.equal(JSON.parse(res.state.body).error, "rejected");
});

test("send-prompt：survives 没有会话（409 no-session）", async function () {
  const draft = makeDraft();
  const controller = fakeController({ items: [] });
  const res = fakeRes();
  await routeWith({ getController: function () { return controller; } }, "/post-draft/send-prompt")
    .handler(fakeReq("POST", "/post-draft/send-prompt", { id: draft.id, requestId: "req-none" }), res);
  assert.equal(res.state.status, 409);
  assert.equal(JSON.parse(res.state.body).error, "no-session");
  assert.equal(controller.calls.length, 0);
});

test("target：返回最近活动会话，过滤子代理", async function () {
  const controller = fakeController({ items: [
    { sessionId: "sub-1", origin: "subagent", updatedAt: 9 },
    { sessionId: "sess-9", cwd: "/w", running: true, updatedAt: 5 }
  ] });
  const res = fakeRes();
  await routeWith({ getController: function () { return controller; } }, "/post-draft/target")
    .handler(fakeReq("GET", "/post-draft/target"), res);
  assert.equal(res.state.status, 200);
  const payload = JSON.parse(res.state.body);
  assert.equal(payload.session.sessionId, "sess-9");
  assert.equal(payload.session.running, true);
  assert.equal(payload.session.short, "sess-9");
  assert.equal(payload.source, "recent");
});

// ---------- 缺 draftId 必须是 400，不是 500 ----------

test("GET /post-draft/draft 缺 id → 400 + 可读错误（不是 500）", async function () {
  const res = fakeRes();
  await route("/post-draft/draft").handler(fakeReq("GET", "/post-draft/draft"), res);
  assert.equal(res.state.status, 400, res.state.body);
  const payload = JSON.parse(res.state.body);
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "missing-id");
  assert.match(payload.message, /draftId/);
});

test("POST /post-draft/draft 缺 id → 400（不是 500，也不是 'bad draft id' 抛错）", async function () {
  const res = fakeRes();
  await route("/post-draft/draft").handler(fakeReq("POST", "/post-draft/draft", { en: "x", zh: "y" }), res);
  assert.equal(res.state.status, 400, res.state.body);
  assert.equal(JSON.parse(res.state.body).error, "missing-id");
});

test("不存在的 id → 404，且不是 500", async function () {
  const getRes = fakeRes();
  await route("/post-draft/draft").handler(fakeReq("GET", "/post-draft/draft?id=nope-123"), getRes);
  assert.equal(getRes.state.status, 404);
  assert.equal(JSON.parse(getRes.state.body).error, "draft-not-found");

  const putRes = fakeRes();
  await route("/post-draft/draft").handler(fakeReq("POST", "/post-draft/draft", { id: "nope-123", en: "x", zh: "y" }), putRes);
  assert.equal(putRes.state.status, 404);
  assert.equal(JSON.parse(putRes.state.body).error, "draft-not-found");
});

test("rewrite-prompt 缺 id → 400", async function () {
  const res = fakeRes();
  await route("/post-draft/rewrite-prompt").handler(fakeReq("GET", "/post-draft/rewrite-prompt"), res);
  assert.equal(res.state.status, 400);
  assert.equal(JSON.parse(res.state.body).error, "missing-id");
});

test("send-prompt 缺 id → 400（不是 502 的 store 抛错）", async function () {
  const res = fakeRes();
  await route("/post-draft/send-prompt").handler(fakeReq("POST", "/post-draft/send-prompt", { tone: "neutral" }), res);
  assert.equal(res.state.status, 400, res.state.body);
  assert.equal(JSON.parse(res.state.body).error, "missing-id");
});
