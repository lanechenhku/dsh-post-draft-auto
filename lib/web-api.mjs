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
// draft id 缺失/非法时给 400，而不是让 store 抛异常变成 500
function missingId(res) {
  return json(res, 400, { ok: false, error: "missing-id", message: "缺 draftId（?id=... 或 body.id）" });
}

function findDraftSafe(id) {
  if (!id) return null;
  try { return getDraft(String(id)) || null; } catch (e) { return null; }
}

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

export function routes(host) {
  // 宿主能力（sessionController）通过 getter 注入；单测没有宿主时相关路由回 503
  const getController = function () {
    try {
      return host && typeof host.getController === "function" ? host.getController() : undefined;
    } catch (e) { return undefined; }
  };
  const sent = new Map();

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
            const id = u.searchParams.get("id") || "";
            if (!id) return missingId(res);
            const draft = findDraftSafe(id);
            if (!draft) return json(res, 404, { ok: false, error: "draft-not-found", message: "没有这条草稿：" + id });
            return json(res, 200, { ok: true, draft: draftPayload(draft) });
          }
          // PUT 是语义首选；DSH 宿主的 webServer 只保证 GET/POST 转发，所以 POST 同样接受（客户端用 POST）
          if (method !== "PUT" && method !== "POST") return json(res, 405, { ok: false, error: "method not allowed" });
          const raw = await readBody(req);
          let body = {};
          try { body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(res, 400, { ok: false, error: "bad json" }); }
          if (!body.id) return missingId(res);
          if (!findDraftSafe(body.id)) return json(res, 404, { ok: false, error: "draft-not-found", message: "没有这条草稿：" + body.id });
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
          const promptId = u.searchParams.get("id") || "";
          if (!promptId) return missingId(res);
          const draft = findDraftSafe(promptId);
          if (!draft) return json(res, 404, { ok: false, error: "draft-not-found", message: "没有这条草稿：" + promptId });
          if (draft.guard) return json(res, 409, { ok: false, error: "guard", guard: draft.guard });
          const config = loadConfig();
          const lang = u.searchParams.get("lang") === "en" ? "en" : "zh";
          const toneId = u.searchParams.get("tone") || "";
          const tone = tonesFrom(config).filter(function (x) { return x.id === toneId; })[0] || tonesFrom(config)[0];
          const flags = function (name, dflt) {
            const raw = u.searchParams.get(name);
            if (raw === null) return dflt;
            return !(raw === "0" || raw === "false" || raw === "off");
          };
          const prompt = buildRewritePrompt(draft, config, tone.id, lang, {
            facts: flags("facts", true),
            voice: flags("voice", true)
          });
          text(res, 200, prompt);
        } catch (e) {
          json(res, 500, { ok: false, error: String(e && e.message ? e.message : e) });
        }
      }
    },
    {
      kind: "exact",
      path: "/post-draft/target",
      handler: async function (req, res) {
        const controller = getController();
        if (!controller || typeof controller.list !== "function") {
          return json(res, 503, { ok: false, error: "host-unavailable", message: "sessionController 不在当前 DSH 版本里" });
        }
        try {
          const listed = await controller.list({});
          const items = (listed && Array.isArray(listed.items)) ? listed.items : [];
          const usable = items.filter(function (item) {
            return item && item.sessionId && item.origin !== "subagent";
          });
          const target = usable[0];
          if (!target) return json(res, 200, { ok: true, session: null });
          return json(res, 200, {
            ok: true,
            source: "recent",
            session: {
              sessionId: target.sessionId,
              short: String(target.sessionId).slice(0, 8),
              cwd: target.cwd || null,
              running: !!target.running,
              updatedAt: target.updatedAt || null
            }
          });
        } catch (e) {
          return json(res, 502, { ok: false, error: "list-failed", message: String(e && e.message ? e.message : e) });
        }
      }
    },
    {
      kind: "exact",
      path: "/post-draft/send-prompt",
      handler: async function (req, res) {
        try {
          const method = String(req.method || "GET").toUpperCase();
          if (method !== "POST") return json(res, 405, { ok: false, error: "method not allowed" });
          const raw = await readBody(req);
          let body = {};
          try { body = raw ? JSON.parse(raw) : {}; } catch (e) { return json(res, 400, { ok: false, error: "bad json" }); }
          if (!body.id) return missingId(res);
          const draft = findDraftSafe(body.id);
          if (!draft) return json(res, 404, { ok: false, error: "draft-not-found", message: "没有这条草稿：" + body.id });
          if (draft.guard) return json(res, 409, { ok: false, error: "guard", guard: draft.guard });

          const requestId = String(body.requestId || "");
          if (requestId && sent.has(requestId)) {
            const previous = sent.get(requestId);
            return json(res, 200, Object.assign({ ok: true, duplicate: true }, previous));
          }

          const controller = getController();
          if (!controller || typeof controller.prompt !== "function") {
            return json(res, 503, { ok: false, error: "host-unavailable", message: "sessionController 不在当前 DSH 版本里" });
          }

          const config = loadConfig();
          const lang = body.lang === "en" ? "en" : "zh";
          const toneId = body.tone || "";
          const prompt = buildRewritePrompt(draft, config, toneId, lang, {
            facts: body.facts !== false,
            voice: body.voice !== false
          });

          let sessionId = String(body.sessionId || "");
          if (!sessionId) {
            const listed = await controller.list({});
            const items = (listed && Array.isArray(listed.items)) ? listed.items : [];
            const target = items.filter(function (item) {
              return item && item.sessionId && item.origin !== "subagent";
            })[0];
            if (!target) return json(res, 409, { ok: false, error: "no-session" });
            sessionId = target.sessionId;
          }

          const mode = body.mode === "steer" ? "steer" : "queue";
          const modeText = lang === "en" ? mode : (mode === "steer" ? "插入" : "排队");
          const text = "[出稿面板] 重写 " + draft.id + "（" + modeText + "）\n\n" + prompt;
          // 宿主 SessionController.prompt(request, signal)：source 由宿主按 requestId 建成 user/rpcId
          const abort = typeof AbortController === "function" ? new AbortController() : undefined;
          const ack = await controller.prompt({
            sessionId: sessionId,
            requestId: requestId || ("post-draft-" + draft.id + "-" + Date.now()),
            mode: mode,
            content: [{ type: "text", text: text }]
          }, abort ? abort.signal : { throwIfAborted: function () {} });
          if (!ack || ack.accepted !== true) {
            return json(res, 502, { ok: false, error: "rejected", message: "sessionController 没有接受这条 prompt" });
          }
          const result = {
            sessionId: sessionId,
            short: String(sessionId).slice(0, 8),
            mode: mode,
            requestId: requestId || null
          };
          if (requestId) sent.set(requestId, result);
          return json(res, 200, Object.assign({ ok: true }, result));
        } catch (e) {
          const code = (e && (e.code || e.name)) || "send-failed";
          return json(res, 502, { ok: false, error: "send-failed", code: String(code), message: String(e && e.message ? e.message : e) });
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

// 由 routes() 派生，避免新增路由忘记登记（tests 里会比对两者）
export const ROUTE_PATHS = routes().map(function (route) { return route.path; });