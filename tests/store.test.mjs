import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// 必须在 import store 之前设好，否则会写到真实 drafts/
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "xdd-store-"));
process.env.XDD_DATA_DIR = TMP;

const store = await import("../lib/store.mjs");
const compose = await import("../lib/compose.mjs");

const config = {
  limits: { tweet: 280 },
  brand: { name: "Acme", product: "DeepSeek Harness", color: "#0f766e", accent: "#14b8a6", footer: "example.com" },
  voice: { banned: [], maxHashtags: 3, maxEmoji: 5 },
  sources: {}
};

function ghCandidate(tag) {
  return compose.finalizeDraft(compose.composeGithubRelease({
    repo: "o/r",
    tag: tag,
    body: "- fix the broken hash routing\n- add dark theme toggle",
    publishedAt: "2026-01-02T00:00:00Z",
    url: "https://github.com/o/r/releases/tag/" + tag
  }, config), config);
}

test("同一个 source_key 只出一份草稿（幂等）", function () {
  const cand = ghCandidate("v1.2.3");
  const a = store.createDraft(cand, config, {});
  assert.equal(a.created, true);
  const b = store.createDraft(cand, config, {});
  assert.equal(b.created, false);
  assert.equal(b.draft.id, a.draft.id);
  assert.equal(store.listDrafts().length, 1);
});

test("published 后再次 createDraft 不会重复出稿", function () {
  const d = store.findBySourceKey("github:o/r@v1.2.3");
  assert.ok(d);
  const r = store.setStatus(d.id, "published");
  assert.equal(r.ok, true);
  const again = store.createDraft(ghCandidate("v1.2.3"), config, {});
  assert.equal(again.created, false);
  assert.equal(again.draft.status, "published");
});

test("published 写台账，且只写一次", function () {
  const posted = store.readPosted();
  assert.equal(posted.length, 1, "台账应只有 1 条");
  assert.equal(posted[0].sourceKey, "github:o/r@v1.2.3");
  assert.ok(posted[0].textHash);
  const d = store.findBySourceKey("github:o/r@v1.2.3");
  store.setStatus(d.id, "published");
  assert.equal(store.readPosted().length, 1, "重复置 published 不应再写台账");
});

test("状态机：published 是终态，不能再丢弃", function () {
  const d = store.findBySourceKey("github:o/r@v1.2.3");
  const r = store.setStatus(d.id, "discarded");
  assert.equal(r.ok, false);
  assert.equal(r.code, "bad_transition");
});

test("状态机：discarded 也是终态，且不再自动出稿", function () {
  const cand = ghCandidate("v2.0.0");
  const a = store.createDraft(cand, config, {});
  assert.equal(a.created, true);
  assert.equal(store.setStatus(a.draft.id, "discarded").ok, true);
  const again = store.createDraft(ghCandidate("v2.0.0"), config, {});
  assert.equal(again.created, false);
});

test("编辑后重算计权（不超 280）", function () {
  const cand = ghCandidate("v3.0.0");
  const a = store.createDraft(cand, config, {});
  const d = store.getDraft(a.draft.id);
  assert.ok(d.enWeight <= 280);
  assert.ok(d.zhWeight <= 280);
});
test("guard 变化会刷新草稿并把历史记下来", function () {
  const cand = ghCandidate("v4.0.0");
  cand.guard = { kind: "pending-rollout", online: "v3.9.0", local: "v4.0.0", message: "x" };
  const a = store.createDraft(cand, config, {});
  assert.equal(a.draft.guard.kind, "pending-rollout");
  const d = store.getDraft(a.draft.id);
  const cleared = Object.assign({}, cand, { guard: null });
  store.applyRegen(d, cleared, false);
  const after = store.getDraft(a.draft.id);
  assert.equal(after.guard, null);
  assert.ok(after.history.some(function (h) { return h.event === "guard-changed"; }));
});
