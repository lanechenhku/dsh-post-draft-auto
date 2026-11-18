// dsh-post-draft-auto —— 浏览器半部分
// 在右侧栏注册「出稿」页签：草稿列表、复制、标记已发、就地编辑、重新生成（复制重写指令）、中/英界面切换。
// 数据来自宿主半部分注册的 /post-draft/* 接口（不依赖 4789 网页工作台）。
window.__ModuleLoader__.load({
  id: "dsh-post-draft-auto",
  factory: (require) => {
    const React = require("react");
    const h = React.createElement;

    const TAB_ID = "post-draft";
    const TAB_KIND = "post-draft";
    const TAB_ICON = "✍";

    // ---------- i18n（由 lib/i18n.mjs 生成，测试逐 key 比对） ----------
    const STRINGS = {
      "zh": {
            "app.title": "出稿",
            "app.refresh": "刷新",
            "app.lang": "EN",
            "app.langTitle": "切换到 English",
            "loading": "读取中…",
            "empty.title": "还没有草稿",
            "empty.hint": "跟 agent 说「我刚发了 XXX」就会出稿",
            "error.load": "读取失败：",
            "card.ai": "AI 生成",
            "card.template": "模板生成",
            "card.copyEn": "复制 EN",
            "card.copyZh": "复制 ZH",
            "card.posted": "已发",
            "card.postedDone": "已发 ✓",
            "card.edit": "编辑",
            "card.regenerate": "重新生成",
            "card.tone": "语气",
            "card.edited": "已改",
            "status.drafted": "待发",
            "status.copied": "已复制",
            "status.published": "已发",
            "status.discarded": "丢弃",
            "guard.prefix": "先别发：",
            "guard.pendingRollout": "本地已 bump、线上还没上线",
            "guard.onlineNewer": "线上比本地新，先核对仓库/分支",
            "pending.title": "待补 {n} 处",
            "edit.enLabel": "英文主推",
            "edit.zhLabel": "中文回复",
            "edit.weight": "{lang} {weight}/{limit}",
            "edit.over": "超出 {limit}，不能保存",
            "edit.save": "保存",
            "edit.cancel": "取消",
            "arch.published": "已发 {n}",
            "arch.discarded": "丢弃 {n}",
            "arch.expand": "展开已发/丢弃",
            "arch.collapse": "收起已发/丢弃",
            "arch.emptyActive": "待发区空了 —— 展开下面的组看已发/丢弃",
            "toast.copied": "已复制{what}（{method}）",
            "toast.copiedEn": "英文主推",
            "toast.copiedZh": "中文回复",
            "toast.copyFailed": "复制失败：",
            "toast.selectManual": "已选中文本，请按 ⌘C 复制",
            "toast.posted": "已记录到台账，同 source_key 不会再出稿",
            "toast.postFailed": "标记失败：",
            "toast.editSaved": "已保存（{en}/{limit} · {zh}/{limit}）",
            "toast.editFailed": "保存失败：",
            "toast.tooLong": "超出 {limit}，先删一点",
            "toast.promptCopied": "重写指令已复制（语气：{tone}）—— 粘到对话里让模型重写",
            "toast.promptFailed": "取重写指令失败："
      },
      "en": {
            "app.title": "Outbox",
            "app.refresh": "Refresh",
            "app.lang": "中文",
            "app.langTitle": "Switch to Chinese",
            "loading": "Loading…",
            "empty.title": "No drafts yet",
            "empty.hint": "Tell the agent “I just shipped XXX” and a draft shows up here",
            "error.load": "Failed to load: ",
            "card.ai": "AI",
            "card.template": "Template",
            "card.copyEn": "Copy EN",
            "card.copyZh": "Copy ZH",
            "card.posted": "Mark posted",
            "card.postedDone": "Posted ✓",
            "card.edit": "Edit",
            "card.regenerate": "Rewrite",
            "card.tone": "Tone",
            "card.edited": "edited",
            "status.drafted": "Draft",
            "status.copied": "Copied",
            "status.published": "Posted",
            "status.discarded": "Discarded",
            "guard.prefix": "Hold on: ",
            "guard.pendingRollout": "bumped locally, not live yet",
            "guard.onlineNewer": "online is newer than local — check repo/branch first",
            "pending.title": "{n} to fill in",
            "edit.enLabel": "English post",
            "edit.zhLabel": "Chinese reply",
            "edit.weight": "{lang} {weight}/{limit}",
            "edit.over": "Over {limit}, cannot save",
            "edit.save": "Save",
            "edit.cancel": "Cancel",
            "arch.published": "Posted {n}",
            "arch.discarded": "Discarded {n}",
            "arch.expand": "Show posted / discarded",
            "arch.collapse": "Hide posted / discarded",
            "arch.emptyActive": "Nothing waiting — open the group below for posted / discarded",
            "toast.copied": "Copied {what} ({method})",
            "toast.copiedEn": "the English post",
            "toast.copiedZh": "the Chinese reply",
            "toast.copyFailed": "Copy failed: ",
            "toast.selectManual": "Text selected — press ⌘C to copy",
            "toast.posted": "Logged as posted; same source_key will not draft again",
            "toast.postFailed": "Could not mark posted: ",
            "toast.editSaved": "Saved ({en}/{limit} · {zh}/{limit})",
            "toast.editFailed": "Save failed: ",
            "toast.tooLong": "Over {limit}; trim it first",
            "toast.promptCopied": "Rewrite prompt copied (tone: {tone}) — paste it into the conversation",
            "toast.promptFailed": "Could not build the rewrite prompt: "
      }
};
    const LANGS = ["zh", "en"];
    const LANG_KEY = "postDraft.lang";

    function interpolate(text, vars) {
      let out = text;
      if (vars) {
        Object.keys(vars).forEach(function (k) { out = out.split("{" + k + "}").join(String(vars[k])); });
      }
      return out;
    }

    function translate(lang, key, vars) {
      const table = STRINGS[lang] || STRINGS.zh;
      let text = table[key];
      if (text === undefined) text = STRINGS.zh[key];
      if (text === undefined) return key;
      return interpolate(text, vars);
    }

    function readLang(deps) {
      const store = deps && "storage" in deps ? deps.storage : (typeof localStorage !== "undefined" ? localStorage : undefined);
      try {
        const value = store && store.getItem(LANG_KEY);
        return value === "en" ? "en" : "zh";
      } catch (e) { return "zh"; }
    }

    function writeLang(lang, deps) {
      const store = deps && "storage" in deps ? deps.storage : (typeof localStorage !== "undefined" ? localStorage : undefined);
      try { if (store) store.setItem(LANG_KEY, lang === "en" ? "en" : "zh"); } catch (e) {}
    }

    // ---------- 复制（带降级；测试通过 __internals 直接调用） ----------
    async function copyText(text, deps) {
      const d = deps || {};
      const nav = d.navigator !== undefined ? d.navigator : (typeof navigator !== "undefined" ? navigator : undefined);
      const doc = d.document !== undefined ? d.document : (typeof document !== "undefined" ? document : undefined);
      if (nav && nav.clipboard && typeof nav.clipboard.writeText === "function") {
        try {
          await nav.clipboard.writeText(text);
          return { ok: true, method: "clipboard" };
        } catch (error) {
          // 非 HTTPS / 非 localhost 时浏览器可能拒绝，继续走降级
        }
      }
      if (!doc || typeof doc.createElement !== "function" || !doc.body) {
        return { ok: false, method: "none", error: "no document" };
      }
      const area = doc.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "readonly");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      area.style.left = "0";
      area.style.opacity = "0";
      doc.body.appendChild(area);
      try { area.focus(); } catch (e) {}
      try { area.select(); } catch (e) {}
      let copied = false;
      try { copied = !!(doc.execCommand && doc.execCommand("copy")); } catch (e) { copied = false; }
      if (copied) {
        try { doc.body.removeChild(area); } catch (e) {}
        return { ok: true, method: "execCommand" };
      }
      return { ok: false, method: "selected", selection: area, error: "execCommand refused" };
    }

    // ---------- 计权：与 lib/weight.mjs 的 weightedLength 保持一致（测试比对） ----------
    const ONE_WEIGHT_RANGES = [[0x0000, 0x10ff], [0x2000, 0x200d], [0x2010, 0x201f], [0x2032, 0x2037]];
    const URL_WEIGHT = 23;

    function charWeight(cp) {
      for (let i = 0; i < ONE_WEIGHT_RANGES.length; i += 1) {
        const r = ONE_WEIGHT_RANGES[i];
        if (cp >= r[0] && cp <= r[1]) return 1;
      }
      return 2;
    }

    function weighText(text) {
      const s = text === null || text === undefined ? "" : String(text);
      let n = 0;
      let i = 0;
      while (i < s.length) {
        if (s.startsWith("http://", i) || s.startsWith("https://", i)) {
          let j = i;
          while (j < s.length) {
            const c = s[j];
            if (c === " " || c === "\n" || c === "\t" || c === "\u3000" || c === "\r") break;
            j += 1;
          }
          i = j;
          n += URL_WEIGHT;
          continue;
        }
        const cp = s.codePointAt(i);
        n += charWeight(cp);
        i += String.fromCodePoint(cp).length;
      }
      return n;
    }

    // ---------- 数据 ----------
    function fetchJson(path, init) {
      return fetch(path, init).then(function (response) {
        return response.json().then(function (json) {
          if (!response.ok || !json || json.ok !== true) {
            const error = new Error((json && (json.error || (json.guard && json.guard.message))) || ("HTTP " + response.status));
            error.status = response.status;
            error.payload = json;
            throw error;
          }
          return json;
        });
      });
    }

    // ---------- 样式 ----------
    const S = {
      root: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0, font: "13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
      header: { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderBottom: "1px solid rgba(127,127,127,0.22)", flex: "0 0 auto" },
      title: { fontWeight: 600, fontSize: 13, flex: 1 },
      btn: { border: "1px solid rgba(127,127,127,0.32)", background: "transparent", color: "inherit", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer" },
      btnPrimary: { border: "1px solid rgba(127,127,127,0.32)", background: "rgba(127,127,127,0.12)", color: "inherit", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 },
      btnDisabled: { border: "1px solid rgba(127,127,127,0.16)", background: "transparent", color: "inherit", borderRadius: 6, padding: "2px 8px", fontSize: 11, opacity: 0.45, cursor: "not-allowed" },
      langBtn: { border: "1px solid rgba(127,127,127,0.32)", background: "transparent", color: "inherit", borderRadius: 6, padding: "2px 7px", fontSize: 11, cursor: "pointer", minWidth: 30 },
      body: { overflowY: "auto", padding: "8px 12px 16px", flex: "1 1 auto", minHeight: 0 },
      card: { border: "1px solid rgba(127,127,127,0.22)", borderRadius: 8, padding: "8px 10px", marginBottom: 10 },
      cardTop: { display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" },
      cardTitle: { fontWeight: 600, fontSize: 12.5, flex: "1 1 100%", wordBreak: "break-word", marginBottom: 3 },
      tag: { fontSize: 10, padding: "1px 6px", borderRadius: 999, border: "1px solid rgba(127,127,127,0.35)", opacity: 0.85, whiteSpace: "nowrap" },
      tagAI: { fontSize: 10, padding: "1px 6px", borderRadius: 999, border: "1px solid rgba(56,189,248,0.55)", color: "#7dd3fc", whiteSpace: "nowrap" },
      tagEdited: { fontSize: 10, padding: "1px 6px", borderRadius: 999, border: "1px solid rgba(251,191,36,0.55)", color: "#fbbf24", whiteSpace: "nowrap" },
      weight: { fontSize: 11, opacity: 0.6, marginLeft: 4, fontVariantNumeric: "tabular-nums" },
      weightOver: { fontSize: 11, color: "#f87171", marginLeft: 4, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
      actions: { display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap", alignItems: "center" },
      toneSelect: { border: "1px solid rgba(127,127,127,0.32)", background: "transparent", color: "inherit", borderRadius: 6, fontSize: 11, padding: "2px 4px" },
      pending: { marginTop: 7, padding: "6px 8px", borderRadius: 6, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", fontSize: 11.5 },
      pendingTitle: { fontWeight: 600, marginBottom: 2 },
      guard: { marginTop: 7, padding: "6px 8px", borderRadius: 6, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.4)", fontSize: 11.5 },
      empty: { opacity: 0.55, fontSize: 12, padding: "24px 8px", textAlign: "center", lineHeight: 1.7 },
      error: { color: "#ff9a9a", fontSize: 12, padding: "6px 0" },
      toast: { margin: "6px 12px 0", padding: "6px 9px", borderRadius: 6, fontSize: 11.5, background: "rgba(20,184,166,0.16)", border: "1px solid rgba(20,184,166,0.4)" },
      toastError: { margin: "6px 12px 0", padding: "6px 9px", borderRadius: 6, fontSize: 11.5, background: "rgba(248,113,113,0.16)", border: "1px solid rgba(248,113,113,0.45)" },
      archivedToggle: { display: "flex", alignItems: "center", gap: 6, width: "100%", marginTop: 4, padding: "5px 2px", border: "none", borderTop: "1px solid rgba(127,127,127,0.2)", background: "transparent", color: "inherit", font: "inherit", fontSize: 11.5, opacity: 0.62, cursor: "pointer", textAlign: "left" },
      archivedChevron: { fontSize: 10, width: 12, flex: "0 0 auto", opacity: 0.8 },
      archivedCount: { flex: "1 1 auto" },
      archivedCard: { display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", padding: "4px 2px 5px", borderBottom: "1px dashed rgba(127,127,127,0.14)", opacity: 0.72 },
      archivedTitle: { flex: "1 1 100%", fontSize: 11.5, wordBreak: "break-word", lineHeight: 1.35 },
      archivedEmpty: { padding: "2px 2px 4px", fontSize: 11, opacity: 0.45 },
      editBox: { marginTop: 8, paddingTop: 8, borderTop: "1px dashed rgba(127,127,127,0.25)" },
      editLabel: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, opacity: 0.75, margin: "6px 0 3px" },
      textarea: { width: "100%", boxSizing: "border-box", minHeight: 64, resize: "vertical", font: "inherit", fontSize: 12, lineHeight: 1.45, color: "inherit", background: "rgba(127,127,127,0.08)", border: "1px solid rgba(127,127,127,0.28)", borderRadius: 6, padding: "6px 7px" },
      editWarn: { color: "#f87171", fontSize: 11, marginTop: 4 }
    };

    const STATUS_KEYS = { drafted: "status.drafted", copied: "status.copied", published: "status.published", discarded: "status.discarded" };

    // ---------- 分组与折叠（纯函数，便于测试） ----------
    const ARCHIVED_KEY = "postDraft.publishedOpen";
    const ARCHIVED_STATUSES = { published: true, discarded: true };

    function isArchived(draft) {
      return !!(draft && ARCHIVED_STATUSES[draft.status]);
    }

    function archivedCounts(archived) {
      const list = Array.isArray(archived) ? archived : [];
      return {
        published: list.filter(function (d) { return d && d.status === "published"; }).length,
        discarded: list.filter(function (d) { return d && d.status === "discarded"; }).length
      };
    }

    // 文案由 t() 组装（中英都要正确）；纯函数便于测试
    function archivedLabel(archived, lang) {
      const counts = archivedCounts(archived);
      const parts = [];
      if (counts.published) parts.push(translate(lang || "zh", "arch.published", { n: counts.published }));
      if (counts.discarded) parts.push(translate(lang || "zh", "arch.discarded", { n: counts.discarded }));
      return parts.join(" · ");
    }

    function splitDrafts(drafts) {
      const list = Array.isArray(drafts) ? drafts.filter(Boolean) : [];
      const active = [];
      const archived = [];
      list.forEach(function (d) { (isArchived(d) ? archived : active).push(d); });
      return { active: active, archived: archived };
    }

    function markPublished(drafts, id) {
      return (Array.isArray(drafts) ? drafts : []).map(function (d) {
        return d && d.id === id ? Object.assign({}, d, { status: "published" }) : d;
      });
    }

    function readArchivedOpen(deps) {
      const store = deps && "storage" in deps ? deps.storage : (typeof localStorage !== "undefined" ? localStorage : undefined);
      try { return !!(store && store.getItem(ARCHIVED_KEY) === "1"); } catch (e) { return false; }
    }

    function writeArchivedOpen(open, deps) {
      const store = deps && "storage" in deps ? deps.storage : (typeof localStorage !== "undefined" ? localStorage : undefined);
      try { if (store) store.setItem(ARCHIVED_KEY, open ? "1" : "0"); } catch (e) {}
    }

    function Badge(props) {
      const style = props.ai ? S.tagAI : (props.edited ? S.tagEdited : S.tag);
      return h("span", { style }, props.children);
    }

    // ---------- 编辑面板（受控 textarea + 实时计权） ----------
    function EditBox(props) {
      const lang = props.lang;
      const limit = props.draft.limit || 280;
      const enWeight = weighText(props.en);
      const zhWeight = weighText(props.zh);
      const over = enWeight > limit || zhWeight > limit;
      return h("div", { style: S.editBox },
        h("div", { style: S.editLabel },
          h("span", null, translate(lang, "edit.enLabel")),
          h("span", { style: enWeight > limit ? S.weightOver : S.weight }, translate(lang, "edit.weight", { lang: "EN", weight: enWeight, limit: limit }))
        ),
        h("textarea", {
          style: S.textarea,
          value: props.en,
          rows: 4,
          onChange: function (e) { props.onChange("en", e.target.value); }
        }),
        h("div", { style: S.editLabel },
          h("span", null, translate(lang, "edit.zhLabel")),
          h("span", { style: zhWeight > limit ? S.weightOver : S.weight }, translate(lang, "edit.weight", { lang: "ZH", weight: zhWeight, limit: limit }))
        ),
        h("textarea", {
          style: S.textarea,
          value: props.zh,
          rows: 4,
          onChange: function (e) { props.onChange("zh", e.target.value); }
        }),
        over ? h("div", { style: S.editWarn }, translate(lang, "edit.over", { limit: limit })) : null,
        h("div", { style: S.actions },
          h("button", {
            type: "button",
            style: over ? S.btnDisabled : S.btnPrimary,
            disabled: over,
            onClick: function () { props.onSave(); }
          }, translate(lang, "edit.save")),
          h("button", { type: "button", style: S.btn, onClick: props.onCancel }, translate(lang, "edit.cancel"))
        )
      );
    }

    function DraftCard(props) {
      const draft = props.draft;
      const lang = props.lang;
      const over = draft.enWeight > draft.limit || draft.zhWeight > draft.limit;
      const blocked = !!(draft.guard);
      const canPost = draft.status !== "published" && !blocked;
      const editing = props.editing;
      return h(
        "div",
        { style: S.card },
        h("div", { style: S.cardTop },
          h("span", { style: S.cardTitle }, draft.title || draft.id),
          h(Badge, { ai: draft.generatedBy === "model" }, translate(lang, draft.generatedBy === "model" ? "card.ai" : "card.template")),
          draft.edited ? h(Badge, { edited: true }, translate(lang, "card.edited")) : null,
          h(Badge, null, translate(lang, STATUS_KEYS[draft.status] || draft.status)),
          h("span", { style: over ? S.weightOver : S.weight }, "EN " + draft.enWeight + "/" + draft.limit),
          h("span", { style: over ? S.weightOver : S.weight }, "ZH " + draft.zhWeight + "/" + draft.limit)
        ),
        blocked
          ? h("div", { style: S.guard }, translate(lang, "guard.prefix") + translate(lang, draft.guard === "pending-rollout" ? "guard.pendingRollout" : "guard.onlineNewer"))
          : null,
        draft.pending && draft.pending.length
          ? h("div", { style: S.pending },
              h("div", { style: S.pendingTitle }, translate(lang, "pending.title", { n: draft.pending.length })),
              draft.pending.slice(0, 4).map(function (item, index) { return h("div", { key: "p" + index }, "· " + item); })
            )
          : null,
        editing
          ? h(EditBox, {
              draft: draft,
              lang: lang,
              en: props.editEn,
              zh: props.editZh,
              onChange: props.onEditChange,
              onSave: props.onSaveEdit,
              onCancel: props.onCancelEdit
            })
          : h("div", { style: S.actions },
              h("button", {
                type: "button",
                style: blocked ? S.btnDisabled : S.btnPrimary,
                disabled: blocked,
                onClick: function () { props.onCopy(draft.id, "en"); }
              }, translate(lang, "card.copyEn")),
              h("button", {
                type: "button",
                style: blocked ? S.btnDisabled : S.btnPrimary,
                disabled: blocked,
                onClick: function () { props.onCopy(draft.id, "zh"); }
              }, translate(lang, "card.copyZh")),
              h("button", {
                type: "button",
                style: blocked ? S.btnDisabled : S.btn,
                disabled: blocked,
                onClick: function () { props.onEdit(draft.id); }
              }, translate(lang, "card.edit")),
              h("button", {
                type: "button",
                style: blocked ? S.btnDisabled : S.btn,
                disabled: blocked,
                onClick: function () { props.onRegenerate(draft.id, props.tone); }
              }, translate(lang, "card.regenerate")),
              props.tones && props.tones.length
                ? h("select", {
                    style: S.toneSelect,
                    value: props.tone,
                    title: translate(lang, "card.tone"),
                    onChange: function (e) { props.onToneChange(e.target.value); }
                  },
                    props.tones.map(function (tone) {
                      return h("option", { key: tone.id, value: tone.id }, lang === "en" ? tone.labelEn : tone.label);
                    })
                  )
                : null,
              h("button", {
                type: "button",
                style: canPost ? S.btn : S.btnDisabled,
                disabled: !canPost,
                onClick: function () { props.onPosted(draft.id); }
              }, translate(lang, draft.status === "published" ? "card.postedDone" : "card.posted"))
            )
      );
    }

    function ArchivedCard(props) {
      const draft = props.draft;
      const lang = props.lang;
      const over = draft.enWeight > draft.limit || draft.zhWeight > draft.limit;
      return h("div", { style: S.archivedCard },
        h("span", { style: S.archivedTitle }, draft.title || draft.id),
        h(Badge, { ai: draft.generatedBy === "model" }, translate(lang, draft.generatedBy === "model" ? "card.ai" : "card.template")),
        draft.edited ? h(Badge, { edited: true }, translate(lang, "card.edited")) : null,
        h(Badge, null, translate(lang, STATUS_KEYS[draft.status] || draft.status)),
        h("span", { style: over ? S.weightOver : S.weight }, "EN " + draft.enWeight + "/" + draft.limit),
        h("span", { style: over ? S.weightOver : S.weight }, "ZH " + draft.zhWeight + "/" + draft.limit)
      );
    }

    function Panel() {
      const [state, setState] = React.useState({ loading: true, error: null, drafts: [] });
      const [toast, setToast] = React.useState(null);
      const [archivedOpen, setArchivedOpen] = React.useState(function () { return readArchivedOpen(); });
      const [lang, setLang] = React.useState(function () { return readLang(); });
      const [tones, setTones] = React.useState([]);
      const [tone, setTone] = React.useState("");
      const [editingId, setEditingId] = React.useState(null);
      const [editState, setEditState] = React.useState({ en: "", zh: "" });

      const t = function (key, vars) { return translate(lang, key, vars); };

      const load = React.useCallback(function () {
        setState(function (prev) { return { loading: true, error: null, drafts: prev.drafts }; });
        fetchJson("/post-draft/list", { method: "GET" }).then(
          function (json) { setState({ loading: false, error: null, drafts: json.drafts || [] }); },
          function (error) { setState({ loading: false, error: String((error && error.message) || error), drafts: [] }); }
        );
      }, []);

      React.useEffect(function () { load(); }, [load]);

      React.useEffect(function () {
        fetch("/post-draft/tones").then(function (r) { return r.json(); }).then(function (json) {
          if (json && json.ok && Array.isArray(json.tones) && json.tones.length) {
            setTones(json.tones);
            setTone(function (prev) { return prev || json.tones[0].id; });
          }
        }).catch(function () {});
      }, []);

      function showToast(message, isError) {
        setToast({ message, isError: !!isError });
        if (typeof setTimeout === "function") setTimeout(function () { setToast(null); }, 3600);
      }

      function switchLang() {
        const next = lang === "zh" ? "en" : "zh";
        setLang(next);
        writeLang(next);
      }

      function onCopy(id, part) {
        fetch("/post-draft/copy?id=" + encodeURIComponent(id) + "&part=" + part)
          .then(function (response) {
            if (!response.ok) {
              return response.json().then(function (json) { throw new Error((json && json.error) || ("HTTP " + response.status)); });
            }
            return response.text();
          })
          .then(function (body) { return copyText(body); })
          .then(function (result) {
            if (result.ok) {
              showToast(t("toast.copied", {
                what: t(part === "en" ? "toast.copiedEn" : "toast.copiedZh"),
                method: result.method
              }));
              load();
            } else {
              showToast([t("toast.selectManual"), result.error].filter(Boolean).join("; "), true);
            }
          })
          .catch(function (error) { showToast(t("toast.copyFailed") + String((error && error.message) || error), true); });
      }

      function onPosted(id) {
        const snapshot = state.drafts;
        setState(function (prev) { return Object.assign({}, prev, { drafts: markPublished(prev.drafts, id) }); });
        fetchJson("/post-draft/mark-posted", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: id })
        }).then(
          function () { showToast(t("toast.posted")); load(); },
          function (error) {
            setState(function (prev) { return Object.assign({}, prev, { drafts: snapshot }); });
            showToast(t("toast.postFailed") + String((error && error.message) || error), true);
          }
        );
      }

      function onRegenerate(id, selectedTone) {
        const params = "id=" + encodeURIComponent(id) + "&tone=" + encodeURIComponent(selectedTone || "") + "&lang=" + lang;
        fetch("/post-draft/rewrite-prompt?" + params)
          .then(function (response) {
            if (!response.ok) {
              return response.json().then(function (json) { throw new Error((json && json.error) || ("HTTP " + response.status)); });
            }
            return response.text();
          })
          .then(function (prompt) { return copyText(prompt).then(function (result) { return { prompt: prompt, result: result }; }); })
          .then(function (bundle) {
            if (bundle.result.ok) {
              const toneObj = tones.filter(function (x) { return x.id === selectedTone; })[0];
              showToast(t("toast.promptCopied", { tone: toneObj ? (lang === "en" ? toneObj.labelEn : toneObj.label) : selectedTone }));
            } else {
              showToast([t("toast.selectManual"), bundle.result.error].filter(Boolean).join("; "), true);
            }
          })
          .catch(function (error) { showToast(t("toast.promptFailed") + String((error && error.message) || error), true); });
      }

      function onEdit(id) {
        fetchJson("/post-draft/draft?id=" + encodeURIComponent(id), { method: "GET" }).then(
          function (json) {
            const draft = json.draft;
            setEditingId(id);
            setEditState({ en: draft.enText || "", zh: draft.zhText || "" });
          },
          function (error) { showToast(t("toast.editFailed") + String((error && error.message) || error), true); }
        );
      }

      function onEditChange(part, value) {
        setEditState(function (prev) { return Object.assign({}, prev, part === "en" ? { en: value } : { zh: value }); });
      }

      function onCancelEdit() {
        setEditingId(null);
        setEditState({ en: "", zh: "" });
      }

      function onSaveEdit() {
        const id = editingId;
        fetch("/post-draft/draft", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: id, en: editState.en, zh: editState.zh })
        }).then(function (response) {
          return response.json().then(function (json) {
            if (!response.ok || !json || json.ok !== true) {
              const error = new Error((json && json.error) || ("HTTP " + response.status));
              error.payload = json;
              throw error;
            }
            return json;
          });
        }).then(
          function (json) {
            setEditingId(null);
            setEditState({ en: "", zh: "" });
            showToast(t("toast.editSaved", { en: json.enWeight, zh: json.zhWeight, limit: json.limit }));
            load();
          },
          function (error) {
            if (error.payload && error.payload.error === "too_long") {
              showToast(t("toast.tooLong", { limit: error.payload.limit }), true);
              return;
            }
            showToast(t("toast.editFailed") + String((error && error.message) || error), true);
          }
        );
      }

      function toggleArchived() {
        const next = !archivedOpen;
        setArchivedOpen(next);
        writeArchivedOpen(next);
      }

      const groups = splitDrafts(state.drafts);
      const label = archivedLabel(groups.archived, lang);

      return h("div", { style: S.root },
        h("div", { style: S.header },
          h("span", { style: S.title }, TAB_ICON + " " + t("app.title")),
          h("button", { type: "button", style: S.langBtn, title: t("app.langTitle"), onClick: switchLang }, t("app.lang")),
          h("button", { type: "button", style: S.btn, title: t("app.refresh"), onClick: load }, t("app.refresh"))
        ),
        toast ? h("div", { style: toast.isError ? S.toastError : S.toast }, toast.message) : null,
        h("div", { style: S.body },
          state.error ? h("div", { style: S.error }, t("error.load") + state.error) : null,
          state.loading && state.drafts.length === 0 ? h("div", { style: S.empty }, t("loading")) : null,
          !state.loading && !state.error && state.drafts.length === 0
            ? h("div", { style: S.empty },
                h("div", null, t("empty.title")),
                h("div", null, t("empty.hint"))
              )
            : null,
          groups.active.map(function (draft) {
            return h(DraftCard, {
              key: draft.id,
              draft: draft,
              lang: lang,
              tones: tones,
              tone: tone,
              onToneChange: setTone,
              editing: editingId === draft.id,
              editEn: editState.en,
              editZh: editState.zh,
              onEditChange: onEditChange,
              onSaveEdit: onSaveEdit,
              onCancelEdit: onCancelEdit,
              onCopy: onCopy,
              onEdit: onEdit,
              onRegenerate: onRegenerate,
              onPosted: onPosted
            });
          }),
          !state.loading && !state.error && state.drafts.length > 0 && groups.active.length === 0
            ? h("div", { style: S.archivedEmpty }, t("arch.emptyActive"))
            : null,
          groups.archived.length > 0
            ? h("div", null,
                h("button", {
                  type: "button",
                  style: S.archivedToggle,
                  title: archivedOpen ? t("arch.collapse") : t("arch.expand"),
                  "aria-expanded": archivedOpen ? "true" : "false",
                  onClick: toggleArchived
                },
                  h("span", { style: S.archivedChevron }, archivedOpen ? "▾" : "▸"),
                  h("span", { style: S.archivedCount }, label)
                ),
                archivedOpen
                  ? h("div", null, groups.archived.map(function (draft) {
                      return h(ArchivedCard, { key: draft.id, draft: draft, lang: lang });
                    }))
                  : null
              )
            : null
        )
      );
    }

    function TabIcon() {
      return h("span", { "aria-hidden": "true", style: { fontSize: 15, lineHeight: 1 } }, TAB_ICON);
    }

    function TabTitle() {
      return h("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, lineHeight: 1.2 } },
        h("span", { "aria-hidden": "true", style: { fontSize: 12 } }, TAB_ICON),
        h("span", null, translate(readLang(), "app.title"))
      );
    }

    function apply(ctx) {
      const get = function (name) {
        try { return ctx.get(name); } catch (e) { return undefined; }
      };
      const slots = get("slots");
      const tabs = get("sidebarRightTabs");
      if (!slots) return;
      try {
        if (tabs && typeof tabs.register === "function") {
          ctx.effect(function () {
            return tabs.register({
              id: TAB_ID,
              kind: TAB_KIND,
              title: function () { return translate(readLang(), "app.title"); },
              guide: [{
                id: "open",
                order: 73,
                title: function () { return translate(readLang(), "app.title"); },
                description: function () { return translate(readLang(), "empty.hint"); },
                icon: TabIcon
              }]
            });
          });
        }
        slots.inject("sidebar.right.pane.tab", function () {
          return slots.register({ name: "sidebar.right.pane.tab", key: TAB_ID, inject: function () { return {}; } }, Panel);
        });
        slots.inject("sidebar.right.pane.tab.title", function () {
          return slots.register({ name: "sidebar.right.pane.tab.title", key: TAB_ID, inject: function () { return {}; } }, TabTitle);
        });
      } catch (error) {
        try { console.warn("dsh-post-draft-auto: panel not mounted:", error); } catch (e) {}
      }
    }

    return {
      name: "dsh-post-draft-auto",
      inject: ["slots", "sidebarRightTabs"],
      apply,
      __internals: {
        copyText: copyText,
        Panel: Panel,
        DraftCard: DraftCard,
        ArchivedCard: ArchivedCard,
        EditBox: EditBox,
        splitDrafts: splitDrafts,
        archivedLabel: archivedLabel,
        markPublished: markPublished,
        readArchivedOpen: readArchivedOpen,
        writeArchivedOpen: writeArchivedOpen,
        ARCHIVED_KEY: ARCHIVED_KEY,
        translate: translate,
        STRINGS: STRINGS,
        weighText: weighText,
        readLang: readLang,
        writeLang: writeLang,
        LANG_KEY: LANG_KEY
      }
    };
  }
});