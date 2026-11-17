// lib/sources.mjs —— 事实源适配器
// 通用优先：rss（Atom/RSS 通用解析）+ json-api（任意 JSON 端点 + 可配置字段映射/作者过滤）
// 专用适配器：npm / GitHub Releases / site（站点版本端点）+ 兼容保留 arxiv（默认关闭）
// 只读公开接口，不写任何东西；失败就抛错，由 collect 记录，不静默吞掉。
import { composeNpm, composeGithubRelease, composeArxiv, composeRss } from "./compose.mjs";
import { pending, makeFact } from "./facts.mjs";
import { readReleaseNotes, compareVersions, expandHome } from "./release-notes.mjs";
import fsMod from "node:fs";

const UA = "x-draft-desk/0.1 (local draft workbench)";

// 缺配置/缺作者时抛这个：collect 会记成 skipped 并在界面上提示，不当作错误
export class SkipSource extends Error {
  constructor(reason, code) {
    super(reason);
    this.name = "SkipSource";
    this.code = code || "SKIP";
  }
}

async function getText(url, headers) {
  const res = await fetch(url, {
    headers: Object.assign({ "user-agent": UA }, headers || {}),
    redirect: "follow"
  });
  if (!res.ok) {
    const err = new Error("HTTP " + res.status + " " + url);
    err.status = res.status;
    throw err;
  }
  return await res.text();
}

async function getJson(url, headers) {
  const txt = await getText(url, Object.assign({ accept: "application/json" }, headers || {}));
  return JSON.parse(txt);
}

function tag(xml, name) {
  const m = String(xml).match(new RegExp("<" + name + "[^>]*>([\\s\\S]*?)</" + name + ">"));
  return m ? decodeEntities(m[1]).trim() : "";
}

function cdata(xml, name) {
  const m = String(xml).match(new RegExp("<" + name + "[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</" + name + ">"));
  return m ? decodeEntities(m[1]).trim() : "";
}

