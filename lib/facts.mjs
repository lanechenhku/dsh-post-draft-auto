// lib/facts.mjs —— 事实与防编造
// 原则：正文里出现的每个版本号/日期/百分数，都必须能在 facts 里找到来源；找不到就拦下来。
// 抽不到的信息一律留 ⟨待补：...⟩ 占位符，绝不自动补一句听起来合理的话。

export const PENDING_OPEN = "⟨待补：";
export const PENDING_CLOSE = "⟩";

export function pending(label) {
  return PENDING_OPEN + label + PENDING_CLOSE;
}

const PENDING_RE = /⟨待补：([^⟩]+)⟩/g;

export function findPending(text) {
  const out = [];
  const s = String(text || "");
  let m;
  PENDING_RE.lastIndex = 0;
  while ((m = PENDING_RE.exec(s)) !== null) out.push(m[1]);
  return out;
}

const VERSION_RE = /(?<![\w.-])[vV]?\d+\.\d+(?:\.\d+)*(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?/g;
const DATE_RE = /(?<![\d-])\d{4}-\d{2}-\d{2}(?![\d-])/g;
const PERCENT_RE = /\d+(?:\.\d+)?%/g;

// 从一段文本里抽出"需要溯源"的 token
export function extractTraceables(text) {
  const s = String(text || "");
  const out = [];
  const seen = new Set();
  const push = function (raw) {
    const v = raw.replace(/^[vV]/, "");
    if (seen.has(v)) return;
    seen.add(v);
    out.push(v);
  };
  let m;
  VERSION_RE.lastIndex = 0;
  while ((m = VERSION_RE.exec(s)) !== null) push(m[0]);
  DATE_RE.lastIndex = 0;
  while ((m = DATE_RE.exec(s)) !== null) push(m[0]);
  PERCENT_RE.lastIndex = 0;
  while ((m = PERCENT_RE.exec(s)) !== null) push(m[0]);
  return out;
}

function factHaystack(facts) {
  const parts = [];
  (facts || []).forEach(function (f) {
    if (!f) return;
    parts.push(String(f.value || ""));
    parts.push(String(f.detail || ""));
    parts.push(String(f.sourceText || ""));
  });
  return parts.join(" \u0001 ").replace(/[vV](?=\d)/g, "");
}

// 返回 { ok, missing }；missing 里是找不到来源的 token
export function validateTraceable(text, facts) {
  const hay = factHaystack(facts).toLowerCase();
  const missing = [];
  extractTraceables(text).forEach(function (tok) {
    if (hay.indexOf(tok.toLowerCase()) === -1) missing.push(tok);
  });
  return { ok: missing.length === 0, missing: missing };
}

const DEFAULT_BANNED = [
  "excited to announce", "game-changer", "revolutionary", "颠覆", "史上最强", "震撼发布", "重磅"
];
const HASHTAG_RE = /(^|\s)#[\p{L}\p{N}_]+/gu;
const EMOJI_RE = /\p{Extended_Pictographic}/gu;

export function checkVoice(text, voice) {
  const s = String(text || "");
  const cfg = voice || {};
  const banned = Array.isArray(cfg.banned) && cfg.banned.length ? cfg.banned : DEFAULT_BANNED;
  const violations = [];
  banned.forEach(function (w) {
    if (!w) return;
    if (s.toLowerCase().indexOf(String(w).toLowerCase()) !== -1) {
      violations.push({ kind: "banned_phrase", detail: w });
    }
  });
  const tags = s.match(HASHTAG_RE) || [];
  const maxTags = typeof cfg.maxHashtags === "number" ? cfg.maxHashtags : 2;
  if (tags.length > maxTags) violations.push({ kind: "too_many_hashtags", detail: tags.length + " > " + maxTags });
  const emojis = s.match(EMOJI_RE) || [];
  const maxEmoji = typeof cfg.maxEmoji === "number" ? cfg.maxEmoji : 3;
  if (emojis.length > maxEmoji) violations.push({ kind: "too_many_emoji", detail: emojis.length + " > " + maxEmoji });
  return { ok: violations.length === 0, violations: violations };
}

// 一条事实：value 是"可被引用"的原子，detail 是可写进正文的说明，sourceUrl 必须能点开
export function makeFact(input) {
  const f = input || {};
  if (!f.value && !f.detail) throw new Error("fact needs value or detail");
  return {
    id: f.id || "",
    kind: f.kind || "other",
    value: String(f.value === undefined ? "" : f.value),
    detail: String(f.detail === undefined ? "" : f.detail),
    sourceUrl: f.sourceUrl || "",
    sourceType: f.sourceType || "unknown",
    sourceText: f.sourceText || "",
    verified: f.verified === true
  };
}
