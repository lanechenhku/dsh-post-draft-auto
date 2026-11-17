import test from "node:test";
import assert from "node:assert/strict";
import {
  weightedLength, truncateToWeight, splitToTweets, stripMarkdown, weighTweet, charWeight
} from "../lib/weight.mjs";

test("计权：基本拉丁 1 个 = 1", function () {
  assert.equal(weightedLength("Hello world"), 11);
  assert.equal(weightedLength("v0.2.2-rc.4"), 11);
});

test("计权：CJK 每个 = 2（没有 Premium 时中文 140 字就到顶）", function () {
  assert.equal(weightedLength("中文"), 4);
  assert.equal(weightedLength("已发布。"), 8);
  assert.equal(weightedLength("中".repeat(140)), 280);
  assert.equal(weightedLength("中".repeat(141)), 282);
});

test("计权：中英混排按段相加", function () {
  assert.equal(weightedLength("Hi 中文"), 7); // 3 + 4
});

test("计权：URL 固定 23，不按真实长度", function () {
  assert.equal(weightedLength("https://example.com"), 23);
  assert.equal(weightedLength("see https://example.com for more"), 36); // 4 + 23 + 9
  // 超长 URL 也是 23
  const long = "https://example.com/zh-cn/some/very/long/path?with=query&and=more";
  assert.equal(weightedLength(long), 23);
});

test("计权：emoji 每个 code point = 2", function () {
  assert.equal(weightedLength("🚀"), 2);
  assert.equal(weightedLength("a🚀b"), 1 + 2 + 1);
  assert.equal(charWeight(0x1f680), 2);
});

test("截断：正好 280，且以省略号收尾", function () {
  const t = "中".repeat(200); // 400 计权
  const cut = truncateToWeight(t, 280);
  assert.equal(weightedLength(cut), 280);
  assert.ok(cut.endsWith("…"));
});

test("截断：URL 视为原子，不会被切成半截", function () {
  const text = "中".repeat(150) + " https://example.com/zh-cn/x";
  const cut = truncateToWeight(text, 280);
  assert.ok(weightedLength(cut) <= 280);
  if (cut.indexOf("http") !== -1) {
    assert.ok(cut.indexOf("https://example.com/zh-cn/x") !== -1, "要么整条 URL 都在，要么完全没有");
  }
});

test("切分：每条都 <= 280 计权", function () {
  const sentence = "A long sentence about release notes and migration. ";
  const parts = splitToTweets(sentence.repeat(20), 280);
  assert.ok(parts.length >= 3, "长文本应切成多条");
  parts.forEach(function (p) { assert.ok(weightedLength(p) <= 280, "超出：" + p); });
  assert.ok(parts.join(" ").indexOf("release notes") !== -1);
});

test("切分：短文本不切", function () {
  const parts = splitToTweets("short text", 280);
  assert.deepEqual(parts, ["short text"]);
});

test("去 markdown：复制出来的正文不含 ** / 反引号 / 链接语法", function () {
  const src = "**bold** and `code` and [label](https://example.com) plus #tag";
  const out = stripMarkdown(src);
  assert.ok(out.indexOf("**") === -1);
  assert.ok(out.indexOf("`") === -1);
  assert.ok(out.indexOf("](") === -1);
  assert.ok(out.indexOf("bold") !== -1);
  assert.ok(out.indexOf("https://example.com") !== -1);
});

test("weighTweet：超过上限时 over=true", function () {
  const r = weighTweet("中".repeat(200), 280);
  assert.equal(r.over, true);
  assert.equal(r.remaining < 0, true);
});
