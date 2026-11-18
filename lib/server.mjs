// lib/server.mjs —— 本地工作台的 HTTP 层（只用 node 内置模块）
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import * as store from "./store.mjs";
import { copyText, finalizeDraft, composeManual } from "./compose.mjs";
import { weightedLength, stripMarkdown, TWEET_LIMIT } from "./weight.mjs";
import { findPending, validateTraceable, makeFact } from "./facts.mjs";
import { renderCard } from "./card.mjs";
import { runCollect } from "./collect.mjs";

const PUBLIC_DIR = path.join(store.ROOT, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function send(res, status, body, type) {
  const headers = {
    "content-type": type || "text/plain; charset=utf-8",
    "cache-control": "no-store"
  };
  res.writeHead(status, headers);
  res.end(body);
}

function json(res, status, obj) {
  send(res, status, JSON.stringify(obj), "application/json; charset=utf-8");
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on("data", function (c) {
      size += c.length;
      if (size > 4 * 1024 * 1024) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", function () { resolve(Buffer.concat(chunks).toString("utf8")); });
    req.on("error", reject);
  });
}

function serveFile(res, file) {
  try {
    const st = fs.statSync(file);
    if (!st.isFile()) return send(res, 404, "not found");
    const ext = path.extname(file).toLowerCase();
    send(res, 200, fs.readFileSync(file), MIME[ext] || "application/octet-stream");
  } catch {
    send(res, 404, "not found");
  }
}

function uniq(arr) {
  const seen = new Set();
  const out = [];
  (arr || []).forEach(function (x) {
    if (seen.has(x) || x === null || x === undefined) return;
    seen.add(x);
    out.push(x);
  });
  return out;
}

// 重新计算重量 / 溯源 / 占位符（编辑和渲染都用同一套）
function recompute(draft, config) {
  const limit = config.limits.tweet || TWEET_LIMIT;
  const en = stripMarkdown(draft.enText || "");
  const zh = stripMarkdown(draft.zhText || "");
  const traceEn = validateTraceable(en, draft.facts || []);
  const traceZh = validateTraceable(zh, draft.facts || []);
  const missing = uniq(traceEn.missing.concat(traceZh.missing));
  const blockers = missing.length
    ? [{ kind: "untraceable", detail: missing, hint: "这些数字/版本号在事实里找不到来源，禁止发布" }]
    : [];
  const base = draft.pendingBase || [];
  const bodyPending = uniq(findPending(en).concat(findPending(zh)));
  return {
    enText: en,
    zhText: zh,
    enWeight: weightedLength(en),
    zhWeight: weightedLength(zh),
    limit: limit,
    blockers: blockers,
    pending: uniq(base.concat(bodyPending.map(function (p) { return "正文占位：" + p; }))),
    warnings: (draft.warnings || []).filter(function (w) { return w.kind !== "truncated" && w.kind !== "voice"; })
  };
}

function stateSummary(config) {
  const drafts = store.listDrafts();
  const counts = { discovered: 0, drafted: 0, copied: 0, published: 0, discarded: 0 };
  drafts.forEach(function (d) { counts[d.status] = (counts[d.status] || 0) + 1; });
  const events = store.readEvents();
  const sources = Object.keys(config.sources || {}).map(function (kind) {
    return {
      kind: kind,
      items: (config.sources[kind] || []).map(function (it) {
        return {
          id: it.id, label: it.label || it.id, enabled: !!it.enabled,
          target: it.pkg || it.repo || it.url || it.query || "",
          note: it.note || ""
        };
      })
    };
  });
  return {
    counts: counts,
    total: drafts.length,
    postedCount: store.readPosted().length,
    lastCollectAt: events.lastCollectAt || null,
    sources: sources,
    brand: config.brand,
    limit: config.limits.tweet,
    dataDir: store.DRAFTS_DIR,
    mediaDir: store.MEDIA_DIR
  };
}

async function handleApi(req, res, url, config) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "drafts", id, ...]
  const method = req.method || "GET";

  if (parts[1] === "state" && method === "GET") {
    return json(res, 200, stateSummary(config));
  }

  if (parts[1] === "drafts" && parts.length === 2 && method === "GET") {
    const status = url.searchParams.get("status") || "";
    const sourceKind = url.searchParams.get("kind") || "";
    const list = store.listRows(function (d) {
      if (status && status !== "all" && d.status !== status) return false;
      if (sourceKind && d.source && d.source.kind !== sourceKind) return false;
      return true;
    });
    return json(res, 200, { drafts: list });
  }

  if (parts[1] === "drafts" && parts[2]) {
    const id = parts[2];
    const draft = store.getDraft(id);
    if (!draft) return json(res, 404, { error: "draft not found", id: id });

    if (parts.length === 3 && method === "GET") {
      return json(res, 200, draft);
    }

    if (parts[3] === "copy" && method === "GET") {
      const part = url.searchParams.get("part") || "en";
      if (draft.guard) return json(res, 409, { error: "guard", guard: draft.guard });
      const text = copyText(draft, part);
      return send(res, 200, text, "text/plain; charset=utf-8");
    }

    if (parts[3] === "render-card" && method === "POST") {
      const media = renderCard(draft.card, draft.id);
      draft.media = media;
      store.saveDraft(draft);
      return json(res, 200, { ok: true, media: media });
    }

    if (parts[3] === "status" && method === "POST") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const target = String(body.status || "");
      if (["copied", "published", "discarded", "drafted"].indexOf(target) === -1) {
        return json(res, 400, { error: "bad status", target: target });
      }
      if (draft.guard && (target === "published" || target === "copied")) {
        return json(res, 409, { error: "guard", guard: draft.guard });
      }
      const blockers = draft.blockers || [];
      const placeholders = uniq(findPending(draft.enText).concat(findPending(draft.zhText)));
      if (target === "published" && !body.override) {
        if (blockers.length) return json(res, 409, { error: "blocked", blockers: blockers });
        if (placeholders.length) return json(res, 409, { error: "pending", pending: placeholders });
      }
      const r = store.setStatus(draft, target, { note: body.note || "" });
      if (!r.ok) return json(res, 409, { error: r.code, from: r.from, to: r.to });
      return json(res, 200, { ok: true, draft: r.draft });
    }

    if (parts.length === 3 && method === "PATCH") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      if (typeof body.enText === "string") draft.enText = body.enText;
      if (typeof body.zhText === "string") draft.zhText = body.zhText;
      const re = recompute(draft, config);
      Object.assign(draft, re);
      draft.history = draft.history || [];
      draft.history.push({ at: new Date().toISOString(), event: "edited", note: "" });
      if (draft.status === "copied") draft.status = "drafted";
      store.saveDraft(draft);
      return json(res, 200, { ok: true, draft: draft });
    }
  }

  if (parts[1] === "weigh" && method === "POST") {
    const raw = await readBody(req);
    const body = raw ? JSON.parse(raw) : {};
    const clean = stripMarkdown(String(body.text || ""));
    return json(res, 200, { weight: weightedLength(clean), limit: config.limits.tweet || TWEET_LIMIT, text: clean });
  }

  if (parts[1] === "collect" && method === "POST") {
    const raw = await readBody(req);
    const body = raw ? JSON.parse(raw) : {};
    const results = await runCollect(config, { force: !!body.force });
    return json(res, 200, { ok: true, results: results });
  }

  if (parts[1] === "manual" && method === "POST") {
    const raw = await readBody(req);
    const body = raw ? JSON.parse(raw) : {};
    const cand = composeManual({ text: String(body.text || "") }, config);
    const fin = finalizeDraft(cand, config);
    const created = store.createDraft(fin, config, { force: !!body.force });
    if (created.created) {
      const media = renderCard(created.draft.card, created.draft.id);
      created.draft.media = media;
      store.saveDraft(created.draft);
    }
    return json(res, 200, { ok: true, created: created.created, draft: created.draft, reason: created.reason || "" });
  }

  return json(res, 404, { error: "no such api", path: url.pathname });
}

export function createServer(config) {
  return http.createServer(function (req, res) {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const p = url.pathname;

    if (p.indexOf("/api/") === 0) {
      handleApi(req, res, url, config).catch(function (e) {
        json(res, 500, { error: String(e && e.message ? e.message : e) });
      });
      return;
    }

    if (p === "/" || p === "/index.html") return serveFile(res, path.join(PUBLIC_DIR, "index.html"));
    if (p === "/app.js") return serveFile(res, path.join(PUBLIC_DIR, "app.js"));
    if (p === "/style.css") return serveFile(res, path.join(PUBLIC_DIR, "style.css"));
    if (p.indexOf("/media/") === 0) {
      const name = path.basename(p);
      return serveFile(res, path.join(store.MEDIA_DIR, name));
    }
    return send(res, 404, "not found");
  });
}