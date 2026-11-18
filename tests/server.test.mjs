import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "xdd-server-"));
process.env.XDD_DATA_DIR = TMP;

const { createServer } = await import("../lib/server.mjs");
const store = await import("../lib/store.mjs");

const config = {
  port: 0,
  limits: { tweet: 280 },
  brand: { name: "Acme", product: "DeepSeek Harness", color: "#0f766e", accent: "#14b8a6", footer: "example.com" },
  voice: { banned: ["excited to announce"], maxHashtags: 2, maxEmoji: 3 },
  sources: {
    npm: [{ id: "x", pkg: "@deepseek-ai/dsh", label: "npm", enabled: false }],
    github: [], arxiv: [], rss: [], site: []
  }
};

const server = createServer(config);
let base = "";

test.before(async function () {
  await new Promise(function (resolve) { server.listen(0, "127.0.0.1", resolve); });
  base = "http://127.0.0.1:" + server.address().port;
});

test.after(function () {
  server.close();
});

async function post(p, body) {
  const res = await fetch(base + p, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {})
  });
  return { status: res.status, data: await res.json() };
}

test("手动出稿：抽出 v1.1.0，缺的地方留占位（不编）", async function () {
  const r = await post("/api/manual", { text: "我刚发了 Acme v1.1.0 和一篇 preprint" });
  assert.equal(r.status, 200);
  assert.equal(r.data.created, true);
  const d = r.data.draft;
  assert.ok(d.enWeight <= 280 && d.zhWeight <= 280);
  assert.ok(d.pending.length >= 2, "应有待补项");
  assert.ok(d.enText.indexOf("⟨待补：") !== -1);
  assert.ok(d.facts.some(function (f) { return f.value === "1.1.0"; }));
  assert.equal(d.blockers.length, 0, "占位符不是阻断，未溯源数字才是");
});

test("复制文本干净：无 markdown 符号", async function () {
  const list = store.listDrafts();
  const d = list[0];
  const res = await fetch(base + "/api/drafts/" + d.id + "/copy?part=en");
  assert.equal(res.status, 200);
  const txt = await res.text();
  assert.ok(txt.indexOf("**") === -1);
  assert.ok(txt.indexOf("`") === -1);
  assert.ok(txt.indexOf("](") === -1);
  assert.ok(txt.length > 0);
});

test("发布闸门：有待补时 published 被 409 拦下", async function () {
  const d = store.listDrafts()[0];
  const r = await post("/api/drafts/" + d.id + "/status", { status: "published" });
  assert.equal(r.status, 409);
  assert.equal(r.data.error, "pending");
});

test("发布闸门：override 后才允许，并写台账", async function () {
  const d = store.listDrafts()[0];
  const r = await post("/api/drafts/" + d.id + "/status", { status: "published", override: true });
  assert.equal(r.status, 200);
  assert.equal(store.readPosted().length, 1);
  const st = await fetch(base + "/api/state").then(function (x) { return x.json(); });
  assert.equal(st.postedCount, 1);
  assert.equal(st.counts.published, 1);
});

test("weigh 接口与库函数一致", async function () {
  const r = await post("/api/weigh", { text: "中文" });
  assert.equal(r.status, 200);
  assert.equal(r.data.weight, 4);
});

test("collect：没有启用的源时安全返回空", async function () {
  const r = await post("/api/collect", {});
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.results));
  assert.equal(r.data.results.length, 0);
});

