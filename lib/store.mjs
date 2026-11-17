// lib/store.mjs —— 磁盘存储：drafts/ 一份 json，state/ 管幂等与台账
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
// 测试用：XDD_DATA_DIR 可以把这个工作台的数据挪到临时目录，避免污染真实草稿
const DATA = process.env.XDD_DATA_DIR ? path.resolve(process.env.XDD_DATA_DIR) : ROOT;
export const DRAFTS_DIR = path.join(DATA, "drafts");
export const STATE_DIR = path.join(DATA, "state");
export const MEDIA_DIR = path.join(DATA, "media");
export const EVENTS_FILE = path.join(STATE_DIR, "events.json");
export const POSTED_FILE = path.join(STATE_DIR, "posted.jsonl");
export const CONFIG_FILE = path.join(ROOT, "config.json");

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

export function loadConfig() {
  const cfg = readJson(CONFIG_FILE, null);
  if (!cfg) throw new Error("config.json 读取失败：" + CONFIG_FILE);
  return cfg;
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