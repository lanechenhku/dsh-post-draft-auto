import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "xdd-cfg-"));
const localFile = path.join(TMP, "config.local.json");
process.env.XDD_CONFIG_LOCAL_FILE = localFile;

const { mergeConfig, loadConfig, CONFIG_LOCAL_FILE } = await import("../lib/store.mjs");

test("对象：深合并，只覆盖写出来的键", function () {
  const base = { a: 1, nested: { x: 1, y: 2 }, keep: "base" };
  const merged = mergeConfig(base, { nested: { y: 20 }, added: true });
  assert.equal(merged.a, 1);
  assert.equal(merged.nested.x, 1);
  assert.equal(merged.nested.y, 20);
  assert.equal(merged.keep, "base");
  assert.equal(merged.added, true);
  assert.equal(base.nested.y, 2, "不能改到原对象");
});

test("对象数组：按 index 深合并（只写要改的字段）", function () {
  const base = { sources: { site: [{ id: "p", enabled: false, note: "keep me", url: "https://example.com/v.json" }] } };
  const merged = mergeConfig(base, { sources: { site: [{ enabled: true, url: "https://real.example/v.json" }] } });
  assert.equal(merged.sources.site[0].enabled, true);
  assert.equal(merged.sources.site[0].url, "https://real.example/v.json");
  assert.equal(merged.sources.site[0].note, "keep me", "没写的字段沿用 base");
  assert.equal(merged.sources.site[0].id, "p");
});

test("原始值数组：整体替换，不逐位覆盖", function () {
  const base = { voice: { banned: ["a", "b", "c"] }, releaseNotesFiles: ["docs/releases.md"] };
  const merged = mergeConfig(base, { voice: { banned: ["only-this"] }, releaseNotesFiles: ["/tmp/x.md"] });
  assert.deepEqual(merged.voice.banned, ["only-this"]);
  assert.deepEqual(merged.releaseNotesFiles, ["/tmp/x.md"]);
});

test("$replace 哨兵：对象数组整体替换", function () {
  const base = { sources: { site: [{ id: "a", note: "old" }] } };
  const merged = mergeConfig(base, { sources: { site: { $replace: [{ id: "b" }] } } });
  assert.deepEqual(merged.sources.site, [{ id: "b" }]);
});

test("loadConfig：没有 config.local.json 时就是 config.json", function () {
  if (fs.existsSync(localFile)) fs.rmSync(localFile);
  const cfg = loadConfig();
  assert.equal(cfg.brand.name, "Your product");
  assert.equal(CONFIG_LOCAL_FILE, localFile);
});

test("loadConfig：有覆盖层时合并，且忽略 $comment 键", function () {
  fs.writeFileSync(localFile, JSON.stringify({
    "$comment": "本机私有",
    brand: { name: "LocalProduct" },
    sources: { site: [{ enabled: true, url: "https://local.example/version.json" }] }
  }));
  const cfg = loadConfig();
  assert.equal(cfg.brand.name, "LocalProduct");
  assert.equal(cfg.brand.footer, "example.com", "brand 其余字段沿用 base");
  assert.equal(cfg.sources.site[0].enabled, true);
  assert.equal(cfg.sources.site[0].url, "https://local.example/version.json");
  assert.equal(Object.prototype.hasOwnProperty.call(cfg, "$comment"), false);
});

test("loadConfig：覆盖层 JSON 坏掉时明确报错", function () {
  fs.writeFileSync(localFile, "{not json");
  assert.throws(function () { loadConfig(); }, /config\.local\.json 解析失败/);
  fs.rmSync(localFile);
});
