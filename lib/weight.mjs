// lib/weight.mjs —— X 计权字数（没有 Premium 时单推上限 280 计权字符）
// 规则：基本拉丁区 1 个计权，CJK / emoji / 其他文字 2 个计权，URL 统一算 23（t.co）。
// 注意：这不是"字符数"，中文一条 140 字就到顶了。

export const TWEET_LIMIT = 280;
export const URL_WEIGHT = 23;

// 官方 weighted length 的 1 权区间（等价 twitter-text 的 ranges）
const ONE_WEIGHT_RANGES = [
  [0x0000, 0x10ff],
  [0x2000, 0x200d],
  [0x2010, 0x201f],
  [0x2032, 0x2037]
];

export function charWeight(cp) {
  for (let i = 0; i < ONE_WEIGHT_RANGES.length; i++) {
    const r = ONE_WEIGHT_RANGES[i];
    if (cp >= r[0] && cp <= r[1]) return 1;
  }
  return 2;
}

function isUrlStart(s, i) {
  return s.startsWith("http://", i) || s.startsWith("https://", i);
}

function urlLengthAt(s, i) {
  let j = i;
  while (j < s.length) {
    const c = s[j];
    if (c === " " || c === "\n" || c === "\t" || c === "\u3000" || c === "\r") break;
    j++;
  }
  return j - i;
}

export function weightedLength(text) {
  if (text === null || text === undefined) return 0;
  const s = String(text);
  let n = 0;
  let i = 0;
  while (i < s.length) {
    if (isUrlStart(s, i)) {
      i += urlLengthAt(s, i);
      n += URL_WEIGHT;
      continue;
    }
    const cp = s.codePointAt(i);
    const ch = String.fromCodePoint(cp);
    n += charWeight(cp);
    i += ch.length;
  }
  return n;
}

export function remaining(text, limit) {
  return limit - weightedLength(text);
}

// 按计权预算截断；URL 视为原子，不会被切一半
export function truncateToWeight(text, limit, ellipsis) {
  const lim = typeof limit === "number" ? limit : TWEET_LIMIT;
  const ell = typeof ellipsis === "string" ? ellipsis : "…";
  const s = String(text || "");
  if (weightedLength(s) <= lim) return s;
  const budget = lim - weightedLength(ell);
  let out = "";
  let acc = 0;
  let i = 0;
  while (i < s.length) {
    if (isUrlStart(s, i)) {
      const len = urlLengthAt(s, i);
      if (acc + URL_WEIGHT > budget) break;
      out += s.slice(i, i + len);
      acc += URL_WEIGHT;
      i += len;
      continue;
    }
    const cp = s.codePointAt(i);
    const ch = String.fromCodePoint(cp);
    const w = charWeight(cp);
    if (acc + w > budget) break;
    out += ch;
    acc += w;
    i += ch.length;
  }
  return out.replace(/\s+$/, "") + ell;
}

function isBoundary(ch) {
  return ch === " " || ch === "\n" || ch === "。" || ch === "，" || ch === "、" ||
    ch === "." || ch === "," || ch === "!" || ch === "?" || ch === ";" || ch === "；";
}

// 找到 <= limit 的最后一个自然断点（空格/句号/换行），返回切分位置
function lastBoundaryBefore(s, limit) {
  let acc = 0;
  let i = 0;
  let best = -1;
  while (i < s.length) {
    if (isUrlStart(s, i)) {
      const len = urlLengthAt(s, i);
      if (acc + URL_WEIGHT > limit) break;
      acc += URL_WEIGHT;
      i += len;
      continue;
    }
    const cp = s.codePointAt(i);
    const ch = String.fromCodePoint(cp);
    const w = charWeight(cp);
    if (acc + w > limit) break;
    acc += w;
    i += ch.length;
    if (isBoundary(ch)) best = i;
  }
  return best > 0 ? best : i;
}

// 超长文本切成多条（thread）。每条都 <= limit
export function splitToTweets(text, limit) {
  const lim = typeof limit === "number" ? limit : TWEET_LIMIT;
  let rest = stripMarkdown(text);
  const out = [];
  let guard = 0;
  while (rest.length && guard < 50) {
    guard++;
    if (weightedLength(rest) <= lim) {
      out.push(rest.trim());
      break;
    }
    const cut = lastBoundaryBefore(rest, lim);
    const head = rest.slice(0, cut).trim();
    out.push(head);
    rest = rest.slice(cut).trim();
  }
  return out.filter(function (x) { return x.length > 0; });
}

// 复制按钮用：把 markdown 符号去掉，粘到 X 的文本框里就是干净正文
export function stripMarkdown(text) {
  let s = String(text || "");
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 $2");
  s = s.replace(/```[a-zA-Z]*\n?/g, "");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/(^|\s)\*([^*\n]+)\*/g, "$1$2");
  s = s.replace(/(^|\s)__([^_\n]+)__/g, "$1$2");
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  s = s.replace(/^\s{0,3}>\s?/gm, "");
  s = s.replace(/^\s*[-*+]\s+/gm, "· ");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

// 供 UI / 测试使用的一次性报告
export function weighTweet(text, limit) {
  const lim = typeof limit === "number" ? limit : TWEET_LIMIT;
  const clean = stripMarkdown(text);
  const weight = weightedLength(clean);
  return {
    text: clean,
    weight: weight,
    limit: lim,
    remaining: lim - weight,
    over: weight > lim
  };
}
