// lib/store.mjs —— 磁盘存储：drafts/ 一份 json，state/ 管幂等与台账
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { weightedLength } from "./weight.mjs";

export const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
// 测试用：XDD_DATA_DIR 可以把这个工作台的数据挪到临时目录，避免污染真实草稿
const DATA = process.env.XDD_DATA_DIR ? path.resolve(process.env.XDD_DATA_DIR) : ROOT;
export const DRAFTS_DIR = path.join(DATA, "drafts");
export const STATE_DIR = path.join(DATA, "state");
export const MEDIA_DIR = path.join(DATA, "media");
export const EVENTS_FILE = path.join(STATE_DIR, "events.json");
export const POSTED_FILE = path.join(STATE_DIR, "posted.jsonl");
export const CONFIG_FILE = path.join(ROOT, "config.json");
// 本机私有覆盖层：存在就深合并到 config.json 之上；它被 .gitignore 排除，绝不进版本库
export const CONFIG_LOCAL_FILE = process.env.XDD_CONFIG_LOCAL_FILE
  ? path.resolve(process.env.XDD_CONFIG_LOCAL_FILE)
  : path.join(ROOT, "config.local.json");

export const STATUSES = ["discovered", "drafted", "copied", "published", "discarded"];

export function ensureDirs() {
  [DRAFTS_DIR, STATE_DIR, MEDIA_DIR].forEach(function (d) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJsonAtomic(file, obj) {
  const tmp = file + ".tmp-" + process.pid + "-" + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

export function appendJsonl(file, obj) {
  fs.appendFileSync(file, JSON.stringify(obj) + "\n", "utf8");
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// 数组规则：
//  - 两边都是「对象数组」→ 按 index 深合并（可只写 config.local.json 里的 sources.site[0].url）
//  - 任一边含原始值（字符串/数字/bool）→ 整体替换（避免 banned/releaseNotesFiles 这类列表被逐位覆盖）
//  - 想强制整体替换对象数组时，把值写成 {"$replace": [...]}
function mergeArrays(base, local) {
  const allObjects = base.every(isPlainObject) && local.every(isPlainObject);
  if (!allObjects) return local.slice();
  const out = base.slice();
  local.forEach(function (item, i) {
    out[i] = isPlainObject(item) && isPlainObject(out[i]) ? mergeConfig(out[i], item) : item;
  });
  return out;
}

export function mergeConfig(base, local) {
  if (!isPlainObject(local)) return local;
  const out = Object.assign({}, base);
  Object.keys(local).forEach(function (key) {
    // 允许写 $comment / $note 之类的说明键，它们不参与配置
    if (key.charAt(0) === "$" && key !== "$replace") return;
    const raw = local[key];
    const replace = isPlainObject(raw) && Object.prototype.hasOwnProperty.call(raw, "$replace");
    const value = replace ? raw.$replace : raw;
    const current = out[key];
    if (replace) {
      out[key] = value;
    } else if (isPlainObject(value) && isPlainObject(current)) {
      out[key] = mergeConfig(current, value);
    } else if (Array.isArray(value) && Array.isArray(current)) {
      out[key] = mergeArrays(current, value);
    } else {
      out[key] = value;
    }
  });
  return out;
}

export function loadConfig() {
  const cfg = readJson(CONFIG_FILE, null);
  if (!cfg) throw new Error("config.json 读取失败：" + CONFIG_FILE);
  if (!fs.existsSync(CONFIG_LOCAL_FILE)) return cfg;
  let local;
  try {
    local = JSON.parse(fs.readFileSync(CONFIG_LOCAL_FILE, "utf8"));
  } catch (e) {
    throw new Error("config.local.json 解析失败（" + CONFIG_LOCAL_FILE + "）：" + (e && e.message ? e.message : e));
  }
  return mergeConfig(cfg, local);
}

export function sha1(s) {
  return crypto.createHash("sha1").update(String(s)).digest("hex");
}

// sourceKey 稳定 → id 稳定 → 同一来源只会有一个草稿文件
export function idForSourceKey(sourceKey) {
  return "d-" + sha1(sourceKey).slice(0, 10);
}

export function draftFile(id) {
  if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error("bad draft id: " + id);
  return path.join(DRAFTS_DIR, id + ".json");
}

export function getDraft(id) {
  return readJson(draftFile(id), null);
}

export function listDrafts() {
  ensureDirs();
  const files = fs.readdirSync(DRAFTS_DIR).filter(function (f) { return f.endsWith(".json"); });
  const out = [];
  files.forEach(function (f) {
    const d = readJson(path.join(DRAFTS_DIR, f), null);
    if (d && d.id) out.push(d);
  });
  out.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  return out;
}

// 列表行：/api/drafts 与 /post-draft/list 共用这一份，字段集中在这里，别在每个路由里手抄
export function draftRow(d) {
  const pending = Array.isArray(d.pending) ? d.pending.slice() : [];
  const blockers = Array.isArray(d.blockers) ? d.blockers : [];
  const blockerKinds = blockers
    .map(function (b) { return typeof b === "string" ? b : (b && b.kind) || ""; })
    .filter(function (k) { return !!k; });
  return {
    id: d.id,
    title: d.title,
    status: d.status,
    sourceKey: d.sourceKey,
    source: d.source || null,
    generatedBy: d.generatedBy === "model" ? "model" : "template",
    edited: !!(d.manualEdit),
    editedAt: d.editedAt || null,
    enWeight: d.enWeight,
    zhWeight: d.zhWeight,
    limit: d.limit,
    pending: pending,
    pendingCount: pending.length,
    blockers: blockerKinds,
    blockerCount: blockerKinds.length,
    guard: d.guard ? d.guard.kind : null,
    media: d.media || null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
  };
}

export function listRows(filter) {
  return listDrafts()
    .filter(function (d) { return typeof filter === "function" ? filter(d) : true; })
    .map(draftRow);
}

export function findBySourceKey(sourceKey) {
  const all = listDrafts();
  for (let i = 0; i < all.length; i++) if (all[i].sourceKey === sourceKey) return all[i];
  return null;
}

export function findSourceDraft(sourceKey) {
  return findBySourceKey(sourceKey);
}

export function saveDraft(draft) {
  ensureDirs();
  draft.updatedAt = new Date().toISOString();
  writeJsonAtomic(draftFile(draft.id), draft);
  return draft;
}

export function readEvents() {
  const s = readJson(EVENTS_FILE, null);
  if (s && s.events) return s;
  return { version: 1, events: {}, lastCollectAt: null };
}

export function saveEvents(state) {
  ensureDirs();
  writeJsonAtomic(EVENTS_FILE, state);
}

export function setEvent(sourceKey, patch) {
  const st = readEvents();
  const prev = st.events[sourceKey] || { firstSeen: new Date().toISOString(), status: "discovered" };
  st.events[sourceKey] = Object.assign({}, prev, patch, { updatedAt: new Date().toISOString() });
  if (!st.events[sourceKey].firstSeen) st.events[sourceKey].firstSeen = new Date().toISOString();
  saveEvents(st);
  return st.events[sourceKey];
}

export function getEvent(sourceKey) {
  const st = readEvents();
  return st.events[sourceKey] || null;
}

export function readPosted() {
  try {
    const txt = fs.readFileSync(POSTED_FILE, "utf8").trim();
    if (!txt) return [];
    return txt.split("\n").map(function (l) { return JSON.parse(l); });
  } catch {
    return [];
  }
}

const ALLOWED = {
  discovered: ["drafted", "discarded"],
  drafted: ["copied", "published", "discarded"],
  copied: ["published", "discarded", "drafted"],
  published: [],
  discarded: []
};

export function canTransition(from, to) {
  const a = ALLOWED[from] || [];
  return a.indexOf(to) !== -1;
}

export function setStatus(draftOrId, status, meta) {
  const id = typeof draftOrId === "string" ? draftOrId : draftOrId.id;
  const draft = getDraft(id);
  if (!draft) return { ok: false, code: "not_found" };
  if (draft.status === status) return { ok: true, draft: draft, unchanged: true };
  if (!canTransition(draft.status, status)) {
    return { ok: false, code: "bad_transition", from: draft.status, to: status };
  }
  const from = draft.status;
  draft.status = status;
  draft.history = draft.history || [];
  draft.history.push({
    at: new Date().toISOString(),
    event: from + " -> " + status,
    note: (meta && meta.note) || ""
  });
  if (status === "published") {
    draft.publishedAt = new Date().toISOString();
    saveDraft(draft);
    appendJsonl(POSTED_FILE, {
      at: draft.publishedAt,
      draftId: draft.id,
      sourceKey: draft.sourceKey,
      source: draft.source,
      enText: draft.enText,
      zhText: draft.zhText,
      enWeight: draft.enWeight,
      zhWeight: draft.zhWeight,
      textHash: sha1(draft.enText + "\u0000" + draft.zhText),
      card: draft.card,
      note: (meta && meta.note) || ""
    });
  } else {
    saveDraft(draft);
  }
  setEvent(draft.sourceKey, { status: status, draftId: draft.id });
  return { ok: true, draft: draft, from: from };
}

// 手动编辑：重算计权、超限拒绝、往 history 追一条 manual edit
export function updateDraftText(id, patch, config) {
  const draft = getDraft(id);
  if (!draft) return { ok: false, code: "not_found" };
  if (draft.guard) return { ok: false, code: "guard", guard: draft.guard };
  const limit = (config && config.limits && config.limits.tweet) || 280;
  const nextEn = patch && patch.en !== undefined ? String(patch.en) : String(draft.enText || "");
  const nextZh = patch && patch.zh !== undefined ? String(patch.zh) : String(draft.zhText || "");
  const enWeight = weightedLength(nextEn);
  const zhWeight = weightedLength(nextZh);
  if (enWeight > limit || zhWeight > limit) {
    return { ok: false, code: "too_long", enWeight: enWeight, zhWeight: zhWeight, limit: limit };
  }
  if (nextEn === draft.enText && nextZh === draft.zhText) {
    return { ok: true, draft: draft, unchanged: true, enWeight: enWeight, zhWeight: zhWeight, limit: limit };
  }
  const now = new Date().toISOString();
  draft.enText = nextEn;
  draft.zhText = nextZh;
  draft.enWeight = enWeight;
  draft.zhWeight = zhWeight;
  draft.manualEdit = true;
  draft.editedAt = now;
  draft.updatedAt = now;
  draft.history = draft.history || [];
  draft.history.push({ at: now, event: "manual edit", note: "EN " + enWeight + "/" + limit + " · ZH " + zhWeight + "/" + limit });
  saveDraft(draft);
  return { ok: true, draft: draft, enWeight: enWeight, zhWeight: zhWeight, limit: limit };
}

export function createDraft(candidate, config, opts) {
  ensureDirs();
  const options = opts || {};
  const existing = findBySourceKey(candidate.sourceKey);
  if (existing && !options.force) {
    return { created: false, draft: existing, reason: "same source_key already has a draft (" + existing.status + ")" };
  }
  const id = existing ? existing.id : (candidate.sourceKey.indexOf("manual:") === 0
    ? "manual-" + new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    : idForSourceKey(candidate.sourceKey));
  const now = new Date().toISOString();
  const draft = {
    id: id,
    sourceKey: candidate.sourceKey,
    source: candidate.source,
    title: candidate.title || "",
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
    status: "drafted",
    generatedBy: candidate.generatedBy || "template",
    modelNotes: candidate.modelNotes || "",
    enText: candidate.enText,
    zhText: candidate.zhText,
    enWeight: candidate.enWeight,
    zhWeight: candidate.zhWeight,
    limit: config.limits.tweet,
    card: candidate.card,
    facts: candidate.facts,
    reference: candidate.reference || null,
    guard: candidate.guard || null,
    pending: candidate.pending,
    pendingBase: candidate.pending,
    blockers: candidate.blockers,
    warnings: candidate.warnings,
    media: candidate.media || null,
    history: (existing ? existing.history : []).concat([{ at: now, event: "created", note: candidate.sourceKey }])
  };
  saveDraft(draft);
  setEvent(candidate.sourceKey, {
    status: "drafted",
    draftId: id,
    title: draft.title,
    firstSeen: now
  });
  return { created: true, draft: draft };
}
// 源重新评估后用新结果刷新草稿：guard 变了就必须刷新（部署完成后要解封）
export function applyRegen(draft, fin, textToo) {
  if (textToo) {
    draft.enText = fin.enText;
    draft.zhText = fin.zhText;
    draft.enWeight = fin.enWeight;
    draft.zhWeight = fin.zhWeight;
    draft.facts = fin.facts;
    draft.pending = fin.pending;
    draft.pendingBase = fin.pending;
    draft.blockers = fin.blockers;
    draft.warnings = fin.warnings;
    draft.reference = fin.reference || draft.reference || null;
    draft.card = Object.assign({}, draft.card, {
      title: fin.card.title,
      subtitle: fin.card.subtitle,
      version: fin.card.version,
      bullets: fin.card.bullets
    });
  }
  const prevGuard = draft.guard ? draft.guard.kind : null;
  draft.guard = fin.guard || null;
  const nextGuard = draft.guard ? draft.guard.kind : null;
  if (prevGuard !== nextGuard) {
    draft.history = draft.history || [];
    draft.history.push({
      at: new Date().toISOString(),
      event: "guard-changed",
      note: (prevGuard || "ok") + " -> " + (nextGuard || "ok")
    });
  }
  saveDraft(draft);
  setEvent(draft.sourceKey, { status: draft.status, draftId: draft.id, guard: nextGuard });
  return draft;
}