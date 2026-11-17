// lib/tools.mjs —— 模型可调用的四个工具（插件和 CLI 共用同一实现）
// post_facts   抓真实事实（DOI / npm / Acme 版本 / URL / 一句话），每条带 source_url
// post_save    模型写好的 EN/ZH/卡片文案落盘成草稿（generatedBy: model）
// post_list    列草稿
// post_mark_posted  标记已发（写 posted.jsonl 台账）
import {
  loadConfig, createDraft, saveDraft, listDrafts, getDraft, findSourceDraft, setStatus
} from "./store.mjs";
import { finalizeDraft } from "./compose.mjs";
import { makeFact } from "./facts.mjs";
import { readReleaseNotes, expandHome } from "./release-notes.mjs";
import { renderCard } from "./card.mjs";
import { readRunbookReference } from "./sources.mjs";
import fs from "node:fs";

const UA = "dsh-post-draft-auto/0.2";

async function getJson(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, redirect: "follow" });
  if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
  // bioRxiv 有时把 JSON 当 text/plain 发回来，所以统一读 text 再 parse
  const txt = await res.text();
  return JSON.parse(txt);
}

async function getText(url) {
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
  return await res.text();
}

// "Last, A. B." / "Lane Guolan Chen" 归一化比较
function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function authorMatches(candidate, wanted) {
  const c = norm(candidate);
  const w = norm(wanted);
  if (!c || !w) return false;
  if (c === w || c.indexOf(w) !== -1 || w.indexOf(c) !== -1) return true;
  const ct = c.split(" ");
  return w.split(" ").every(function (t) { return ct.indexOf(t) !== -1; });
}

// ---------- 事实源：bioRxiv / medRxiv ----------
function doiServer(doi, server) {
  if (server) return server;
  return String(doi).indexOf("medrxiv") !== -1 ? "medrxiv" : "biorxiv";
}

