// lib/web-api.mjs —— 侧栏面板用的宿主侧 HTTP 接口（挂在 DSH 的 webServer 上）
// 复用 lib/tools.mjs / lib/store.mjs，逻辑与 4789 网页工作台、CLI 完全一致。
import { loadConfig, listRows, getDraft, setStatus, updateDraftText } from "./store.mjs";
import { buildRewritePrompt, tonesFrom, toneLabel } from "./rewrite.mjs";
import { copyText } from "./compose.mjs";
import { postMarkPosted } from "./tools.mjs";

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(text);
}

function text(res, status, body, type) {
  res.writeHead(status, { "content-type": (type || "text/plain") + "; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  if (!req || typeof req.on !== "function") return "";
  await new Promise(function (resolve) {
    req.on("data", function (c) { chunks.push(c); });
    req.on("end", resolve);
    req.on("error", resolve);
  });
  return Buffer.concat(chunks).toString("utf8");
}

// 面板列表：只要轻量字段（不含正文），正文按需走 copy 接口
export function listPayload() {
  const rows = listRows(function (d) { return d.status !== "discarded"; });
  return { ok: true, total: rows.length, drafts: rows };
}

// 面板用：编辑 / 语气列表 / 重写指令
export function draftPayload(draft) {
  return {
    id: draft.id,
    title: draft.title,
    status: draft.status,
    generatedBy: draft.generatedBy === "model" ? "model" : "template",
    edited: !!draft.manualEdit,
    enText: draft.enText,
    zhText: draft.zhText,
    enWeight: draft.enWeight,
    zhWeight: draft.zhWeight,
    limit: draft.limit,
    pending: draft.pending || [],
    guard: draft.guard ? draft.guard.kind : null,
    history: draft.history || []
  };
}

export function routes() {
  return [
    {
      kind: "exact",
      path: "/post-draft/list",
      handler: function (req, res) {
        try { json(res, 200, listPayload()); }
        catch (e) { json(res, 500, { ok: false, error: String(e && e.message ? e.message : e) }); }
      }
    },
    {
      kind: "exact",
      path: "/post-draft/copy",
      handler: function (req, res) {
        try {
          const u = new URL(req.url || "/", "http://127.0.0.1");
          const id = u.searchParams.get("id") || "";
          const part = u.searchParams.get("part") || "en";
          const draft = id ? getDraft(id) : null;
          if (!draft) return json(res, 404, { ok: false, error: "draft not found" });
          if (draft.guard) return json(res, 409, { ok: false, error: "guard", guard: draft.guard });
          const body = copyText(draft, part);
          if (!body) return json(res, 400, { ok: false, error: "empty part" });
          text(res, 200, body);
        } catch (e) {
          json(res, 500, { ok: false, error: String(e && e.message ? e.message : e) });
        }
      }
    },
    {
      kind: "exact",
      path: "/post-draft/draft",
      handler: async function (req, res) {
        try {
          const method = String(req.method || "GET").toUpperCase();
          if (method === "GET") {
            const u = new URL(req.url || "/", "http://127.0.0.1");
            const draft = getDraft(u.searchParams.get("id") || "");
            if (!draft) return json(res, 404, { ok: false, error: "draft not found" });
            return json(res, 200, { ok: true, draft: draftPayload(draft) });
          }
          if (method !== "PUT") return json(res, 405, { ok: false, error: "method not allowed" });
          const raw = await readBody(req);
          let body = {};
          try { body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(res, 400, { ok: false, error: "bad json" }); }
          if (!body.id) return json(res, 400, { ok: false, error: "id required" });
          const result = updateDraftText(body.id, { en: body.en, zh: body.zh }, loadConfig());
          if (!result.ok) {
            const status = result.code === "not_found" ? 404 : result.code === "guard" ? 409 : 422;
            return json(res, status, {
              ok: false,
              error: result.code,
              guard: result.guard || null,
              enWeight: result.enWeight,
              zhWeight: result.zhWeight,
              limit: result.limit
            });
          }
          return json(res, 200, {
            ok: true,
            draft: draftPayload(result.draft),
            enWeight: result.enWeight,
            zhWeight: result.zhWeight,
            limit: result.limit,
            unchanged: !!result.unchanged
          });
        } catch (e) {
          json(res, 500, { ok: false, error: String(e && e.message ? e.message : e) });
        }
      }
    },
    {
      kind: "exact",
      path: "/post-draft/tones",
      handler: function (req, res) {
        try {
          const config = loadConfig();
          const tones = tonesFrom(config).map(function (tone) {
            return { id: tone.id, label: tone.label, labelEn: tone.labelEn };
          });
          json(res, 200, { ok: true, tones: tones });
        } catch (e) {
          json(res, 500, { ok: false, error: String(e && e.message ? e.message : e) });
        }
      }
    },
    {
      kind: "exact",
      path: "/post-draft/rewrite-prompt",
      handler: function (req, res) {
        try {
          const u = new URL(req.url || "/", "http://127.0.0.1");
          const draft = getDraft(u.searchParams.get("id") || "");
          if (!draft) return json(res, 404, { ok: false, error: "draft not found" });
          if (draft.guard) return json(res, 409, { ok: false, error: "guard", guard: draft.guard });
          const config = loadConfig();
          const lang = u.searchParams.get("lang") === "en" ? "en" : "zh";
          const toneId = u.searchParams.get("tone") || "";
          const tone = tonesFrom(config).filter(function (x) { return x.id === toneId; })[0] || tonesFrom(config)[0];
          const prompt = buildRewritePrompt(draft, config, tone.id, lang);
          text(res, 200, prompt);
        } catch (e) {
          json(res, 500, { ok: false, error: String(e && e.message ? e.message : e) });
        }
      }
    },
    {
      kind: "exact",
      path: "/post-draft/mark-posted",
      handler: async function (req, res) {
        try {
          const raw = await readBody(req);
          const body = raw ? JSON.parse(raw) : {};
          if (!body.id) return json(res, 400, { ok: false, error: "id required" });
          const draft = getDraft(body.id);
          if (!draft) return json(res, 404, { ok: false, error: "draft not found" });
          if (draft.guard && draft.status !== "published") {
            return json(res, 409, { ok: false, error: "guard", guard: draft.guard });
          }
          const r = postMarkPosted({ id: body.id, note: body.note || "" });
          if (!r.ok) return json(res, 409, { ok: false, error: r.code || "refused", from: r.from, to: r.to });
          json(res, 200, { ok: true, id: r.id, status: r.status, publishedAt: r.publishedAt });
        } catch (e) {
          json(res, 500, { ok: false, error: String(e && e.message ? e.message : e) });
        }
      }
    }
  ];
}

export const ROUTE_PATHS = ["/post-draft/list", "/post-draft/copy", "/post-draft/mark-posted"];