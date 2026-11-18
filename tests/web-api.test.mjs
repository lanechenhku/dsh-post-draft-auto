import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "xdd-webapi-"));
process.env.XDD_DATA_DIR = TMP;

const store = await import("../lib/store.mjs");
const { routes } = await import("../lib/web-api.mjs");

const config = {
  limits: { tweet: 280 },
  brand: { name: "Acme", product: "DSH", color: "#0f766e", accent: "#14b8a6", footer: "x" },
  voice: { banned: [], maxHashtags: 3, maxEmoji: 5 },
  sources: {}
};

function makeDraft(overrides) {
  const candidate = Object.assign({
    sourceKey: "paper:test:web-api",
    source: { kind: "paper", label: "test", url: "https://example.org/p", version: "v1" },
    title: "A paper title",
    facts: [{ id: "f1", kind: "title", value: "", detail: "A paper title", sourceUrl: "https://example.org/p" }],
    enText: "A paper title is out.\n\nhttps://example.org/p",
    zhText: "A paper title 已发布。\n\nhttps://example.org/p",
    enWeight: 42,
    zhWeight: 48,
    pending: ["待补：中文一句话"],
    blockers: [],
    warnings: [],
    card: { title: "T", subtitle: "", version: "v1", bullets: [], brand: config.brand },
    generatedBy: "model",
    reference: null,
    guard: null
  }, overrides || {});
  return store.createDraft(candidate, config, { force: true });
}

function fakeRes() {
  const state = { status: 0, headers: {}, body: "" };
  return {
    state,
    writeHead(status, headers) { state.status = status; state.headers = headers || {}; },
    end(body) { state.body = body === undefined ? "" : String(body); }
  };
}

function findRoute(p) {
  const route = routes().find((r) => r.path === p);
  assert.ok(route, "route exists: " + p);
  return route;
}

test("GET /post-draft/list 返回轻量列表（不含正文、排除 discarded）", async function () {
  const a = makeDraft();
  makeDraft({ sourceKey: "paper:test:web-api-2", title: "Discarded one", enText: "x", zhText: "y", status: undefined });
  const second = store.listDrafts().find((d) => d.title === "Discarded one");
  if (second) store.setStatus(second.id, "discarded");
  const res = fakeRes();
  await findRoute("/post-draft/list").handler({ method: "GET", url: "/post-draft/list" }, res);
  assert.equal(res.state.status, 200);
  const payload = JSON.parse(res.state.body);
  assert.equal(payload.ok, true);
  const row = payload.drafts.find((d) => d.id === a.draft.id);
  assert.ok(row, "新草稿在列表里");
  assert.equal(row.generatedBy, "model");
  assert.equal(row.enWeight, 42);
  assert.deepEqual(row.pending, ["待补：中文一句话"]);
  assert.equal(row.pendingCount, 1, "列表行带 pendingCount");
  assert.equal(row.blockerCount, 0);
  assert.deepEqual(row.blockers, []);
  assert.equal(row.enText, undefined, "列表不返回正文");
  assert.ok(!payload.drafts.some((d) => d.status === "discarded"), "丢弃的不出现");
});

test("GET /post-draft/copy 返回纯文本（无 markdown 符号）", async function () {
  const a = store.listDrafts().find((d) => d.sourceKey === "paper:test:web-api");
  const res = fakeRes();
  await findRoute("/post-draft/copy").handler({ method: "GET", url: "/post-draft/copy?id=" + a.id + "&part=en" }, res);
  assert.equal(res.state.status, 200);
  assert.equal(res.state.headers["content-type"], "text/plain; charset=utf-8");
  assert.ok(res.state.body.indexOf("A paper title is out.") !== -1);
  assert.equal(res.state.body.indexOf("**"), -1);
  assert.equal(res.state.body.indexOf("]("), -1);
});

test("GET /post-draft/copy 遇到 guard 返回 409，不返回正文", async function () {
  const g = makeDraft({
    sourceKey: "site:test:v1.2.4",
    title: "Acme v1.2.4",
    enText: "Acme v1.2.4 is out.",
    guard: { kind: "pending-rollout", online: "v1.2.3", local: "v1.2.4", message: "部署还没到线上" }
  });
  const res = fakeRes();
  await findRoute("/post-draft/copy").handler({ method: "GET", url: "/post-draft/copy?id=" + g.draft.id + "&part=en" }, res);
  assert.equal(res.state.status, 409);
  const payload = JSON.parse(res.state.body);
  assert.equal(payload.error, "guard");
  assert.equal(payload.guard.kind, "pending-rollout");
});

test("POST /post-draft/mark-posted 写台账；guard 的草稿被拒", async function () {
  const a = store.listDrafts().find((d) => d.sourceKey === "paper:test:web-api");
  const before = store.readPosted().length;
  const body = JSON.stringify({ id: a.id });
  const req = { method: "POST", url: "/post-draft/mark-posted", on(evt, cb) { if (evt === "data") cb(Buffer.from(body)); if (evt === "end") cb(); } };
  const res = fakeRes();
  await findRoute("/post-draft/mark-posted").handler(req, res);
  assert.equal(res.state.status, 200);
  assert.equal(JSON.parse(res.state.body).status, "published");
  assert.equal(store.readPosted().length, before + 1);

  const g = store.listDrafts().find((d) => d.sourceKey === "site:test:v1.2.4");
  const greq = { method: "POST", url: "/post-draft/mark-posted", on(evt, cb) { if (evt === "data") cb(Buffer.from(JSON.stringify({ id: g.id }))); if (evt === "end") cb(); } };
  const gres = fakeRes();
  await findRoute("/post-draft/mark-posted").handler(greq, gres);
  assert.equal(gres.state.status, 409);
  assert.equal(JSON.parse(gres.state.body).error, "guard");
});

test("copy 缺 id 返回 404", async function () {
  const res = fakeRes();
  await findRoute("/post-draft/copy").handler({ method: "GET", url: "/post-draft/copy?id=nope&part=en" }, res);
  assert.equal(res.state.status, 404);
});