import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "xdd-model-"));
process.env.XDD_DATA_DIR = TMP;

const store = await import("../lib/store.mjs");
const compose = await import("../lib/compose.mjs");
const { postSave, postList } = await import("../lib/tools.mjs");

const config = {
  limits: { tweet: 280 },
  brand: { name: "Acme", product: "DSH", color: "#0f766e", accent: "#14b8a6", footer: "x" },
  voice: { banned: [], maxHashtags: 3, maxEmoji: 5 },
  sources: {}
};

const facts = [
  { id: "f1", kind: "title", value: "", detail: "A paper title", sourceUrl: "https://example.org/p", sourceType: "test" },
  { id: "f2", kind: "date", value: "2026-11-04", detail: "2026-11-04", sourceUrl: "https://example.org/p", sourceType: "test" }
];

test("模型路径：模型自己写的正文原样落盘，generatedBy=model，不套模板句式", async function () {
  const en = "A paper title is out.\n\n· one real claim\n\nhttps://example.org/p";
  const zh = "A paper title 已发布。\n\nhttps://example.org/p";
  const r = await postSave({
    sourceKey: "paper:test:model-1",
    title: "A paper title",
    source: { kind: "paper", label: "test", url: "https://example.org/p", version: "v1" },
    facts: facts,
    en: en,
    zh: zh,
    card: { title: "T", subtitle: "S", version: "v1", bullets: ["b"] }
  }, config);
  assert.equal(r.ok, true);
  assert.equal(r.generatedBy, "model");
  const d = store.getDraft(r.draftId);
  assert.equal(d.generatedBy, "model");
  assert.equal(d.enText, en, "正文必须是模型写的，不能被模板改写");
  assert.ok(r.enWeight > 0 && r.enWeight <= 280);
  const list = postList({}, config);
  assert.equal(list.drafts.find(function (x) { return x.id === r.draftId; }).generatedBy, "model");
});

test("模板 fallback：没有模型写稿时仍能出稿，但标注 generatedBy=template", function () {
  const cand = compose.finalizeDraft(compose.composeNpm({
    pkg: "@deepseek-ai/dsh", version: "0.2.2-rc.4", publishedAt: "2026-11-04T00:00:00Z",
    description: "agent runtime", url: "https://www.npmjs.com/package/@deepseek-ai/dsh/v/0.2.2-rc.4"
  }, config), config);
  assert.equal(cand.generatedBy, "template");
  assert.ok(cand.enText.indexOf("is out.") !== -1, "模板句式仍在（fallback 特征）");
  const res = store.createDraft(cand, config, {});
  assert.equal(res.created, true);
  assert.equal(res.draft.generatedBy, "template");
});

test("模型路径也要过溯源闸：编一个没来源的百分数会被 blocker 拦下", async function () {
  const r = await postSave({
    sourceKey: "paper:test:model-2",
    title: "A paper title",
    source: { kind: "paper", label: "test", url: "https://example.org/p", version: "v1" },
    facts: facts,
    en: "A paper title is 87% faster.\n\nhttps://example.org/p",
    zh: "A paper title 已发布。",
    card: { title: "T" }
  }, config);
  assert.equal(r.ok, true, "可以先落盘");
  assert.equal(r.blockers.length, 1, "87% 不该被放过");
  assert.deepEqual(r.blockers[0].detail, ["87%"]);
});

test("postSave 缺 facts 直接拒绝（不许凭空写）", async function () {
  await assert.rejects(function () {
    return postSave({ en: "x", zh: "y", facts: [] }, config);
  }, /facts/);
});
