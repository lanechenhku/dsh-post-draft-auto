import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "xdd-bio-"));
process.env.XDD_DATA_DIR = TMP;

const realFetch = globalThis.fetch;
const record = {
  title: "LRCQ: phenome-wide heritability enrichment of genomic loci from GWAS summary statistics",
  authors: "Chen, L. G.; Sham, P. C.",
  author_corresponding: "Lane Guolan Chen",
  author_corresponding_institution: "The University of Hong Kong",
  doi: "10.64898/2026.11.02.763731",
  date: "2026-11-04",
  version: "1",
  category: "genetics",
  abstract: "We present LRCQ. It found 70 omni-loci at FDR 5% across 444 Pan-UK Biobank GWAS."
};

function mockBioRxiv() {
  globalThis.fetch = async function (url) {
    const u = String(url);
    const body = u.indexOf("10.64898/") !== -1
      ? { messages: [{ status: "ok" }], collection: [record] }
      : { messages: [{ status: "no posts found" }], collection: [] };
    return {
      ok: true, status: 200,
      headers: { get: function () { return "application/json"; } },
      text: async function () { return JSON.stringify(body); }
    };
  };
}

test.after(function () { globalThis.fetch = realFetch; });

const config = {
  limits: { tweet: 280 },
  authorName: "Lane Guolan Chen",
  brand: { name: "Acme", product: "DSH", color: "#0f766e", accent: "#14b8a6", footer: "x" },
  voice: { banned: [], maxHashtags: 3, maxEmoji: 5 },
  sources: {}
};

test("bioRxiv：旧前缀 10.1101 自动映射到 10.64898，并抽出署名/摘要/日期", async function () {
  mockBioRxiv();
  const { postFacts } = await import("../lib/tools.mjs");
  const r = await postFacts({ doi: "10.1101/2026.11.02.763731" }, config);
  assert.equal(r.kind, "paper");
  assert.equal(r.meta.doi, "10.64898/2026.11.02.763731");
  assert.equal(r.sourceKey, "paper:biorxiv:10.64898/2026.11.02.763731");
  assert.equal(r.title.indexOf("LRCQ"), 0);
  assert.ok(r.meta.authors.indexOf("Chen, L. G.") !== -1, "作者串要能拆开");
  assert.equal(r.meta.corresponding, "Lane Guolan Chen");
  assert.ok(r.meta.abstract.indexOf("70 omni-loci") !== -1);
  const kinds = r.facts.map(function (f) { return f.kind; });
  ["title", "doi", "date", "abstract", "author", "author-corresponding", "institution"].forEach(function (k) {
    assert.ok(kinds.indexOf(k) !== -1, "缺 fact 类型：" + k);
  });
  r.facts.forEach(function (f) { assert.ok(f.sourceUrl, "每条事实都要有 source_url：" + f.kind); });
});

test("bioRxiv：署名自动匹配（配置里的 authorName 对上通讯作者）", async function () {
  mockBioRxiv();
  const { postFacts } = await import("../lib/tools.mjs");
  const r = await postFacts({ doi: "10.64898/2026.11.02.763731" }, config);
  assert.ok(r.meta.authorInPaper.length >= 1, "应认出我自己的署名");
  assert.ok(r.meta.authorInPaper.some(function (a) { return /Guolan Chen/.test(a); }));
});

test("bioRxiv：DOI 不存在时报错，不编造", async function () {
  globalThis.fetch = async function () {
    return { ok: true, status: 200, headers: { get: function () { return "application/json"; } },
      text: async function () { return JSON.stringify({ messages: [{ status: "no posts found" }], collection: [] }); } };
  };
  const { postFacts } = await import("../lib/tools.mjs");
  await assert.rejects(function () { return postFacts({ doi: "10.1101/2026.11.02.000000" }, config); }, /没有这条 DOI/);
});