test("未溯源数字会变成 blocker，并拦住发布", async function () {
  const r = await post("/api/manual", { text: "我刚发了 Acme v1.2.0" });
  const id = r.data.draft.id;
  const res = await fetch(base + "/api/drafts/" + id, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enText: "Acme v1.2.0 is out, 40% faster." })
  });
  const data = await res.json();
  assert.equal(data.draft.blockers.length, 1, "40% 不该被放过");
  const pub = await post("/api/drafts/" + id + "/status", { status: "published" });
  assert.equal(pub.status, 409);
  assert.equal(pub.data.error, "blocked");
});
test("pending-rollout 守卫：复制与标已发都被 409 拦下", async function () {
  const fin = {
    sourceKey: "site:product:v1.2.4",
    source: { kind: "site", label: "Acme", url: "https://example.org", version: "v1.2.4" },
    title: "Acme v1.2.4",
    facts: [],
    enText: "Acme v1.2.4 is out.",
    zhText: "Acme v1.2.4 已发布。",
    enWeight: 22,
    zhWeight: 24,
    pending: [],
    blockers: [],
    warnings: [],
    card: { title: "Acme", subtitle: "", version: "v1.2.4", bullets: [], brand: {} },
    guard: { kind: "pending-rollout", online: "v1.2.3", local: "v1.2.4", message: "部署还没到线上" },
    reference: null
  };
  const created = store.createDraft(fin, config, {});
  const id = created.draft.id;
  const copy = await fetch(base + "/api/drafts/" + id + "/copy?part=en");
  assert.equal(copy.status, 409);
  const body = await copy.json();
  assert.equal(body.error, "guard");
  assert.equal(body.guard.kind, "pending-rollout");
  const pub = await post("/api/drafts/" + id + "/status", { status: "published", override: true });
  assert.equal(pub.status, 409);
  assert.equal(pub.data.error, "guard");
  assert.equal(store.readPosted().length, 1, "台账不应新增");
});

test("guard 解除后可以正常复制与标已发", async function () {
  const d = store.findSourceDraft("site:product:v1.2.4");
  const fin = {
    sourceKey: d.sourceKey,
    source: d.source,
    title: d.title,
    facts: [],
    enText: d.enText,
    zhText: d.zhText,
    enWeight: d.enWeight,
    zhWeight: d.zhWeight,
    pending: [],
    blockers: [],
    warnings: [],
    card: d.card,
    guard: null,
    reference: null
  };
  store.applyRegen(d, fin, false);
  const copy = await fetch(base + "/api/drafts/" + d.id + "/copy?part=en");
  assert.equal(copy.status, 200);
  const pub = await post("/api/drafts/" + d.id + "/status", { status: "published" });
  assert.equal(pub.status, 200);
  assert.equal(store.readPosted().length, 2);
});
test("GET /api/drafts 保留 generatedBy（model 不被降级成 template）", async function () {
  const modelDraft = store.createDraft({
    sourceKey: "paper:test:generated-by",
    source: { kind: "paper", label: "test", url: "https://example.org/p", version: "v1" },
    title: "A model-written draft",
    facts: [{ id: "f1", kind: "title", value: "", detail: "A model-written draft", sourceUrl: "https://example.org/p" }],
    enText: "A model-written draft.\n\nhttps://example.org/p",
    zhText: "一条模型写的草稿。\n\nhttps://example.org/p",
    enWeight: 24,
    zhWeight: 30,
    pending: ["待补：中文要点"],
    blockers: [],
    warnings: [],
    card: { title: "T", subtitle: "", version: "v1", bullets: [], brand: config.brand },
    generatedBy: "model",
    reference: null,
    guard: null
  }, config, { force: true });

  const res = await fetch(base + "/api/drafts");
  assert.equal(res.status, 200);
  const body = await res.json();
  const row = body.drafts.find(function (d) { return d.id === modelDraft.draft.id; });
  assert.ok(row, "新草稿应出现在 /api/drafts 里");
  assert.equal(row.generatedBy, "model", "生成的草稿不能被降级成 template");
  assert.equal(row.pendingCount, 1);
  assert.equal(row.blockerCount, 0);
  assert.equal(row.status, "drafted");

  // 没有 generatedBy 的历史草稿仍然按模板兜底，而不是 undefined
  const legacy = store.createDraft({
    sourceKey: "paper:test:legacy",
    source: { kind: "paper", label: "test", url: "https://example.org/q", version: "v1" },
    title: "A legacy draft",
    facts: [{ id: "f1", kind: "title", value: "", detail: "A legacy draft", sourceUrl: "https://example.org/q" }],
    enText: "A legacy draft.\n\nhttps://example.org/q",
    zhText: "旧草稿。\n\nhttps://example.org/q",
    enWeight: 20,
    zhWeight: 18,
    pending: [],
    blockers: [],
    warnings: [],
    card: { title: "T", subtitle: "", version: "v1", bullets: [], brand: config.brand },
    reference: null,
    guard: null
  }, config, { force: true });
  const legacyRow = (await (await fetch(base + "/api/drafts")).json()).drafts
    .find(function (d) { return d.id === legacy.draft.id; });
  assert.equal(legacyRow.generatedBy, "template");
});