async function factsFromDoi(input, config) {
  const doi = String(input.doi || "").replace(/^https?:\/\/doi\.org\//, "");
  if (!doi) throw new Error("doi 为空");
  const server = doiServer(doi, input.server);
  // 注意：bioRxiv 不接受 %2F，DOI 里的斜杠必须原样保留
  function apiUrl(d) {
    return "https://api.biorxiv.org/details/" + server + "/" + encodeURI(d).replace(/#/g, "%23");
  }
  let usedDoi = doi;
  let data = await getJson(apiUrl(usedDoi));
  let collection = Array.isArray(data.collection) ? data.collection : [];
  // bioRxiv 2026 起把 DOI 前缀换成了 10.64898，旧链接 10.1101 仍被到处引用：自动换前缀重试一次
  if (!collection.length && /^10\.(1101|64898)\//.test(doi)) {
    const other = /^10\.1101\//.test(doi)
      ? doi.replace(/^10\.1101\//, "10.64898/")
      : doi.replace(/^10\.64898\//, "10.1101/");
    try {
      const retry = await getJson(apiUrl(other));
      if (Array.isArray(retry.collection) && retry.collection.length) {
        usedDoi = other;
        data = retry;
        collection = retry.collection;
      }
    } catch (e) { data.retryError = String(e && e.message ? e.message : e); }
  }
  if (!collection.length) {
    throw new Error("bioRxiv 没有这条 DOI：" + doi +
      "（no posts found" + (data && data.retryError ? "；换前缀重试失败：" + data.retryError : "") +
      "；确认它是已发布的 preprint）");
  }
  const doi2 = usedDoi;
  // 取最新版本
  const sorted = collection.slice().sort(function (a, b) { return String(a.version || "").localeCompare(String(b.version || "")); });
  const rec = sorted[sorted.length - 1];
  const pageUrl = "https://www." + server + ".org/content/" + doi2 + "v" + (rec.version || "1");
  const authors = String(rec.authors || "").split(";").map(function (s) { return s.trim(); }).filter(Boolean);
  const facts = [];
  facts.push(makeFact({ id: "f1", kind: "title", value: "", detail: rec.title || "", sourceUrl: pageUrl, sourceType: server }));
  facts.push(makeFact({ id: "f2", kind: "doi", value: doi2, detail: doi2, sourceUrl: pageUrl, sourceType: server }));
  if (rec.date) facts.push(makeFact({ id: "f3", kind: "date", value: rec.date, detail: rec.date, sourceUrl: pageUrl, sourceType: server }));
  if (rec.abstract) facts.push(makeFact({ id: "abs", kind: "abstract", value: "", detail: String(rec.abstract).replace(/\s+/g, " ").slice(0, 700), sourceUrl: pageUrl, sourceType: server, sourceText: rec.abstract }));
  if (rec.author_corresponding) facts.push(makeFact({ id: "ca", kind: "author-corresponding", value: "", detail: rec.author_corresponding, sourceUrl: pageUrl, sourceType: server }));
  if (rec.author_corresponding_institution) facts.push(makeFact({ id: "ci", kind: "institution", value: "", detail: rec.author_corresponding_institution, sourceUrl: pageUrl, sourceType: server }));
  if (rec.category) facts.push(makeFact({ id: "cat", kind: "category", value: "", detail: rec.category, sourceUrl: pageUrl, sourceType: server }));
  if (rec.version) facts.push(makeFact({ id: "f4", kind: "version", value: String(rec.version), detail: "v" + rec.version, sourceUrl: pageUrl, sourceType: server }));
  authors.slice(0, 12).forEach(function (a, i) {
    facts.push(makeFact({ id: "a" + (i + 1), kind: "author", value: "", detail: a, sourceUrl: pageUrl, sourceType: server }));
  });
  const wanted = String(input.author || config.authorName || "").trim();
  const candidates = authors.concat(rec.author_corresponding ? [rec.author_corresponding] : []);
  const mine = wanted && !/^<.*>$/.test(wanted)
    ? candidates.filter(function (a) { return authorMatches(a, wanted); })
    : [];
  return {
    kind: "paper",
    sourceKey: "paper:" + server + ":" + doi2,
    source: { kind: "paper", label: server + " " + doi2, url: pageUrl, version: "v" + (rec.version || "1") },
    title: rec.title || doi,
    facts: facts,
    meta: {
      server: server, doi: doi2, doiAsAsked: doi, title: rec.title || "", date: rec.date || "",
      version: rec.version || "", authors: authors,
      corresponding: rec.author_corresponding || "",
      institution: rec.author_corresponding_institution || "",
      abstract: String(rec.abstract || "").replace(/\s+/g, " "),
      authorInPaper: mine, pageUrl: pageUrl
    },
    hints: [
      "正文只能引用 facts 里出现的字符串；作者名如果要用，请用 meta.authorInPaper 里的写法",
      "bioRxiv 接口没有摘要字段；摘要需要另外抓页面，抓不到就别写摘要"
    ]
  };
}

// ---------- 事实源：Acme 版本 ----------
async function factsFromVersion(input, config) {
  const item = ((config.sources && config.sources.site) || [])[0] || {};
  const onlineUrl = item.url || "https://example.com/version.json";
  const online = await getJson(onlineUrl);
  const version = String(input.version || online.version || "");
  const localFile = expandHome((item.local && item.local.file) || "");
  let local = "";
  if (localFile && fs.existsSync(localFile)) {
    try { local = String(JSON.parse(fs.readFileSync(localFile, "utf8")).version || ""); } catch { local = ""; }
  }
  const notes = readReleaseNotes(item.releaseNotesFiles || config.releaseNotesFiles, version);
  const facts = [makeFact({ id: "f1", kind: "version", value: version.replace(/^[vV]/, ""), detail: version, sourceUrl: onlineUrl, sourceType: "site" })];
  if (local) facts.push(makeFact({ id: "f2", kind: "version-local", value: local.replace(/^[vV]/, ""), detail: local, sourceUrl: "file://" + localFile, sourceType: "site" }));
  if (notes) facts.push(makeFact({ id: "n0", kind: "release-note", value: "", detail: notes.title, sourceUrl: notes.sourceUrl, sourceType: "release-notes" }));
  (notes ? notes.bullets : []).forEach(function (b, i) {
    facts.push(makeFact({ id: "n" + (i + 1), kind: "release-note", value: "", detail: b.text, sourceUrl: notes.sourceUrl, sourceType: "release-notes" }));
  });
  // releases.md 没有这一版时，退到本地 CHANGELOG 抽原话给模型改写（只给事实，不替它写）
  let runbook = null;
  if (!notes && item.referenceFile) {
    runbook = readRunbookReference(item.referenceFile, version);
    if (runbook) {
      facts.push(makeFact({ id: "rb0", kind: "runbook-title", value: "", detail: runbook.title, sourceUrl: runbook.sourceUrl, sourceType: "runbook" }));
      runbook.lines.forEach(function (x, i) {
        facts.push(makeFact({ id: "rb" + (i + 1), kind: "runbook-note", value: "", detail: x.text, sourceUrl: runbook.sourceUrl, sourceType: "runbook" }));
      });
    }
  }
  const guard = local && local !== version
    ? { kind: local > version ? "pending-rollout" : "online-newer", online: version, local: local, message: "线上 " + version + " / 本地 " + local + "：版本不一致，先别发" }
    : null;
  return {
    kind: "release",
    sourceKey: "release:2hai:" + version,
    source: { kind: "release", label: "Acme " + version, url: item.link || onlineUrl, version: version },
    title: "Acme " + version,
    facts: facts,
    guard: guard,
    meta: { version: version, local: local, online: online, notesFound: !!notes, releaseNotesUrl: notes ? notes.sourceUrl : (runbook ? runbook.sourceUrl : ""), runbookFound: !!runbook },
    hints: notes
      ? []
      : (runbook
        ? ["releases.md 没有这一版；下面 runbook-note 是 CHANGELOG 原话，可以据它改写要点，但不要把内部实现细节（表结构、文件名）写进推文"]
        : ["releases.md 和 CHANGELOG 里都没有这一版：不要编功能点，标「待补充」"])
  };
}

// ---------- 事实源：npm ----------
async function factsFromNpm(input) {
  const pkg = input.pkg || input.npm;
  if (!pkg) throw new Error("pkg 为空");
  const packument = await getJson("https://registry.npmjs.org/" + encodeURIComponent(pkg));
  const version = input.version || (packument["dist-tags"] && packument["dist-tags"].latest);
  const vInfo = (packument.versions && packument.versions[version]) || {};
  const url = "https://www.npmjs.com/package/" + pkg + "/v/" + version;
  const facts = [
    makeFact({ id: "f1", kind: "version", value: version, detail: version, sourceUrl: url, sourceType: "npm" }),
    makeFact({ id: "f2", kind: "date", value: String((packument.time && packument.time[version]) || "").slice(0, 10), detail: String((packument.time && packument.time[version]) || "").slice(0, 10), sourceUrl: url, sourceType: "npm" })
  ];
  const desc = vInfo.description || packument.description || "";
  if (desc) facts.push(makeFact({ id: "f3", kind: "description", value: "", detail: desc, sourceUrl: url, sourceType: "npm" }));
  return {
    kind: "npm",
    sourceKey: "npm:" + pkg + "@" + version,
    source: { kind: "npm", label: pkg, url: url, version: version },
    title: pkg + " " + version,
    facts: facts,
    meta: { pkg: pkg, version: version, description: desc },
    hints: ["npm 元数据不含 changelog：功能点要用户补或从 release notes 取"]
  };
}

// ---------- 事实源：任意 URL ----------
async function factsFromUrl(input) {
  const url = input.url;
  const html = await getText(url);
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
  const desc = (html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i) || [])[1] || "";
  const facts = [makeFact({ id: "f1", kind: "url", value: "", detail: url, sourceUrl: url, sourceType: "url", sourceText: html.slice(0, 500) })];
  if (title) facts.push(makeFact({ id: "f2", kind: "title", value: "", detail: title.replace(/\s+/g, " ").trim(), sourceUrl: url, sourceType: "url" }));
  if (desc) facts.push(makeFact({ id: "f3", kind: "description", value: "", detail: desc.trim(), sourceUrl: url, sourceType: "url" }));
  return { kind: "url", sourceKey: "url:" + url, source: { kind: "url", label: title || url, url: url, version: "" }, title: title || url, facts: facts, meta: { url: url, title: title, description: desc }, hints: [] };
}

// ---------- 事实源：用户一句话 ----------
function factsFromText(input) {
  const text = String(input.text || "").trim();
  if (!text) throw new Error("text 为空");
  const versions = [];
  const vre = /(?<![\w.-])[vV]?\d+\.\d+(?:\.\d+)*(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?/g;
  let m;
  while ((m = vre.exec(text)) !== null) {
    const v = m[0].replace(/^[vV]/, "");
    if (versions.indexOf(v) === -1) versions.push(v);
  }
  const facts = [makeFact({ id: "u1", kind: "user-message", value: "", detail: text, sourceUrl: "user://message", sourceType: "manual", sourceText: text })];
  versions.forEach(function (v, i) {
    facts.push(makeFact({ id: "v" + (i + 1), kind: "version", value: v, detail: v, sourceUrl: "user://message", sourceType: "manual", sourceText: text }));
  });
  return {
    kind: "manual",
    sourceKey: "manual:" + new Date().toISOString(),
    source: { kind: "manual", label: "用户口述", url: "", version: versions[0] || "" },
    title: text.slice(0, 40),
    facts: facts,
    meta: { text: text, versions: versions },
    hints: ["除版本号外的事实都来自用户口述；不要补未提到的功能"]
  };
}

export async function postFacts(input, cfg) {
  const config = cfg || loadConfig();
  const args = input || {};
  if (args.doi) return await factsFromDoi(args, config);
  if (args.version || args.kind === "release") return await factsFromVersion(args, config);
  if (args.pkg || args.npm) return await factsFromNpm(args);
  if (args.url) return await factsFromUrl(args);
  if (args.text) return factsFromText(args);
  throw new Error("post_facts 需要 doi / version / pkg / url / text 之一");
}

// ---------- 落盘 ----------
export async function postSave(input, cfg) {
  const config = cfg || loadConfig();
  const args = input || {};
  if (!args.en || !args.zh) throw new Error("post_save 需要 en 和 zh 两段正文");
  const facts = Array.isArray(args.facts) ? args.facts : [];
  if (!facts.length) throw new Error("post_save 需要 facts（先调 post_facts，把结果原样带回）");

  const sourceKey = args.sourceKey || ("model:" + new Date().toISOString());
  const candidate = {
    sourceKey: sourceKey,
    source: args.source || { kind: "model", label: args.title || "model draft", url: "", version: "" },
    title: args.title || "Draft",
    facts: facts,
    pending: Array.isArray(args.pending) ? args.pending : [],
    enText: args.en,
    zhText: args.zh,
    card: {
      title: (args.card && args.card.title) || args.title || "Update",
      subtitle: (args.card && args.card.subtitle) || "",
      version: (args.card && args.card.version) || "",
      bullets: (args.card && args.card.bullets) || [],
      brand: config.brand
    },
    generatedBy: "model",
    modelNotes: args.notes || "",
    reference: args.reference || null,
    guard: args.guard || null
  };
  const fin = finalizeDraft(candidate, config);
  fin.generatedBy = "model";
  fin.modelNotes = args.notes || "";
  const existing = findSourceDraft(sourceKey);
  const res = createDraft(fin, config, { force: !!existing && !!args.replace });
  if (!res.created) {
    return { ok: false, reason: res.reason, draftId: res.draft.id, generatedBy: res.draft.generatedBy };
  }
  const media = renderCard(res.draft.card, res.draft.id);
  res.draft.media = media;
  saveDraft(res.draft);
  return {
    ok: true,
    draftId: res.draft.id,
    generatedBy: "model",
    enWeight: res.draft.enWeight,
    zhWeight: res.draft.zhWeight,
    pending: res.draft.pending,
    blockers: res.draft.blockers,
    media: media,
    file: "drafts/" + res.draft.id + ".json"
  };
}

export function postList(input, cfg) {
  const args = input || {};
  const all = listDrafts().filter(function (d) {
    if (args.status && d.status !== args.status) return false;
    return true;
  });
  return {
    total: all.length,
    drafts: all.map(function (d) {
      return {
        id: d.id, title: d.title, status: d.status, generatedBy: d.generatedBy || "template",
        sourceKey: d.sourceKey, enWeight: d.enWeight, zhWeight: d.zhWeight, limit: d.limit,
        pending: (d.pending || []).length, blockers: (d.blockers || []).length,
        guard: d.guard ? d.guard.kind : null,
        media: d.media ? (d.media.png || d.media.svg) : null,
        createdAt: d.createdAt
      };
    })
  };
}

export function postMarkPosted(input) {
  const args = input || {};
  if (!args.id) throw new Error("post_mark_posted 需要 id");
  const r = setStatus(args.id, "published", { note: args.note || "" });
  if (!r.ok) return { ok: false, code: r.code, from: r.from, to: r.to };
  return { ok: true, id: r.draft.id, status: r.draft.status, publishedAt: r.draft.publishedAt };
}

export const TOOL_NAMES = ["post_facts", "post_save", "post_list", "post_mark_posted"];

export async function callTool(name, args, cfg) {
  if (name === "post_facts") return await postFacts(args, cfg);
  if (name === "post_save") return await postSave(args, cfg);
  if (name === "post_list") return postList(args, cfg);
  if (name === "post_mark_posted") return postMarkPosted(args, cfg);
  throw new Error("unknown tool: " + name);
}