// lib/plugin.mjs —— DSH 宿主插件（cordis）
// 注册四个模型可见工具：post_facts / post_save / post_list / post_mark_posted
// 与 bin/post-tool.mjs 共用 lib/tools.mjs，逻辑只有一份。
import { postFacts, postSave, postList, postMarkPosted } from "./tools.mjs";
import { routes } from "./web-api.mjs";

/** 稳定 cordis 插件名 */
export const name = "post-draft-auto";
/** 需要的服务：tools（工具注册）+ systemPrompt（给模型的公告） */
export const inject = ["tools", "systemPrompt", "webServer"];

function text(value) {
  return [{ type: "text", text: String(value) }];
}

const GUIDANCE = "本机已装 dsh-post-draft-auto（出稿工作台）：用户说「我发了 X」时，先用 post_facts 抓真实事实（DOI/版本/npm/URL/一句话），" +
  "然后由你自己写 EN 主推 + ZH 回复 + 卡片文案，再用 post_save 落盘；post_list 看列表，post_mark_posted 标记已发。" +
  "硬规则：正文里出现的版本号/日期/百分数/作者名必须来自 post_facts 返回的 facts（每条带 source_url），抽不到就写「待补」并在 pending 里说明，不要编。" +
  "没有 X Premium：单条 ≤280 计权字符，CJK 按 2 计权（中文约 140 字）。工具不会发推，发布由用户手动复制粘贴。";

const postFactsTool = {
  name: "post_facts",
  description: "Gather real, traceable facts for a post: bioRxiv/medRxiv DOI, Acme version, npm package, any URL, or a user sentence. Every fact carries a source_url. Call this BEFORE writing any post text.",
  parameters: {
    type: "object",
    properties: {
      doi: { type: "string", description: "bioRxiv/medRxiv DOI, e.g. 10.1101/2021.09.08.459436" },
      server: { type: "string", description: "biorxiv | medrxiv (optional, inferred from DOI)" },
      author: { type: "string", description: "Your own name as printed in the paper, for author matching (optional)" },
      version: { type: "string", description: "Acme version like v1.2.3 (reads version.json + releases.md)" },
      pkg: { type: "string", description: "npm package name" },
      url: { type: "string", description: "Any page URL" },
      text: { type: "string", description: "A user sentence, e.g. 我刚发了 Acme v1.1.0" }
    }
  },
  output: {
    schema: {
      type: "object",
      properties: {
        kind: { type: "string" },
        sourceKey: { type: "string" },
        title: { type: "string" },
        facts: { type: "array", items: { type: "object" } },
        hints: { type: "array", items: { type: "string" } },
        error: { type: "string" }
      }
    },
    render: (_a, v) => {
      if (v.error) return text("error: " + v.error);
      const lines = ["kind: " + v.kind, "sourceKey: " + v.sourceKey, "title: " + v.title, "facts:"];
      (v.facts || []).forEach(function (f) {
        lines.push("  [" + f.kind + "] " + String(f.detail || f.value) + "  <- " + f.sourceUrl);
      });
      (v.hints || []).forEach(function (h) { lines.push("hint: " + h); });
      return text(lines.join("\n"));
    }
  },
  timeoutMs: 60000,
  async execute(args) {
    try {
      return await postFacts(args);
    } catch (e) {
      return { error: String(e && e.message ? e.message : e) };
    }
  }
};

