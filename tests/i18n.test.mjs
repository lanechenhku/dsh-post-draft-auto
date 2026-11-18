import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
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
    if (key === "app.lang" || key === "settings.lang.zh") return; // 语言自名：英文界面里也写「中文」
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
// ---------- 网页工作台：同一份词表 ----------

function loadWorkbenchTable() {
  const source = fs.readFileSync(fileURLToPath(new URL("../public/app.js", import.meta.url)), "utf8");
  const start = source.indexOf("var STRINGS = ");
  const end = source.indexOf(";\n  var LANG_KEY", start);
  assert.ok(start >= 0 && end > start, "public/app.js 里必须有内联的 STRINGS 表");
  return JSON.parse(source.slice(start + "var STRINGS = ".length, end));
}

test("工作台：内联文案表与 lib/i18n.mjs 同源（键与值都一致）", function () {
  const wb = loadWorkbenchTable();
  assert.deepEqual(wb, JSON.parse(JSON.stringify(STRINGS)));
});

test("工作台：状态、筛选、按钮等键都存在（不是只抄了子集）", function () {
  const wb = loadWorkbenchTable();
  const needed = [
    "wb.title", "wb.tagline", "wb.collect", "wb.collecting", "wb.refresh",
    "wb.filter.all", "wb.filter.drafted", "wb.filter.copied", "wb.filter.published", "wb.filter.discarded",
    "wb.manualPlaceholder", "wb.manualSubmit", "wb.sourcesSummary", "wb.listEmpty",
    "wb.ai", "wb.template", "wb.pendingCount", "wb.blockerCount",
    "wb.guard.pendingRollout", "wb.guard.onlineNewer", "wb.guard.localMissing", "wb.guard.unparsable",
    "wb.stats", "wb.sourceOn", "wb.sourceOff", "wb.lastScan",
    "wb.emptyTitle", "wb.emptyBody", "wb.remaining", "wb.over",
    "wb.label.en", "wb.label.zh", "wb.copyN", "wb.referenceTitle", "wb.openSource", "wb.copyOne",
    "wb.copyLineTitle", "wb.referenceNote", "wb.factsTitle", "wb.factsNote", "wb.sourceCol",
    "wb.cardTitle", "wb.cardAlt", "wb.notRendered", "wb.noImage", "wb.download", "wb.rerender",
    "wb.history", "wb.created", "wb.save", "wb.markCopied", "wb.publish", "wb.discard",
    "wb.toast.refCopied", "wb.toast.copyFailed", "wb.toast.copiedN", "wb.toast.guard",
    "wb.toast.saved", "wb.toast.saveFailed", "wb.toast.statusSet", "wb.toast.actionFailed",
    "wb.confirm.publish", "wb.toast.posted", "wb.confirm.discard", "wb.toast.rendered",
    "wb.toast.collect", "wb.toast.collectSkipped", "wb.toast.manualCreated",
    "wb.toast.refreshed", "wb.toast.loadFailed"
  ];
  needed.forEach(function (key) {
    assert.equal(typeof wb.zh[key], "string", "缺 zh: " + key);
    assert.equal(typeof wb.en[key], "string", "缺 en: " + key);
  });
});

test("工作台：切到 en 后没有中文文案（语言按钮自名例外）", function () {
  const wb = loadWorkbenchTable();
  const cjk = /[\u3400-\u9fff]/;
  Object.keys(wb.en).forEach(function (key) {
    if (key === "app.lang" || key === "settings.lang.zh") return;
    assert.ok(!cjk.test(wb.en[key]), "工作台 en 文案仍有中文: " + key);
  });
});

test("工作台：与侧栏共享同一个 localStorage 键", function () {
  const source = fs.readFileSync(fileURLToPath(new URL("../public/app.js", import.meta.url)), "utf8");
  assert.ok(source.indexOf('var LANG_KEY = "postDraft.lang"') !== -1, "必须复用 postDraft.lang");
  assert.ok(source.indexOf("localStorage.setItem(LANG_KEY") !== -1, "切换语言要写回 localStorage");
});