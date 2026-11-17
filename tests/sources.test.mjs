import test from "node:test";
import assert from "node:assert/strict";

// 用 mock fetch 跑通用适配器，不联网
const realFetch = globalThis.fetch;
function mockJson(payload) {
  globalThis.fetch = async function () {
    return {
      ok: true,
      status: 200,
      headers: { get: function () { return "application/json"; } },
      text: async function () { return JSON.stringify(payload); }
    };
  };
}
test.after(function () { globalThis.fetch = realFetch; });

const config = {
  limits: { tweet: 280 },
  brand: { name: "Acme", product: "DSH", color: "#0f766e", accent: "#14b8a6", footer: "x" },
  voice: { banned: [], maxHashtags: 3, maxEmoji: 5 }
};

const biorxivItem = {
  id: "biorxiv",
  preset: "biorxiv",
  url: "https://api.example.org/details/biorxiv/{author}",
  author: "Guolan Chen",
  authorField: "authors",
  itemsPath: "collection"
};

const payload = {
  collection: [
    {
      doi: "10.1101/2026.11.01.123456",
      title: "Retrieval-augmented risk prediction over longitudinal records",
      abstract: "We present a pipeline that keeps provenance for every extracted lab value.",
      date: "2026-11-01",
      authors: "Lane Guolan Chen; Someone Else",
      url: "https://www.biorxiv.org/content/10.1101/2026.11.01.123456v1"
    },
    {
      doi: "10.1101/2026.10.01.999999",
      title: "A different paper",
      abstract: "Not ours.",
      date: "2026-10-01",
      authors: "Other Person",
      url: "https://www.biorxiv.org/content/10.1101/2026.10.01.999999v1"
    }
  ]
};

test("json-api：按作者过滤 + 字段映射（bioRxiv 形状）", async function () {
  mockJson(payload);
  const { jsonApiCandidate } = await import("../lib/sources.mjs");
  const cand = await jsonApiCandidate(biorxivItem, config);
  assert.ok(cand, "应命中一条");
  assert.equal(cand.sourceKey, "paper:biorxiv:10.1101/2026.11.01.123456");
  assert.ok(cand.enText.indexOf("New preprint") !== -1);
  assert.ok(cand.enText.indexOf("bioRxiv:10.1101/2026.11.01.123456") !== -1);
  assert.equal(cand.facts.filter(function (f) { return f.kind === "authors"; }).length, 1);
});

test("json-api：作者的「姓, 名」与「名 姓」也能匹配（contains 归一化）", async function () {
  mockJson({ collection: [{ doi: "10.1/x", title: "T", abstract: "S", date: "2026-11-02", authors: "Chen, Lane Guolan", url: "https://x/y" }] });
  const { jsonApiCandidate } = await import("../lib/sources.mjs");
  const cand = await jsonApiCandidate(Object.assign({}, biorxivItem, { author: "Lane Guolan Chen" }), config);
  assert.ok(cand, "应命中");
});

test("json-api：作者没填（占位符）→ 跳过并给出「待补 author」", async function () {
  const { jsonApiCandidate } = await import("../lib/sources.mjs");
  await assert.rejects(
    function () { return jsonApiCandidate(Object.assign({}, biorxivItem, { author: "<你的英文署名>" }), config); },
    function (e) { return e.name === "SkipSource" && e.code === "AUTHOR_MISSING"; }
  );
});

test("json-api：端点没填 → 跳过并说明等端点", async function () {
  const { jsonApiCandidate } = await import("../lib/sources.mjs");
  await assert.rejects(
    function () { return jsonApiCandidate(Object.assign({}, biorxivItem, { url: "" }), config); },
    function (e) { return e.name === "SkipSource" && e.code === "URL_MISSING"; }
  );
});

test("json-api：作者不在返回里 → 返回 null（不出稿）", async function () {
  mockJson({ collection: [{ doi: "10.1/y", title: "T", abstract: "S", date: "2026-11-03", authors: "Nobody Here", url: "https://x/z" }] });
  const { jsonApiCandidate } = await import("../lib/sources.mjs");
  const cand = await jsonApiCandidate(biorxivItem, config);
  assert.equal(cand, null);
});

test("json-api：medRxiv 用同一适配器，只换 preset", async function () {
  mockJson({ collection: [{ doi: "10.1101/2026.11.05.555555", title: "Med paper", abstract: "S", date: "2026-11-05", authors: "Lane Guolan Chen", url: "https://www.medrxiv.org/content/x" }] });
  const { jsonApiCandidate } = await import("../lib/sources.mjs");
  const cand = await jsonApiCandidate({ id: "medrxiv", preset: "medrxiv", url: "https://api.example.org/details/medrxiv", author: "Lane Guolan Chen" }, config);
  assert.ok(cand);
  assert.equal(cand.sourceKey, "paper:medrxiv:10.1101/2026.11.05.555555");
  assert.equal(cand.source.label.indexOf("medRxiv"), 0);
});
