import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const { STRINGS, LANGS, DEFAULT_LANG, t } = await import("../lib/i18n.mjs");
const CLIENT = fileURLToPath(new URL("../lib/client.js", import.meta.url));

function loadClientInternals() {
  const source = fs.readFileSync(CLIENT, "utf8");
  let def = null;
  globalThis.window = { __ModuleLoader__: { load(d) { def = d; } } };
  try {
    (0, eval)(source);
  } finally {
    delete globalThis.window;
  }
  assert.ok(def, "client.js 必须调用 __ModuleLoader__.load");
  return def.factory(function () {
    return { createElement() { return {}; }, useState(v) { return [v, function () {}]; }, useEffect() {}, useCallback(fn) { return fn; } };
  }).__internals;
}

test("i18n：zh / en 的 key 集合完全一致，且没有空值", function () {
  const zh = Object.keys(STRINGS.zh).sort();
  const en = Object.keys(STRINGS.en).sort();
  assert.deepEqual(en, zh, "中英 key 必须一一对应");
  zh.forEach(function (key) {
    assert.equal(typeof STRINGS.zh[key], "string");
    assert.equal(typeof STRINGS.en[key], "string");
    assert.ok(STRINGS.zh[key].trim().length > 0, "zh 空值: " + key);
    assert.ok(STRINGS.en[key].trim().length > 0, "en 空值: " + key);
  });
  assert.deepEqual(LANGS, ["zh", "en"]);
  assert.equal(DEFAULT_LANG, "zh");
});

test("i18n：en 表里不能残留中文（除了语言切换按钮本身）", function () {
  const cjk = /[\u3400-\u9fff]/;
  Object.keys(STRINGS.en).forEach(function (key) {
    if (key === "app.lang") return; // 英文界面里那颗按钮写「中文」，是给中文用户的入口
    assert.ok(!cjk.test(STRINGS.en[key]), "en 文案仍有中文: " + key + " = " + STRINGS.en[key]);
  });
});

test("i18n：客户端内联表与 lib/i18n.mjs 完全一致（防止两份漂移）", function () {
  const internals = loadClientInternals();
  assert.deepEqual(internals.STRINGS, STRINGS);
  assert.equal(internals.translate("zh", "app.title"), STRINGS.zh["app.title"]);
  assert.equal(internals.translate("en", "app.title"), STRINGS.en["app.title"]);
});

test("i18n：占位符插值（中英都生效）", function () {
  assert.equal(t("zh", "pending.title", { n: 3 }), "待补 3 处");
  assert.equal(t("en", "pending.title", { n: 3 }), "3 to fill in");
  assert.equal(t("zh", "edit.weight", { lang: "EN", weight: 12, limit: 280 }), "EN 12/280");
  assert.equal(t("en", "arch.published", { n: 2 }), "Posted 2");
  assert.equal(t("en", "no.such.key"), "no.such.key");
});
