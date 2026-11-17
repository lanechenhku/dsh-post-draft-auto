import test from "node:test";
import assert from "node:assert/strict";
import {
  extractTraceables, validateTraceable, findPending, pending, checkVoice, makeFact
} from "../lib/facts.mjs";

test("抽 token：版本号 / 日期 / 百分数", function () {
  const t = extractTraceables("v1.1.0, 2.22.1, 2026-10-05, 30%, 0.2.2-rc.4");
  assert.ok(t.indexOf("1.1.0") !== -1);
  assert.ok(t.indexOf("2.22.1") !== -1);
  assert.ok(t.indexOf("2026-10-05") !== -1);
  assert.ok(t.indexOf("30%") !== -1);
  assert.ok(t.indexOf("0.2.2-rc.4") !== -1);
});

test("溯源：查不到的数字会被拦下", function () {
  const facts = [makeFact({ kind: "version", value: "1.1.0", sourceUrl: "user://x" })];
  const r = validateTraceable("Acme v1.1.0 is out, 30% faster", facts);
  assert.equal(r.ok, false);
  assert.ok(r.missing.indexOf("30%") !== -1);
});

test("溯源：来源里有的数字全部通过", function () {
  const facts = [
    makeFact({ kind: "version", value: "1.0.1", sourceUrl: "https://github.com/x/y" }),
    makeFact({ kind: "date", value: "2026-10-05", sourceUrl: "https://github.com/x/y" })
  ];
  const r = validateTraceable("Acme v1.0.1 is out (released 2026-10-05).", facts);
  assert.equal(r.ok, true, JSON.stringify(r.missing));
});

test("占位符：写入与读取", function () {
  const body = "Acme v1.1.0 is out.\n\n· " + pending("变更要点");
  const found = findPending(body);
  assert.deepEqual(found, ["变更要点"]);
});

test("语气：禁用词 / hashtag / emoji 上限", function () {
  const v = checkVoice("We are excited to announce this revolutionary thing #a #b #c", {
    banned: ["excited to announce", "revolutionary"], maxHashtags: 2, maxEmoji: 0
  });
  assert.equal(v.ok, false);
  assert.ok(v.violations.some(function (x) { return x.kind === "banned_phrase"; }));
  assert.ok(v.violations.some(function (x) { return x.kind === "too_many_hashtags"; }));
});
