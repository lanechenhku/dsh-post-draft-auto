import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const realFetch = globalThis.fetch;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "xdd-pair-"));
const localFile = path.join(TMP, "version.json");
const releasesFile = path.join(TMP, "releases.md");

function mockOnline(version) {
  globalThis.fetch = async function () {
    return {
      ok: true,
      status: 200,
      headers: { get: function () { return "application/json"; } },
      text: async function () { return JSON.stringify({ version: version, build: "b-2026-11-04" }); }
    };
  };
}

test.after(function () { globalThis.fetch = realFetch; });

const config = {
  limits: { tweet: 280 },
  brand: { name: "Acme", product: "DSH", color: "#0f766e", accent: "#14b8a6", footer: "x" },
  voice: { banned: [], maxHashtags: 3, maxEmoji: 5 }
};

function item(extra) {
  return Object.assign({
    id: "product",
    label: "Acme",
    url: "https://example.org/version.json",
    versionKey: "version",
    local: { file: localFile, versionKey: "version" },
    releaseNotesFiles: [releasesFile],
    link: "https://example.org/zh-cn"
  }, extra || {});
}

test("双源相等 → guard=null，且能用 releases.md 的功能点", async function () {
  fs.writeFileSync(localFile, JSON.stringify({ version: "v1.2.3" }));
  fs.writeFileSync(releasesFile, "# notes\n\n## v1.2.3 — 钱包按币种分账\n_2026-11-16_\n\n- 钱包按地区/币种分账\n- 面额按币种给\n");
  mockOnline("v1.2.3");
  const { siteCandidate } = await import("../lib/sources.mjs");
  const cand = await siteCandidate(item(), config);
  assert.equal(cand.guard, null);
  assert.ok(cand.enText.indexOf("钱包按地区/币种分账") !== -1);
  assert.equal(cand.pending.length, 0);
  assert.equal(cand.sourceKey, "site:product:v1.2.3");
});

test("本地已 bump、线上还是旧值 → pending-rollout", async function () {
  fs.writeFileSync(localFile, JSON.stringify({ version: "v1.2.4" }));
  fs.writeFileSync(releasesFile, "## v1.2.4 — 新东西\n\n- 要点 A\n");
  mockOnline("v1.2.3");
  const { siteCandidate } = await import("../lib/sources.mjs");
  const cand = await siteCandidate(item(), config);
  assert.equal(cand.guard.kind, "pending-rollout");
  assert.equal(cand.guard.online, "v1.2.3");
  assert.equal(cand.guard.local, "v1.2.4");
  assert.ok(cand.guard.message.indexOf("部署还没到线上") !== -1);
  assert.equal(cand.sourceKey, "site:product:v1.2.4");
});

test("线上比本地新 → 报警（online-newer）", async function () {
  fs.writeFileSync(localFile, JSON.stringify({ version: "v1.2.3" }));
  mockOnline("v1.2.5");
  const { siteCandidate } = await import("../lib/sources.mjs");
  const cand = await siteCandidate(item(), config);
  assert.equal(cand.guard.kind, "online-newer");
  assert.ok(cand.guard.message.indexOf("查错了仓库或分支") !== -1);
});

test("本地文件读不到 → local-missing（同样不允许发）", async function () {
  fs.rmSync(localFile, { force: true });
  mockOnline("v1.2.3");
  const { siteCandidate } = await import("../lib/sources.mjs");
  const cand = await siteCandidate(item(), config);
  assert.equal(cand.guard.kind, "local-missing");
});

test("releases.md 没有这一版 → 功能点待补（不编）", async function () {
  fs.writeFileSync(localFile, JSON.stringify({ version: "v1.2.6" }));
  fs.writeFileSync(releasesFile, "## v1.2.3 — 旧版\n\n- 旧要点\n");
  mockOnline("v1.2.6");
  const { siteCandidate } = await import("../lib/sources.mjs");
  const cand = await siteCandidate(item(), config);
  assert.equal(cand.guard, null);
  assert.ok(cand.enText.indexOf("⟨待补：功能点待补⟩") !== -1);
  assert.ok(cand.pending.some(function (p) { return p.indexOf("功能点待补") !== -1; }));
});

test("版本比较：v1.2.4 > v1.2.3，v1.2.3 == v1.2.3", async function () {
  const { compareVersions } = await import("../lib/release-notes.mjs");
  assert.equal(compareVersions("v1.2.4", "v1.2.3"), 1);
  assert.equal(compareVersions("v1.2.3", "v1.2.3"), 0);
  assert.equal(compareVersions("v1.2.2", "v1.2.3"), -1);
});