function decodeEntities(s) {
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function stopHere(s, max) {
  return String(s || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\x60([^\x60]+)\x60/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max || 110);
}

// ---------- npm ----------
export async function npmCandidate(item) {
  const packument = await getJson("https://registry.npmjs.org/" + encodeURIComponent(item.pkg));
  const tags = packument["dist-tags"] || {};
  let version = item.version || "";
  if (!version) {
    if (item.includePrerelease) {
      const all = Object.keys(tags).map(function (k) { return tags[k]; });
      all.sort(function (a, b) {
        const ta = (packument.time && packument.time[a]) || "";
        const tb = (packument.time && packument.time[b]) || "";
        return String(tb).localeCompare(String(ta));
      });
      version = all[0];
    } else {
      version = tags.latest;
    }
  }
  if (!version) throw new Error("npm: 没有可用的 dist-tag");
  const time = (packument.time && packument.time[version]) || "";
  const vInfo = (packument.versions && packument.versions[version]) || {};
  return composeNpm({
    pkg: item.pkg,
    version: version,
    publishedAt: time,
    description: vInfo.description || packument.description || "",
    url: "https://www.npmjs.com/package/" + item.pkg + "/v/" + version
  }, item._config);
}

// ---------- GitHub Releases ----------
export async function githubCandidate(item, config) {
  const url = "https://api.github.com/repos/" + item.repo + "/releases?per_page=5";
  const headers = { accept: "application/vnd.github+json" };
  if (item.token) headers.authorization = "Bearer " + item.token;
  let rels;
  try {
    rels = await getJson(url, headers);
  } catch (e) {
    if (e.status === 404) {
      const err = new Error("GitHub 仓库 404：" + item.repo + "（私有或不存在；未认证 API 只能读公开仓库。要启用请给 item.token，但本阶段不建任何凭据）");
      err.code = "GH_404";
      throw err;
    }
    throw e;
  }
  if (!Array.isArray(rels) || !rels.length) throw new Error("GitHub: " + item.repo + " 没有 release（可能只用 tag，没用 Releases）");
  const rel = rels.filter(function (r) {
    if (r.draft) return false;
    if (r.prerelease && !item.includePrerelease) return false;
    return true;
  })[0] || rels[0];
  return composeGithubRelease({
    repo: item.repo,
    tag: rel.tag_name,
    name: rel.name || rel.tag_name,
    body: rel.body || "",
    publishedAt: rel.published_at || rel.created_at,
    url: rel.html_url
  }, config);
}

// ---------- arXiv（兼容保留，默认关闭） ----------
export async function arxivCandidate(item, config) {
  const q = encodeURIComponent(item.query || "");
  const url = "https://export.arxiv.org/api/query?search_query=" + q +
    "&sortBy=submittedDate&sortOrder=descending&max_results=1";
  const xml = await getText(url);
  const entryMatch = xml.match(/<entry>[\s\S]*?<\/entry>/);
  if (!entryMatch) throw new Error("arXiv: 没有返回条目（检查 query）");
  const entry = entryMatch[0];
  const rawId = tag(entry, "id");
  const idMatch = rawId.match(/abs\/([^\s<]+)/);
  const id = idMatch ? idMatch[1] : rawId;
  const authors = [];
  const authorRe = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
  let am;
  while ((am = authorRe.exec(entry)) !== null) authors.push(decodeEntities(am[1]));
  return composeArxiv({
    venue: "arXiv",
    venueKey: "arxiv",
    id: id,
    title: tag(entry, "title"),
    summary: tag(entry, "summary"),
    authors: authors,
    publishedAt: tag(entry, "published"),
    url: "https://arxiv.org/abs/" + id
  }, config);
}

// ---------- 通用：json-api ----------
// 配置里只需要给：url（可含 {author} 占位）、itemsPath、map、authorField、author。
// 字段取值支持点路径与数组下标（a.b[0].c），map 的值可以是「路径数组」表示按顺序取第一个存在的。
const PRESETS = {
  biorxiv: {
    venue: "bioRxiv",
    venueKey: "biorxiv",
    itemsPath: ["collection", "messages", "data"],
    authorField: "authors",
    map: { id: ["doi", "id"], title: ["title"], summary: ["abstract", "summary"], date: ["date", "published"], url: ["url"] },
    link: "https://www.biorxiv.org/content/{id}"
  },
  medrxiv: {
    venue: "medRxiv",
    venueKey: "medrxiv",
    itemsPath: ["collection", "messages", "data"],
    authorField: "authors",
    map: { id: ["doi", "id"], title: ["title"], summary: ["abstract", "summary"], date: ["date", "published"], url: ["url"] },
    link: "https://www.medrxiv.org/content/{id}"
  }
};

function getPath(obj, path) {
  if (!path) return obj;
  const parts = String(path).split(".");
  let acc = obj;
  for (let i = 0; i < parts.length; i++) {
    if (acc === null || acc === undefined) return undefined;
    const m = parts[i].match(/^([^\[\]]+)\[(\d+)\]$/);
    if (m) {
      const arr = acc[m[1]];
      acc = Array.isArray(arr) ? arr[Number(m[2])] : undefined;
    } else if (Array.isArray(acc) && /^\d+$/.test(parts[i])) {
      acc = acc[Number(parts[i])];
    } else {
      acc = acc[parts[i]];
    }
  }
  return acc;
}

function firstDefined(obj, paths) {
  const list = Array.isArray(paths) ? paths : [paths];
  for (let i = 0; i < list.length; i++) {
    const v = getPath(obj, list[i]);
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

function pickItems(data, itemsPath, presetPath) {
  if (Array.isArray(data)) return data;
  const candidates = [];
  [itemsPath, presetPath, ["collection", "messages", "data", "items", "results", "records", "entries"]]
    .forEach(function (c) {
      if (!c) return;
      (Array.isArray(c) ? c : [c]).forEach(function (p) { if (candidates.indexOf(p) === -1) candidates.push(p); });
    });
  for (let i = 0; i < candidates.length; i++) {
    const v = getPath(data, candidates[i]);
    if (Array.isArray(v)) return v;
  }
  return [];
}

function normName(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function nameMatches(candidate, wanted, mode) {
  if (!candidate || !wanted) return false;
  if (candidate === wanted) return true;
  if (mode === "equals") return false;
  if (candidate.indexOf(wanted) !== -1 || wanted.indexOf(candidate) !== -1) return true;
  // 顺序无关：候选里包含署名里的每个词就算命中（"Chen, Lane Guolan" vs "Lane Guolan Chen"）
  const ct = candidate.split(" ").filter(Boolean);
  const wt = wanted.split(" ").filter(Boolean);
  if (!ct.length || !wt.length) return false;
  return wt.every(function (t) { return ct.indexOf(t) !== -1; });
}

function extractAuthors(rec, field) {
  const raw = getPath(rec, field);
  if (raw === undefined || raw === null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(function (a) {
    if (a && typeof a === "object") {
      const v = firstDefined(a, ["name", "fullName", "author", "family"]);
      return v === undefined ? "" : String(v);
    }
    return String(a);
  }).filter(Boolean);
}

function resolveAuthor(item) {
  const raw = String(item.author || "").trim();
  if (!raw || /^<.*>$/.test(raw)) {
    throw new SkipSource("待补 author：在 config.json 里把 author 换成你的英文署名（现在是占位符）", "AUTHOR_MISSING");
  }
  return raw;
}

export async function jsonApiCandidate(item, config) {
  const preset = PRESETS[item.preset] || {};
  const author = resolveAuthor(item);
  const urlTemplate = String(item.url || "");
  if (!urlTemplate) {
    throw new SkipSource("待配置端点：url 还空着（等端点查证结论得出后只改 config.json，不改代码）", "URL_MISSING");
  }
  const url = urlTemplate.replace(/\{author\}/g, encodeURIComponent(author));
  const data = await getJson(url, item.headers);
  const items = pickItems(data, item.itemsPath, preset.itemsPath);
  if (!items.length) {
    throw new Error("json-api: 没找到条目数组（检查 itemsPath：" + (item.itemsPath || "未配置") + "）");
  }

  const authorField = item.authorField || preset.authorField || "authors";
  const mode = item.authorMatch || "contains";
  const wanted = normName(author);
  const matched = items.filter(function (rec) {
    const names = extractAuthors(rec, authorField).map(normName);
    return names.some(function (n) { return nameMatches(n, wanted, mode); });
  });
  if (!matched.length) return null;

  const rec = matched[0];
  const map = Object.assign({}, preset.map || {}, item.map || {});
  const id = String(firstDefined(rec, map.id) || "");
  if (!id) throw new Error("json-api: 条目里没有 id/doi（检查 map.id）");
  const title = stopHere(firstDefined(rec, map.title) || "", 120);
  const summary = String(firstDefined(rec, map.summary) || "");
  const date = String(firstDefined(rec, map.date) || "");
  const authors = extractAuthors(rec, authorField);
  const linkTemplate = item.link || preset.link || "";
  const link = firstDefined(rec, map.url) || (linkTemplate ? String(linkTemplate).replace(/\{id\}/g, id) : url);

  return composeArxiv({
    venue: item.venue || preset.venue || "Preprint",
    venueKey: item.venueKey || preset.venueKey || "paper",
    id: id,
    title: title,
    summary: summary,
    authors: authors,
    publishedAt: date,
    url: link
  }, config);
}

// ---------- RSS / Atom（通用 XML） ----------
export async function rssCandidate(item, config) {
  if (!item.url) throw new SkipSource("RSS: 没填 url", "URL_MISSING");
  const xml = await getText(item.url);
  const isAtom = /<feed[\s>]/.test(xml);
  const itemRe = isAtom ? /<entry>[\s\S]*?<\/entry>/g : /<item>[\s\S]*?<\/item>/g;
  const m = xml.match(itemRe);
  if (!m || !m.length) throw new Error("RSS: 没有条目");
  const first = m[0];
  const link = isAtom ? (tag(first, "id") || "") : (tag(first, "link") || "");
  const linkAttr = first.match(/<link[^>]*href="([^"]+)"/);
  const title = isAtom ? tag(first, "title") : cdata(first, "title");
  const summary = isAtom ? tag(first, "summary") : cdata(first, "description");
  const published = isAtom ? tag(first, "updated") || tag(first, "published") : tag(first, "pubDate");
  const guid = isAtom ? tag(first, "id") : (tag(first, "guid") || link);
  return composeRss({
    feedId: item.id,
    feedTitle: item.label || item.id,
    title: title,
    link: linkAttr ? linkAttr[1] : link,
    publishedAt: published,
    summary: summary,
    guid: guid
  }, config);
}

// ---------- 本地 CHANGELOG（CHANGELOG）参考素材：只读 ----------
export function readRunbookReference(file, version) {
  try {
    const fs = fsMod;
    const target = expandHome(file);
    if (!target) return null;
    if (!fs.existsSync(target)) return null;
    const text = fs.readFileSync(target, "utf8");
    const lines = text.split(/\r?\n/);
    const prefix = "## " + version;
    let idx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith(prefix)) { idx = i; break; }
    }
    if (idx === -1) return null;
    let end = lines.length;
    for (let j = idx + 1; j < lines.length; j++) {
      if (/^##\s+V[0-9]/.test(lines[j])) { end = j; break; }
    }
    const section = lines.slice(idx, Math.min(end, idx + 120));
    const title = section[0].replace(/^##\s+/, "").replace(/\s*✅\s*$/, "").trim();
    const picked = [];
    for (let k = 1; k < section.length && picked.length < 6; k++) {
      const line = section[k].trim();
      const numbered = line.match(/^\d+\.\s+(.*)$/);
      const bullet = line.match(/^[-*]\s+(.*)$/);
      const body = numbered ? numbered[1] : (bullet ? bullet[1] : "");
      if (!body) continue;
      const clean = stopHere(body);
      if (clean.length < 8) continue;
      picked.push({ text: clean, line: idx + k + 1 });
    }
    for (let m2 = idx; m2 < Math.min(end, idx + 120) && picked.length < 6; m2++) {
      const row = lines[m2].trim();
      if (row.indexOf("|") !== 0) continue;
      const cells = row.split("|").map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 0; });
      if (cells.length < 3) continue;
      if (/^[-:]+$/.test(cells[0])) continue;
      if (cells[0] === "层" || cells[0] === "检查" || cells[0] === "文件") continue;
      const clean = stopHere(cells[cells.length - 1]);
      if (clean.length < 10) continue;
      if (picked.some(function (p) { return p.text === clean; })) continue;
      picked.push({ text: clean, line: m2 + 1 });
    }
    return {
      sourceUrl: "file://" + target + "#L" + (idx + 1),
      file: target,
      version: version,
      title: title,
      lines: picked
    };
  } catch {
    return null;
  }
}

// ---------- 站点版本：线上端点 + 本地 version.json 双源一致性 ----------
async function readOnlineVersion(item) {
  const res = await fetch(item.url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!res.ok) {
    const err = new Error("HTTP " + res.status + " " + item.url);
    err.status = res.status;
    throw err;
  }
  const ctype = res.headers.get("content-type") || "";
  const body = await res.text();
  const looksJson = /json/i.test(ctype) || /\.json(\?|$)/i.test(item.url);
  let version = "";
  let extra = "";
  if (looksJson) {
    const j = JSON.parse(body);
    version = String(j[item.versionKey || "version"] || j.version || j.appVersion || "");
    extra = Object.keys(j).map(function (k) { return k + "=" + j[k]; }).join(" ");
  } else {
    const pattern = item.versionPattern || "[vV]\\d+\\.\\d+(?:\\.\\d+)?";
    const found = body.match(new RegExp(pattern, "g")) || [];
    version = found.length ? found.sort().pop() : "";
  }
  if (!version) throw new Error("站点源：线上端点没取到版本号（" + item.url + "）");
  return { version: version, extra: extra, raw: body.slice(0, 800), sourceUrl: item.url };
}

function readLocalVersion(item) {
  const local = item.local || {};
  const file = expandHome(local.file || "");
  if (!file) return { version: "", file: "", error: "没配 item.local.file" };
  try {
    if (!fsMod.existsSync(file)) return { version: "", file: file, error: "本地文件不存在" };
    const raw = fsMod.readFileSync(file, "utf8");
    const text = local.textMode ? raw : JSON.parse(raw);
    const version = local.textMode
      ? String((raw.match(local.versionPattern || "[vV]\\d+\\.\\d+(?:\\.\\d+)?") || [""])[0])
      : String(text[local.versionKey || "version"] || text.version || "");
    if (!version) return { version: "", file: file, error: "本地文件里没有版本号字段" };
    return { version: version, file: file, error: "" };
  } catch (e) {
    return { version: "", file: file, error: String(e && e.message ? e.message : e) };
  }
}

export function evaluateSiteGuard(onlineVersion, local) {
  if (!local || !local.version) {
    return {
      kind: "local-missing",
      online: onlineVersion,
      local: "",
      message: "读不到本地 version.json（" + ((local && local.error) || "未配置") + "）：无法确认代码里真有这一版，先别发"
    };
  }
  const cmp = compareVersions(local.version, onlineVersion);
  if (cmp === null) {
    return { kind: "unparsable", online: onlineVersion, local: local.version, message: "版本号无法比较：" + local.version + " vs " + onlineVersion };
  }
  if (cmp === 0) return null;
  if (cmp > 0) {
    return {
      kind: "pending-rollout",
      online: onlineVersion,
      local: local.version,
      message: "本地已是 " + local.version + "，线上还是 " + onlineVersion + "：部署还没到线上，不能当「已上线」发"
    };
  }
  return {
    kind: "online-newer",
    online: onlineVersion,
    local: local.version,
    message: "线上 " + onlineVersion + " 比本地 " + local.version + " 还新：你可能查错了仓库或分支，先核对再发"
  };
}

export async function siteCandidate(item, config) {
  if (!item.url) throw new SkipSource("站点源：url 空着", "URL_MISSING");
  const online = await readOnlineVersion(item);
  const local = readLocalVersion(item);
  const guard = evaluateSiteGuard(online.version, local);
  const targetVersion = guard && guard.kind === "pending-rollout" ? local.version : online.version;

  const humanUrl = item.link || item.siteUrl || "";
  const link = humanUrl || item.url;
  const label = config.brand.name || "Acme";
  const subject = label + " " + targetVersion;

  const facts = [
    makeFact({ id: "v1", kind: "version", value: targetVersion.replace(/^[vV]/, ""), detail: targetVersion, sourceUrl: item.url, sourceType: "site", sourceText: online.raw, verified: true })
  ];
  if (online.extra) {
    facts.push(makeFact({ id: "m1", kind: "source", value: "", detail: online.extra.slice(0, 140), sourceUrl: item.url, sourceType: "site", sourceText: online.raw, verified: true }));
  }
  if (local.version && local.version !== targetVersion) {
    facts.push(makeFact({ id: "v2", kind: "version", value: local.version.replace(/^[vV]/, ""), detail: local.version, sourceUrl: "file://" + local.file, sourceType: "site-local", verified: true }));
  }

  // 「改了什么」的唯一事实来源：releases.md
  const notesFiles = item.releaseNotesFiles || item.releaseNotesFile || config.releaseNotesFiles;
  const notes = notesFiles ? readReleaseNotes(notesFiles, targetVersion) : null;
  const noteBullets = notes ? notes.bullets.map(function (b) { return b.text; }) : [];
  const noteFactsUrl = notes ? notes.sourceUrl : "";
  if (notes) {
    facts.push(makeFact({ id: "n0", kind: "release-note", value: "", detail: notes.title || notes.heading, sourceUrl: noteFactsUrl, sourceType: "release-notes", sourceText: notes.title, verified: true }));
    notes.bullets.forEach(function (b, i) {
      facts.push(makeFact({ id: "n" + (i + 1), kind: "release-note", value: "", detail: b.text, sourceUrl: noteFactsUrl, sourceType: "release-notes", sourceText: b.text, verified: true }));
    });
  }

  const pendingList = notes
    ? []
    : ["功能点待补：releases.md 里没有 " + targetVersion + " 的条目（不许编，先补 release notes）"];

  const enBullets = noteBullets.length ? noteBullets.slice(0, 3) : [pending("功能点待补")];
  const zhBullets = noteBullets.length ? noteBullets.slice(0, 2) : [pending("功能点待补")];

  const en = [subject + " is out."].concat([
    enBullets.map(function (x) { return "· " + x; }).join("\n")
  ]).concat([link]).join("\n\n");
  const zh = [subject + " 已发布。"].concat([
    zhBullets.map(function (x) { return "· " + x; }).join("\n")
  ]).concat([link]).join("\n\n");

  const reference = item.referenceFile ? readRunbookReference(item.referenceFile, targetVersion) : null;
  if (reference) {
    reference.lines.forEach(function (x, i) {
      facts.push(makeFact({
        id: "r" + (i + 1), kind: "reference", value: "", detail: x.text,
        sourceUrl: reference.sourceUrl, sourceType: "reference", sourceText: x.text, verified: true
      }));
    });
  }

  return {
    reference: reference,
    guard: guard,
    sourceKey: "site:" + item.id + ":" + targetVersion,
    source: { kind: "site", label: item.label || item.url, url: humanUrl || item.url, version: targetVersion },
    title: subject,
    facts: facts,
    pending: pendingList,
    enText: en,
    zhText: zh,
    card: {
      title: label,
      subtitle: notes && notes.title ? String(notes.title).slice(0, 44) : (reference && reference.title ? String(reference.title).replace(/^V[0-9.]+\s*—\s*/, "").slice(0, 44) : ""),
      version: targetVersion,
      bullets: [],
      brand: config.brand
    }
  };
}