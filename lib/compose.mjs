// lib/compose.mjs —— 从事实生成中英双语稿子（确定性模版，不调用任何模型）
// 设计原则：模版只负责句式，事实只来自 sources/*；抽不到就留占位符，绝不编。
import {
  TWEET_LIMIT, weightedLength, truncateToWeight, stripMarkdown
} from "./weight.mjs";
import {
  pending, findPending, validateTraceable, checkVoice, makeFact
} from "./facts.mjs";

function uniq(arr) {
  const seen = new Set();
  const out = [];
  (arr || []).forEach(function (x) {
    if (x === null || x === undefined) return;
    if (seen.has(x)) return;
    seen.add(x);
    out.push(x);
  });
  return out;
}

function clip(s, max) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 3)).trim() + "...";
}

function bullets(lines) {
  return lines.filter(function (x) { return !!x; }).map(function (x) { return "· " + x; }).join("\n");
}

function block(parts) {
  return parts.filter(function (x) { return x !== null && x !== undefined && x !== ""; }).join("\n\n");
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function extractBullets(body, max) {
  const lines = String(body || "").split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (!m) continue;
    const t = clip(stripMarkdown(m[1]), 110);
    if (t.length < 6) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  if (!out.length) {
    const plain = stripMarkdown(body).replace(/\s+/g, " ").trim();
    if (plain) {
      const sentences = plain.split(/(?<=[.!?。])\s+/).slice(0, 2);
      sentences.forEach(function (s) { if (out.length < max) out.push(clip(s, 120)); });
    }
  }
  return out;
}

function cardTitleOf(input) {
  return [input.product, input.version].filter(Boolean).join(" ");
}

function makeCard(input, config) {
  return {
    title: input.cardTitle || cardTitleOf(input) || "Update",
    subtitle: input.cardSubtitle || "",
    version: input.version || "",
    bullets: (input.cardBullets || []).slice(0, 3),
    brand: config.brand || {}
  };
}

// ---------- npm ----------
export function composeNpm(input, config) {
  const pkg = input.pkg;
  const version = input.version;
  const product = config.brand.product || pkg;
  const date = String(input.publishedAt || "").slice(0, 10) || todayUtc();
  const url = input.url || "https://www.npmjs.com/package/" + pkg + "/v/" + version;
  const desc = clip(input.description || "", 95);
  const install = "npm i " + pkg + "@" + version;

  const facts = [
    makeFact({ id: "f1", kind: "version", value: version, detail: version, sourceUrl: url, sourceType: "npm" }),
    makeFact({ id: "f2", kind: "date", value: date, detail: date, sourceUrl: url, sourceType: "npm" })
  ];
  if (desc) {
    facts.push(makeFact({ id: "f3", kind: "description", value: "", detail: desc, sourceUrl: url, sourceType: "npm" }));
  }

  const en = block([
    product + " " + version + " is out.",
    bullets([
      "published " + date,
      desc || pending("包的简介"),
      pending("变更要点")
    ]),
    install
  ]);

  const zh = block([
    product + " " + version + " 已发布。",
    bullets([
      date + " 上线",
      pending("变更要点")
    ]),
    install
  ]);

  return {
    sourceKey: "npm:" + pkg + "@" + version,
    source: { kind: "npm", label: pkg, url: url, version: version },
    title: product + " " + version,
    facts: facts,
    pending: [
      "变更要点：npm 元数据里没有 release notes / CHANGELOG，需要你补一句"
    ],
    enText: en,
    zhText: zh,
    card: makeCard({
      product: product, version: version,
      cardTitle: product,
      cardSubtitle: desc || "",
      cardBullets: [date ? "published " + date : "", install]
    }, config)
  };
}

// ---------- GitHub Release ----------
export function composeGithubRelease(input, config) {
  const repo = input.repo;
  const repoS = String(repo).split("/").pop();
  const tag = input.tag;
  const product = /2hai/i.test(repoS) ? (config.brand.name || repoS) : repoS;
  const date = String(input.publishedAt || "").slice(0, 10) || todayUtc();
  const url = input.url || "https://github.com/" + repo + "/releases/tag/" + tag;
  const bodyBullets = extractBullets(input.body, 3);

  const facts = [
    makeFact({ id: "f1", kind: "version", value: tag, detail: tag, sourceUrl: url, sourceType: "github" }),
    makeFact({ id: "f2", kind: "date", value: date, detail: date, sourceUrl: url, sourceType: "github" })
  ];
  const factBullets = bodyBullets.map(function (b, i) {
    facts.push(makeFact({
      id: "b" + (i + 1), kind: "change", value: "", detail: b,
      sourceUrl: url, sourceType: "github", sourceText: input.body || ""
    }));
    return b;
  });

  const enBulletList = factBullets.length ? factBullets : [pending("变更要点")];

  const en = block([
    product + " " + tag + " is out.",
    bullets([date ? "released " + date : ""].concat(enBulletList)),
    url
  ]);

  const zh = block([
    product + " " + tag + " 已发布。",
    bullets(factBullets.length
      ? factBullets.slice(0, 2).concat(["完整说明：" + url])
      : [pending("变更要点")]),
    factBullets.length ? "" : url
  ]);

  return {
    sourceKey: "github:" + repo + "@" + tag,
    source: { kind: "github", label: repo, url: url, version: tag },
    title: product + " " + tag,
    facts: facts,
    pending: factBullets.length ? [] : ["release notes 里没抽到要点，请在 GitHub Release 里补 bullet，或手动改稿"],
    enText: en,
    zhText: zh,
    card: makeCard({
      product: product, version: tag,
      cardTitle: product,
      cardSubtitle: enBulletList[0] && enBulletList[0].indexOf("⟨待补") === -1 ? enBulletList[0] : "",
      cardBullets: factBullets.slice(0, 3)
    }, config)
  };
}

// ---------- arXiv ----------
export function composeArxiv(input, config) {
  // 通用「论文/preprint」出稿器：bioRxiv / medRxiv / arXiv 都走这里，只是 venue 不同
  const venue = input.venue || "arXiv";
  const venueKey = String(input.venueKey || "arxiv").toLowerCase();
  const id = input.id;
  const title = clip(input.title, 120);
  const url = input.url || "https://arxiv.org/abs/" + id;
  const abs = stripMarkdown(input.summary || "").replace(/\s+/g, " ").trim();
  const firstSentence = clip((abs.split(/(?<=[.。])\s+/)[0] || abs), 140);
  const authors = Array.isArray(input.authors) ? input.authors : [];
  const authorLine = authors.length
    ? authors.slice(0, 3).join(", ") + (authors.length > 3 ? " et al." : "")
    : "";

  const facts = [
    makeFact({ id: "f1", kind: "title", value: "", detail: title, sourceUrl: url, sourceType: "paper" }),
    makeFact({ id: "f2", kind: "id", value: id, detail: venue + ":" + id, sourceUrl: url, sourceType: "paper" })
  ];
  if (firstSentence) facts.push(makeFact({ id: "f3", kind: "abstract", value: "", detail: firstSentence, sourceUrl: url, sourceType: "paper" }));
  if (authorLine) facts.push(makeFact({ id: "f4", kind: "authors", value: "", detail: authorLine, sourceUrl: url, sourceType: "paper" }));

  const en = block([
    "New preprint: " + title,
    bullets([firstSentence || pending("一句话摘要"), venue + ":" + id]),
    url
  ]);

  const zh = block([
    "新 preprint：" + title,
    bullets([authorLine || pending("作者"), venue + ":" + id]),
    url
  ]);

  return {
    sourceKey: "paper:" + venueKey + ":" + id,
    source: { kind: "paper", label: venue + " " + id, url: url, version: id },
    title: title,
    facts: facts,
    pending: firstSentence ? [] : ["摘要没取到，需要补一句"],
    enText: en,
    zhText: zh,
    card: makeCard({ product: venue, version: "", cardTitle: clip(title, 46), cardSubtitle: authorLine, cardBullets: [] }, config)
  };
}

// 兼容旧名字
export const composePaper = composeArxiv;

// ---------- RSS ----------
export function composeRss(input, config) {
  const title = clip(input.title, 110);
  const url = input.link;
  const date = String(input.publishedAt || "").slice(0, 10) || "";
  const summary = clip(stripMarkdown(input.summary || "").replace(/\s+/g, " "), 150);

  const facts = [
    makeFact({ id: "f1", kind: "title", value: "", detail: title, sourceUrl: url, sourceType: "rss" })
  ];
  if (date) facts.push(makeFact({ id: "f2", kind: "date", value: date, detail: date, sourceUrl: url, sourceType: "rss" }));
  if (summary) facts.push(makeFact({ id: "f3", kind: "summary", value: "", detail: summary, sourceUrl: url, sourceType: "rss" }));

  const en = block([
    "New post: " + title,
    bullets([summary || pending("一句话摘要"), date ? date : ""]),
    url
  ]);

  const zh = block([
    "新文章：" + title,
    bullets([pending("中文一句话"), date ? date : ""]),
    url
  ]);

  return {
    sourceKey: "rss:" + (input.feedId || "feed") + ":" + (input.guid || url || title),
    source: { kind: "rss", label: input.feedTitle || input.feedId || "RSS", url: url, version: "" },
    title: title,
    facts: facts,
    pending: ["中文一句话：RSS 只给原文，不自动翻译"],
    enText: en,
    zhText: zh,
    card: makeCard({ product: input.feedTitle || "Update", version: "", cardTitle: clip(title, 46), cardSubtitle: summary, cardBullets: [] }, config)
  };
}

// ---------- 手动一句话 ----------
export function composeManual(input, config) {
  const text = String(input.text || "").trim();
  if (!text) throw new Error("--manual 需要一段文字");

  const versions = [];
  const versionsDisplay = [];
  const dates = [];
  const vre = /(?<![\w.-])[vV]?\d+\.\d+(?:\.\d+)*(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?/g;
  const dre = /(?<![\d-])\d{4}-\d{2}-\d{2}(?![\d-])/g;
  let m;
  while ((m = vre.exec(text)) !== null) {
    const v = m[0].replace(/^[vV]/, "");
    if (versions.indexOf(v) === -1) {
      versions.push(v);
      versionsDisplay.push(m[0]);
    }
  }
  while ((m = dre.exec(text)) !== null) {
    if (dates.indexOf(m[0]) === -1) dates.push(m[0]);
  }
  const names = [];
  if (/Acme/i.test(text)) names.push("Acme");
  if (/deepseek\s*harness|\bdsh\b/i.test(text)) names.push("DeepSeek Harness");
  const hasPreprint = /preprint|arxiv|论文/i.test(text);

  const manualUrl = "user://message/" + new Date().toISOString();
  const facts = [];
  versions.forEach(function (v, i) {
    facts.push(makeFact({
      id: "v" + (i + 1), kind: "version", value: v, detail: v,
      sourceUrl: manualUrl, sourceType: "manual", sourceText: text, verified: false
    }));
  });
  dates.forEach(function (d, i) {
    facts.push(makeFact({
      id: "d" + (i + 1), kind: "date", value: d, detail: d,
      sourceUrl: manualUrl, sourceType: "manual", sourceText: text, verified: false
    }));
  });
  facts.push(makeFact({
    id: "m1", kind: "user_message", value: "", detail: clip(text, 160),
    sourceUrl: manualUrl, sourceType: "manual", sourceText: text, verified: false
  }));

  const subject = uniq(names.concat(versionsDisplay)).join(" ") || "Update";

  const en = block([
    subject + " is out.",
    bullets([dates.length ? dates[0] : "", pending("一句话说清这次最重要的变化")]
      .concat(hasPreprint ? [pending("preprint 标题与链接")] : [])),
    pending("链接（仓库 / 发布页 / 论文）")
  ]);

  const zh = block([
    subject + " 已发布。",
    bullets([pending("中文要点一句话")].concat(hasPreprint ? [pending("preprint 标题与链接")] : []))
  ]) + "\n\n" + pending("链接");

  return {
    sourceKey: "manual:" + new Date().toISOString(),
    source: { kind: "manual", label: "手动", url: "", version: versions[0] || "" },
    title: subject,
    facts: facts,
    pending: uniq([
      "要点：一句话说清这次最重要的变化（不能编，等你填）",
      hasPreprint ? "preprint：标题 + 链接" : "",
      "链接：仓库 / 发布页 / 论文地址"
    ]).filter(Boolean),
    enText: en,
    zhText: zh,
    card: makeCard({
      product: names[0] || "Update", version: versions[0] || "",
      cardTitle: names[0] || "Update",
      cardSubtitle: "Release notes: pending",
      cardBullets: []
    }, config)
  };
}

// ---------- 收口：计权、截断、溯源、语气 ----------
export function finalizeDraft(candidate, config) {
  const limit = (config.limits && config.limits.tweet) || TWEET_LIMIT;
  const warnings = [];

  let en = stripMarkdown(candidate.enText || "");
  let zh = stripMarkdown(candidate.zhText || "");

  if (weightedLength(en) > limit) {
    en = truncateToWeight(en, limit);
    warnings.push({ kind: "truncated", part: "en", detail: "英文主推超过 " + limit + " 计权，已截断" });
  }
  if (weightedLength(zh) > limit) {
    zh = truncateToWeight(zh, limit);
    warnings.push({ kind: "truncated", part: "zh", detail: "中文回复超过 " + limit + " 计权，已截断" });
  }

  const traceEn = validateTraceable(en, candidate.facts);
  const traceZh = validateTraceable(zh, candidate.facts);
  const missing = uniq(traceEn.missing.concat(traceZh.missing));
  const blockers = [];
  if (missing.length) {
    blockers.push({ kind: "untraceable", detail: missing, hint: "这些数字/版本号在事实里找不到来源，禁止发布" });
  }

  const voice = checkVoice(en + "\n" + zh, config.voice);
  if (!voice.ok) warnings.push({ kind: "voice", detail: voice.violations });

  const base = candidate.pending || [];
  const pendingFromBody = uniq(findPending(en).concat(findPending(zh))).filter(function (label) {
    // 如果待补清单里已经有一条把这个占位说清楚了，就不再重复列一遍
    return !base.some(function (b) { return String(b).indexOf(label) !== -1; });
  });
  const pendingAll = uniq(base.concat(pendingFromBody.map(function (p) { return "正文占位：" + p; })));

  return {
    sourceKey: candidate.sourceKey,
    source: candidate.source,
    title: candidate.title,
    facts: candidate.facts,
    reference: candidate.reference || null,
    guard: candidate.guard || null,
    generatedBy: candidate.generatedBy || "template",
    modelNotes: candidate.modelNotes || "",
    enText: en,
    zhText: zh,
    enWeight: weightedLength(en),
    zhWeight: weightedLength(zh),
    pending: pendingAll,
    blockers: blockers,
    warnings: warnings,
    card: candidate.card
  };
}

// ---------- 复制用纯文本 ----------
export function copyText(draft, part) {
  const en = stripMarkdown(draft.enText || "");
  const zh = stripMarkdown(draft.zhText || "");
  if (part === "zh") return zh;
  if (part === "all") return en + "\n\n——————\n\n" + zh;
  return en;
}