const postSaveTool = {
  name: "post_save",
  description: "Save a model-written draft (EN main post + ZH reply + card copy) to the local workbench so it shows up in the draft list. Requires facts from post_facts. Weights are computed and enforced here.",
  parameters: {
    type: "object",
    properties: {
      sourceKey: { type: "string", description: "From post_facts (dedupe key; same key never drafts twice)" },
      title: { type: "string" },
      source: { type: "object", description: "From post_facts" },
      facts: { type: "array", items: { type: "object" }, description: "Echo the facts array from post_facts" },
      en: { type: "string", description: "English main post text (plain text, no markdown)" },
      zh: { type: "string", description: "Chinese reply text (plain text)" },
      card: {
        type: "object",
        description: "Card image copy: {title, subtitle, version, bullets[]}",
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          version: { type: "string" },
          bullets: { type: "array", items: { type: "string" } }
        }
      },
      pending: { type: "array", items: { type: "string" }, description: "Things you could not verify; the draft shows them as 待补" },
      notes: { type: "string", description: "Optional: why you wrote it this way" }
    },
    required: ["en", "zh", "facts"]
  },
  output: {
    schema: {
      type: "object",
      properties: {
        ok: { type: "boolean" },
        draftId: { type: "string" },
        enWeight: { type: "integer" },
        zhWeight: { type: "integer" },
        pending: { type: "array", items: { type: "string" } },
        blockers: { type: "array", items: { type: "object" } },
        file: { type: "string" },
        error: { type: "string" }
      }
    },
    render: (_a, v) => {
      if (v.error) return text("error: " + v.error);
      if (!v.ok) return text("saved: false — " + (v.reason || "duplicate"));
      return text("draft: " + v.draftId + "\nEN " + v.enWeight + "/280 · ZH " + v.zhWeight +
        "/280\nfile: " + v.file + "\npending: " + (v.pending || []).length +
        "\nblockers: " + (v.blockers || []).length +
        ((v.pending || []).length ? "\n" + v.pending.map(function (p) { return "  - " + p; }).join("\n") : ""));
    }
  },
  timeoutMs: 60000,
  async execute(args) {
    try {
      return await postSave(args);
    } catch (e) {
      return { error: String(e && e.message ? e.message : e) };
    }
  }
};

const postListTool = {
  name: "post_list",
  description: "List draft posts in the local workbench (id, status, generatedBy, weights, pending, guard).",
  parameters: {
    type: "object",
    properties: {
      status: { type: "string", description: "drafted | copied | published | discarded (optional)" }
    }
  },
  output: {
    schema: { type: "object", properties: { total: { type: "integer" }, drafts: { type: "array", items: { type: "object" } } } },
    render: (_a, v) => {
      const lines = ["drafts: " + v.total];
      (v.drafts || []).forEach(function (d) {
        lines.push("  " + d.id + "  " + d.status + "  " + (d.generatedBy || "template") +
          "  " + d.enWeight + "/" + d.zhWeight + "  " +
          ((d.pending || 0) + " 待补") + (d.guard ? "  GUARD:" + d.guard : "") + "  " + d.title);
      });
      return text(lines.join("\n"));
    }
  },
  timeoutMs: 30000,
  async execute(args) {
    try {
      return postList(args);
    } catch (e) {
      return { total: 0, drafts: [], error: String(e && e.message ? e.message : e) };
    }
  }
};

const postMarkPostedTool = {
  name: "post_mark_posted",
  description: "Mark a draft as published (after the human pasted it into X). Appends to the local posted.jsonl ledger; refuses when a guard is active.",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "Draft id from post_list / post_save" },
      note: { type: "string", description: "Optional note, e.g. the X post URL" }
    },
    required: ["id"]
  },
  output: {
    schema: { type: "object", properties: { ok: { type: "boolean" }, id: { type: "string" }, status: { type: "string" }, code: { type: "string" } } },
    render: (_a, v) => text(v.ok ? "marked posted: " + v.id : "refused: " + (v.code || "unknown"))
  },
  timeoutMs: 30000,
  async execute(args) {
    try {
      return postMarkPosted(args);
    } catch (e) {
      return { ok: false, code: "error", error: String(e && e.message ? e.message : e) };
    }
  }
};

export function apply(ctx) {
  const tools = [postFactsTool, postSaveTool, postListTool, postMarkPostedTool];
  ctx.effect(() => {
    const disposers = tools.map(function (t) { return ctx.tools.register(t); });
    return () => { disposers.forEach(function (d) { d(); }); };
  }, "dsh-post-draft-auto: tools");
  ctx.effect(() => ctx.systemPrompt.section({
    name: "plugin:dsh-post-draft-auto",
    order: 170,
    text: GUIDANCE
  }), "dsh-post-draft-auto: guidance");

  // 侧栏面板的数据接口：GET /post-draft/list、GET /post-draft/copy、POST /post-draft/mark-posted
  ctx.effect(() => {
    const server = ctx.webServer;
    if (!server || typeof server.register !== "function") return () => {};
    const disposers = routes().map((route) => {
      try {
        return server.register(route);
      } catch (e) {
        return undefined;
      }
    }).filter((dispose) => typeof dispose === "function");
    return () => { disposers.forEach((dispose) => { try { dispose(); } catch (e) {} }); };
  }, "dsh-post-draft-auto: panel routes");
}