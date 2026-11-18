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
const { routes } = await import("../lib/web-api.mjs");

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
