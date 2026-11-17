// dsh-post-draft-auto —— 浏览器半部分
// 在右侧栏注册一个「✍ 出稿」页签：列草稿、每行复制 EN/ZH、标记已发。
// 数据来自宿主半部分注册的 /post-draft/* 接口（不依赖 4789 网页工作台）。
window.__ModuleLoader__.load({
  id: "dsh-post-draft-auto",
  factory: (require) => {
    const React = require("react");
    const h = React.createElement;

    const TAB_ID = "post-draft";
    const TAB_KIND = "post-draft";
    const TAB_ICON = "✍";
    const TAB_TITLE = "出稿";

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
        return { ok: false, method: "none", error: "没有可用的剪贴板或文档" };
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
      return { ok: false, method: "selected", selection: area, error: "execCommand 被拒绝" };
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
      header: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(127,127,127,0.22)", flex: "0 0 auto" },
      title: { fontWeight: 600, fontSize: 13, flex: 1 },
      btn: { border: "1px solid rgba(127,127,127,0.32)", background: "transparent", color: "inherit", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer" },
      btnPrimary: { border: "1px solid rgba(127,127,127,0.32)", background: "rgba(127,127,127,0.12)", color: "inherit", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 },
      btnDisabled: { border: "1px solid rgba(127,127,127,0.16)", background: "transparent", color: "inherit", borderRadius: 6, padding: "2px 8px", fontSize: 11, opacity: 0.45, cursor: "not-allowed" },
      body: { overflowY: "auto", padding: "8px 12px 16px", flex: "1 1 auto", minHeight: 0 },
      card: { border: "1px solid rgba(127,127,127,0.22)", borderRadius: 8, padding: "8px 10px", marginBottom: 10 },
      cardTop: { display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" },
      cardTitle: { fontWeight: 600, fontSize: 12.5, flex: "1 1 100%", wordBreak: "break-word", marginBottom: 3 },
      tag: { fontSize: 10, padding: "1px 6px", borderRadius: 999, border: "1px solid rgba(127,127,127,0.35)", opacity: 0.85, whiteSpace: "nowrap" },
      tagAI: { fontSize: 10, padding: "1px 6px", borderRadius: 999, border: "1px solid rgba(56,189,248,0.55)", color: "#7dd3fc", whiteSpace: "nowrap" },
      weight: { fontSize: 11, opacity: 0.6, marginLeft: 4, fontVariantNumeric: "tabular-nums" },
      weightOver: { fontSize: 11, color: "#f87171", marginLeft: 4, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
      actions: { display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap", alignItems: "center" },
      pending: { marginTop: 7, padding: "6px 8px", borderRadius: 6, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", fontSize: 11.5 },
      pendingTitle: { fontWeight: 600, marginBottom: 2 },
      guard: { marginTop: 7, padding: "6px 8px", borderRadius: 6, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.4)", fontSize: 11.5 },
      empty: { opacity: 0.55, fontSize: 12, padding: "24px 8px", textAlign: "center", lineHeight: 1.7 },
      error: { color: "#ff9a9a", fontSize: 12, padding: "6px 0" },
      toast: { margin: "6px 12px 0", padding: "6px 9px", borderRadius: 6, fontSize: 11.5, background: "rgba(20,184,166,0.16)", border: "1px solid rgba(20,184,166,0.4)" },
      toastError: { margin: "6px 12px 0", padding: "6px 9px", borderRadius: 6, fontSize: 11.5, background: "rgba(248,113,113,0.16)", border: "1px solid rgba(248,113,113,0.45)" }
    };

    const STATUS_LABEL = { drafted: "待发", copied: "已复制", published: "已发", discarded: "丢弃" };

    function Badge(props) {
      const style = props.ai ? S.tagAI : S.tag;
      return h("span", { style }, props.children);
    }

    function DraftCard(props) {
      const draft = props.draft;
      const over = draft.enWeight > draft.limit || draft.zhWeight > draft.limit;
      const blocked = !!(draft.guard);
      const canPost = draft.status !== "published" && !blocked;
      return h(
        "div",
        { style: S.card },
        h("div", { style: S.cardTop },
          h("span", { style: S.cardTitle }, draft.title || draft.id),
          h(Badge, { ai: draft.generatedBy === "model" }, draft.generatedBy === "model" ? "AI 生成" : "模板生成"),
          h(Badge, null, STATUS_LABEL[draft.status] || draft.status),
          h("span", { style: over ? S.weightOver : S.weight }, "EN " + draft.enWeight + "/" + draft.limit),
          h("span", { style: over ? S.weightOver : S.weight }, "ZH " + draft.zhWeight + "/" + draft.limit)
        ),
        blocked
          ? h("div", { style: S.guard }, "先别发：" + (draft.guard === "pending-rollout" ? "本地已 bump、线上还没上线" : draft.guard))
          : null,
        draft.pending && draft.pending.length
          ? h("div", { style: S.pending },
              h("div", { style: S.pendingTitle }, "待补 " + draft.pending.length + " 处"),
              draft.pending.slice(0, 4).map(function (item, index) { return h("div", { key: "p" + index }, "· " + item); })
            )
          : null,
        h("div", { style: S.actions },
          h("button", {
            type: "button",
            style: blocked ? S.btnDisabled : S.btnPrimary,
            disabled: blocked,
            onClick: function () { props.onCopy(draft.id, "en"); }
          }, "复制 EN"),
          h("button", {
            type: "button",
            style: blocked ? S.btnDisabled : S.btnPrimary,
            disabled: blocked,
            onClick: function () { props.onCopy(draft.id, "zh"); }
          }, "复制 ZH"),
          h("button", {
            type: "button",
            style: canPost ? S.btn : S.btnDisabled,
            disabled: !canPost,
            onClick: function () { props.onPosted(draft.id); }
          }, draft.status === "published" ? "已发 ✓" : "已发")
        )
      );
    }

    function Panel() {
      const [state, setState] = React.useState({ loading: true, error: null, drafts: [] });
      const [toast, setToast] = React.useState(null);

      const load = React.useCallback(function () {
        setState(function (prev) { return { loading: true, error: null, drafts: prev.drafts }; });
        fetchJson("/post-draft/list", { method: "GET" }).then(
          function (json) { setState({ loading: false, error: null, drafts: json.drafts || [] }); },
          function (error) { setState({ loading: false, error: String((error && error.message) || error), drafts: [] }); }
        );
      }, []);

      React.useEffect(function () { load(); }, [load]);

      function showToast(message, isError) {
        setToast({ message, isError: !!isError });
        if (typeof setTimeout === "function") setTimeout(function () { setToast(null); }, 3200);
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
              showToast("已复制 " + (part === "en" ? "英文主推" : "中文回复") + "（" + result.method + "）");
              load();
            } else {
              showToast(["已选中文本，请按 ⌘C 复制", result.error].filter(Boolean).join("；"), true);
            }
          })
          .catch(function (error) { showToast("复制失败：" + String((error && error.message) || error), true); });
      }

      function onPosted(id) {
        fetchJson("/post-draft/mark-posted", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id })
        }).then(
          function () { showToast("已记录到台账，同 source_key 不会再出稿"); load(); },
          function (error) { showToast("标记失败：" + String((error && error.message) || error), true); }
        );
      }

      return h("div", { style: S.root },
        h("div", { style: S.header },
          h("span", { style: S.title }, TAB_ICON + " " + TAB_TITLE),
          h("button", { type: "button", style: S.btn, title: "刷新", onClick: load }, "刷新")
        ),
        toast ? h("div", { style: toast.isError ? S.toastError : S.toast }, toast.message) : null,
        h("div", { style: S.body },
          state.error ? h("div", { style: S.error }, "读取失败：" + state.error) : null,
          state.loading && state.drafts.length === 0 ? h("div", { style: S.empty }, "读取中…") : null,
          !state.loading && !state.error && state.drafts.length === 0
            ? h("div", { style: S.empty },
                h("div", null, "还没有草稿"),
                h("div", null, "跟 agent 说「我刚发了 XXX」就会出稿")
              )
            : null,
          state.drafts.map(function (draft) {
            return h(DraftCard, { key: draft.id, draft, onCopy, onPosted });
          })
        )
      );
    }

    function TabIcon() {
      return h("span", { "aria-hidden": "true", style: { fontSize: 15, lineHeight: 1 } }, TAB_ICON);
    }

    function TabTitle() {
      return h("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, lineHeight: 1.2 } },
        h("span", { "aria-hidden": "true", style: { fontSize: 12 } }, TAB_ICON),
        h("span", null, TAB_TITLE)
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
              title: function () { return TAB_TITLE; },
              guide: [{
                id: "open",
                order: 73,
                title: function () { return TAB_TITLE; },
                description: function () { return "草稿列表：复制 EN/ZH、标记已发"; },
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
      __internals: { copyText, Panel, DraftCard }
    };
  }
});
