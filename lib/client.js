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
            "empty.hint": "说一句「我发了 XXX」，或「你给我做的 XXX 上线了，我要发个推」",
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
            "toast.promptFailed": "取重写指令失败：",
            "host.stale": "宿主还是旧版本：设置/编辑用的新接口返回 404。⌘Q 重启 DSH 后再试，其他功能不受影响。",
            "settings.title": "设置",
            "settings.defaultTone": "默认语气",
            "settings.language": "界面语言",
            "settings.lang.zh": "中文",
            "settings.lang.en": "English",
            "settings.includeFacts": "重写指令附上 facts",
            "settings.includeVoice": "附上禁用词与语气约束",
            "settings.on": "开",
            "settings.off": "关",
            "settings.reset": "恢复默认",
            "settings.saved": "设置已保存",
            "settings.hint": "只存在本机浏览器，不影响 config.json",
            "settings.close": "关闭",
            "settings.sendMode": "重新生成方式",
            "settings.sendMode.send": "一键投递",
            "settings.sendMode.copy": "复制指令",
            "settings.deliveryMode": "投递模式",
            "settings.deliveryMode.queue": "排队",
            "settings.deliveryMode.steer": "插入",
            "confirm.sendTo": "把重写指令投递给会话 {session}（{cwd}）？取消则不发送。",
            "toast.sent": "已投递到会话 {session}（{mode}），模型会接着重写",
            "toast.sendFallbackCopy": "投递失败（{reason}），已改为复制指令，粘到对话里即可",
            "toast.sendFailed": "投递失败：",
            "wb.title": "出稿工作台",
            "wb.docTitle": "出稿工作台",
            "wb.tagline": "生成 → 复制 → 你自己去 X 发",
            "wb.collect": "扫描源",
            "wb.collecting": "扫描中…",
            "wb.refresh": "刷新",
            "wb.status.discovered": "已发现",
            "wb.filter.all": "全部",
            "wb.filter.drafted": "待发",
            "wb.filter.copied": "已复制",
            "wb.filter.published": "已发",
            "wb.filter.discarded": "丢弃",
            "wb.manualPlaceholder": "手动出稿：例如「我刚发了 Acme v1.1.0 和一篇 preprint」",
            "wb.manualSubmit": "出稿",
            "wb.sourcesSummary": "来源状态",
            "wb.listEmpty": "没有草稿。点「扫描源」或上面手动出稿。",
            "wb.ai": "AI 生成",
            "wb.template": "模板生成",
            "wb.pendingCount": "{n} 待补",
            "wb.blockerCount": "{n} 阻断",
            "wb.guard.pendingRollout": "待上线",
            "wb.guard.onlineNewer": "版本不一致",
            "wb.guard.localMissing": "缺本地版本",
            "wb.guard.unparsable": "版本不可比",
            "wb.stats": "共 {total} 条 · 待发 {drafted} · 已发 {published} · 台账 {posted} 条",
            "wb.sourceOn": "开",
            "wb.sourceOff": "关",
            "wb.lastScan": "上次扫描：{at}",
            "wb.emptyTitle": "从左边选一条草稿",
            "wb.emptyBody": "或者在上面输入一句话手动出稿。这个工作台不会替你发推，也不会碰任何 X 账号。",
            "wb.remaining": "剩余 {n} 计权",
            "wb.over": "超了 {n} 计权",
            "wb.label.en": "第 1 条 · 英文主推",
            "wb.label.zh": "第 2 条 · 中文回复",
            "wb.copyN": "复制第 {n} 条",
            "wb.referenceTitle": "参考素材（原文）",
            "wb.openSource": "打开源文件",
            "wb.copyOne": "复制",
            "wb.copyLineTitle": "复制这句",
            "wb.referenceNote": "这些是 CHANGELOG 原话，只作参考：你挑一句改成推文再填入上面的稿子。",
            "wb.factsTitle": "事实（{n}）",
            "wb.factsNote": "所有数字/版本号都必须在这里",
            "wb.sourceCol": "源",
            "wb.cardTitle": "卡片图 1200×675",
            "wb.cardAlt": "卡片图",
            "wb.notRendered": "未渲染",
            "wb.noImage": "还没有图，点下面重新渲染",
            "wb.download": "下载图片",
            "wb.rerender": "重新渲染",
            "wb.history": "历史",
            "wb.created": "创建 {at}",
            "wb.save": "保存修改",
            "wb.markCopied": "标记已复制",
            "wb.publish": "已发到 X",
            "wb.discard": "丢弃",
            "wb.copyDisabledTitle": "版本未对齐，暂不能复制",
            "wb.copyDenied": "浏览器不允许自动复制，请手动选中文本框内容",
            "wb.toast.refCopied": "已复制参考句",
            "wb.toast.copyFailed": "复制失败：",
            "wb.toast.copiedN": "已复制第 {n} 条（{chars} 字符）",
            "wb.toast.guard": "先别发：",
            "wb.toast.saved": "已保存（EN {en} / ZH {zh} 计权）",
            "wb.toast.saveFailed": "保存失败：",
            "wb.toast.statusSet": "状态：{label}",
            "wb.toast.actionFailed": "操作失败：",
            "wb.confirm.publish": "这条草稿还有 {pending} 处待补、{blockers} 处阻断。确认你已经按最终内容发到 X 了吗？",
            "wb.toast.posted": "已记录到台账（同 source_key 不会再出稿）",
            "wb.toast.pendingLeft": "还有待补内容未处理",
            "wb.toast.blockedLeft": "有未溯源的数字，先改稿",
            "wb.confirm.discard": "丢弃后这条不会再出现在列表里（同 source_key 也不会再自动出稿）。确定？",
            "wb.toast.rendered": "卡片已重新渲染（{engine}）",
            "wb.toast.renderFailed": "渲染失败：",
            "wb.toast.collect": "扫描完成：新建 {created} · 更新 {updated} · 跳过 {dups} · 错误 {errors}",
            "wb.toast.collectSkipped": " · 待配置 {n}",
            "wb.toast.collectFailed": "扫描失败：",
            "wb.toast.manualCreated": "已出稿（记得补占位符）",
            "wb.toast.manualDuplicate": "这条来源已有草稿",
            "wb.toast.manualFailed": "出稿失败：",
            "wb.toast.refreshed": "已刷新",
            "wb.toast.loadFailed": "加载失败："
      },
      "en": {
            "app.title": "Outbox",
            "app.refresh": "Refresh",
            "app.lang": "中文",
            "app.langTitle": "Switch to Chinese",
            "loading": "Loading…",
            "empty.title": "No drafts yet",
            "empty.hint": "Say “I just shipped XXX” — or “the XXX you built for me is live, I want to post about it”",
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
            "toast.promptFailed": "Could not build the rewrite prompt: ",
            "host.stale": "The host still runs an older build: the routes used by edit/settings return 404. Quit and reopen DSH, then try again; the rest still works.",
            "settings.title": "Settings",
            "settings.defaultTone": "Default tone",
            "settings.language": "Language",
            "settings.lang.zh": "中文",
            "settings.lang.en": "English",
            "settings.includeFacts": "Include facts in the rewrite prompt",
            "settings.includeVoice": "Include banned words and voice rules",
            "settings.on": "On",
            "settings.off": "Off",
            "settings.reset": "Reset to defaults",
            "settings.saved": "Settings saved",
            "settings.hint": "Stored in this browser only; config.json is untouched",
            "settings.close": "Close",
            "settings.sendMode": "Rewrite action",
            "settings.sendMode.send": "Send to chat",
            "settings.sendMode.copy": "Copy prompt",
            "settings.deliveryMode": "Delivery mode",
            "settings.deliveryMode.queue": "Queue",
            "settings.deliveryMode.steer": "Steer",
            "confirm.sendTo": "Send the rewrite prompt to session {session} ({cwd})? Cancel to abort.",
            "toast.sent": "Sent to session {session} ({mode}); the model will rewrite it",
            "toast.sendFallbackCopy": "Send failed ({reason}); copied the prompt instead",
            "toast.sendFailed": "Send failed: ",
            "wb.title": "Draft workbench",
            "wb.docTitle": "Draft workbench",
            "wb.tagline": "Draft → copy → post it to X yourself",
            "wb.collect": "Scan sources",
            "wb.collecting": "Scanning…",
            "wb.refresh": "Refresh",
            "wb.status.discovered": "Found",
            "wb.filter.all": "All",
            "wb.filter.drafted": "To send",
            "wb.filter.copied": "Copied",
            "wb.filter.published": "Posted",
            "wb.filter.discarded": "Discarded",
            "wb.manualPlaceholder": "Draft from one sentence, e.g. \"I just shipped Acme v1.1.0 and a preprint\"",
            "wb.manualSubmit": "Draft it",
            "wb.sourcesSummary": "Source status",
            "wb.listEmpty": "No drafts yet. Hit \"Scan sources\", or write one above.",
            "wb.ai": "AI",
            "wb.template": "Template",
            "wb.pendingCount": "{n} to fill",
            "wb.blockerCount": "{n} blocked",
            "wb.guard.pendingRollout": "Not live yet",
            "wb.guard.onlineNewer": "Version mismatch",
            "wb.guard.localMissing": "No local version",
            "wb.guard.unparsable": "Versions not comparable",
            "wb.stats": "{total} drafts · {drafted} to send · {published} posted · {posted} logged",
            "wb.sourceOn": "on",
            "wb.sourceOff": "off",
            "wb.lastScan": "Last scan: {at}",
            "wb.emptyTitle": "Pick a draft on the left",
            "wb.emptyBody": "Or write one sentence above to draft from it. This workbench never posts for you and never touches an X account.",
            "wb.remaining": "{n} left",
            "wb.over": "{n} over",
            "wb.label.en": "#1 · English post",
            "wb.label.zh": "#2 · Chinese reply",
            "wb.copyN": "Copy #{n}",
            "wb.referenceTitle": "Reference (verbatim)",
            "wb.openSource": "Open source",
            "wb.copyOne": "Copy",
            "wb.copyLineTitle": "Copy this line",
            "wb.referenceNote": "These are CHANGELOG lines, for reference only: pick one, rewrite it into a post, then paste it above.",
            "wb.factsTitle": "Facts ({n})",
            "wb.factsNote": "Every number and version must come from here",
            "wb.sourceCol": "src",
            "wb.cardTitle": "Card 1200×675",
            "wb.cardAlt": "Card image",
            "wb.notRendered": "not rendered",
            "wb.noImage": "No image yet — render one below",
            "wb.download": "Download",
            "wb.rerender": "Re-render",
            "wb.history": "History",
            "wb.created": "Created {at}",
            "wb.save": "Save changes",
            "wb.markCopied": "Mark copied",
            "wb.publish": "Posted to X",
            "wb.discard": "Discard",
            "wb.copyDisabledTitle": "Versions not aligned; copy is disabled",
            "wb.copyDenied": "The browser blocked auto-copy; select the text and copy it yourself",
            "wb.toast.refCopied": "Reference line copied",
            "wb.toast.copyFailed": "Copy failed: ",
            "wb.toast.copiedN": "Copied #{n} ({chars} chars)",
            "wb.toast.guard": "Hold on: ",
            "wb.toast.saved": "Saved (EN {en} / ZH {zh} weighted)",
            "wb.toast.saveFailed": "Save failed: ",
            "wb.toast.statusSet": "Status: {label}",
            "wb.toast.actionFailed": "Action failed: ",
            "wb.confirm.publish": "This draft still has {pending} to fill and {blockers} blocked. Confirm you already posted the final text to X?",
            "wb.toast.posted": "Logged as posted; same source_key will not draft again",
            "wb.toast.pendingLeft": "Some placeholders are still unfilled",
            "wb.toast.blockedLeft": "Unsourced numbers found — fix the draft first",
            "wb.confirm.discard": "Discarded drafts leave the list and will not be auto-drafted again for the same source_key. Continue?",
            "wb.toast.rendered": "Card re-rendered ({engine})",
            "wb.toast.renderFailed": "Render failed: ",
            "wb.toast.collect": "Scan done: {created} new · {updated} updated · {dups} duplicates · {errors} errors",
            "wb.toast.collectSkipped": " · {n} need config",
            "wb.toast.collectFailed": "Scan failed: ",
            "wb.toast.manualCreated": "Draft created (remember to fill the placeholders)",
            "wb.toast.manualDuplicate": "That source already has a draft",
            "wb.toast.manualFailed": "Could not draft: ",
            "wb.toast.refreshed": "Refreshed",
            "wb.toast.loadFailed": "Failed to load: "
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
    // 不盲调 response.json()：空 body / 非 JSON / 非 2xx 都给出「（HTTP xxx）：原文前 200 字」的可读错误
    async function readJsonResponse(response, label) {
      const headers = response && response.headers;
      const contentType = (headers && typeof headers.get === "function" ? headers.get("content-type") : "") || "";
      let raw = "";
      try { raw = await response.text(); } catch (e) { raw = ""; }
      let json = null;
      const looksJson = raw && (contentType.indexOf("json") !== -1 || raw.trim().charAt(0) === "{" || raw.trim().charAt(0) === "[");
      if (looksJson) {
        try { json = JSON.parse(raw); } catch (e) { json = null; }
      }
      if (!response || !response.ok || !json || json.ok !== true) {
        const status = response ? response.status : 0;
        const detail = raw && raw.trim() ? raw.replace(/\s+/g, " ").slice(0, 200) : "(empty body)";
        const reason = (json && (json.error || json.code)) || detail;
        const prefix = String(label || "").replace(/[：:]\s*$/, "");
        const error = new Error(prefix + "（HTTP " + status + "）：" + reason);
        error.status = status;
        error.payload = json;
        error.raw = raw;
        throw error;
      }
      return json;
    }

    function fetchJson(path, init, label) {
      return fetch(path, init).then(function (response) { return readJsonResponse(response, label); });
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
      staleBox: { margin: "8px 12px 0", padding: "6px 9px", borderRadius: 6, fontSize: 11.5, background: "rgba(251,191,36,0.14)", border: "1px solid rgba(251,191,36,0.45)" },
      settingsBox: { margin: "0 12px 8px", padding: "8px 10px", border: "1px solid rgba(127,127,127,0.28)", borderRadius: 8, background: "rgba(127,127,127,0.06)", fontSize: 11.5, flex: "0 0 auto" },
      settingsRow: { display: "flex", alignItems: "center", gap: 8, margin: "5px 0", flexWrap: "wrap" },
      settingsLabel: { flex: "1 1 120px", opacity: 0.8 },
      settingsHint: { flex: "1 1 100%", opacity: 0.5, fontSize: 10.5 },
      settingsBtn: { border: "1px solid rgba(127,127,127,0.32)", background: "transparent", color: "inherit", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer" },
      editBox: { marginTop: 8, paddingTop: 8, borderTop: "1px dashed rgba(127,127,127,0.25)" },
      editLabel: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, opacity: 0.75, margin: "6px 0 3px" },
      textarea: { width: "100%", boxSizing: "border-box", minHeight: 64, resize: "vertical", font: "inherit", fontSize: 12, lineHeight: 1.45, color: "inherit", background: "rgba(127,127,127,0.08)", border: "1px solid rgba(127,127,127,0.28)", borderRadius: 6, padding: "6px 7px" },
      editWarn: { color: "#f87171", fontSize: 11, marginTop: 4 }
    };

    const STATUS_KEYS = { drafted: "status.drafted", copied: "status.copied", published: "status.published", discarded: "status.discarded" };

    // ---------- 客户端偏好（只存本机，不写 config.json） ----------
    const SETTINGS_KEY = "postDraft.settings";
    const DEFAULT_SETTINGS = { defaultTone: "neutral", includeFacts: true, includeVoice: true, sendMode: "send", deliveryMode: "queue" };

    function normalizeSettings(raw) {
      const value = raw && typeof raw === "object" ? raw : {};
      return {
        defaultTone: typeof value.defaultTone === "string" && value.defaultTone ? value.defaultTone : DEFAULT_SETTINGS.defaultTone,
        includeFacts: value.includeFacts === undefined ? DEFAULT_SETTINGS.includeFacts : !!value.includeFacts,
        includeVoice: value.includeVoice === undefined ? DEFAULT_SETTINGS.includeVoice : !!value.includeVoice,
        sendMode: value.sendMode === "copy" ? "copy" : "send",
        deliveryMode: value.deliveryMode === "steer" ? "steer" : "queue"
      };
    }

    function readSettings(deps) {
      const store = deps && "storage" in deps ? deps.storage : (typeof localStorage !== "undefined" ? localStorage : undefined);
      try {
        const raw = store && store.getItem(SETTINGS_KEY);
        return normalizeSettings(raw ? JSON.parse(raw) : null);
      } catch (e) { return normalizeSettings(null); }
    }

    function writeSettings(settings, deps) {
      const store = deps && "storage" in deps ? deps.storage : (typeof localStorage !== "undefined" ? localStorage : undefined);
      const clean = normalizeSettings(settings);
      try { if (store) store.setItem(SETTINGS_KEY, JSON.stringify(clean)); } catch (e) {}
      return clean;
    }

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

    // 一键投递：成功就不复制；任何失败（没有会话/被拒/报错）都自动退回复制指令
    async function deliverOrCopy(draftId, opts, deps) {
      const options = opts || {};
      const d = deps || {};
      const copyPrompt = async function (reason) {
        try {
          const text = await d.getPrompt();
          const copied = await d.copy(text);
          return { delivered: false, copied: !!(copied && copied.ok), reason: reason, copyMethod: copied && copied.method };
        } catch (error) {
          return { delivered: false, copied: false, reason: reason, copyError: String((error && error.message) || error) };
        }
      };

      if (options.sendMode === "copy") {
        const result = await copyPrompt("copy-mode");
        return Object.assign({}, result, { mode: "copy" });
      }

      let target = null;
      try {
        const listed = await d.getTarget();
        target = listed && listed.session ? listed.session : null;
      } catch (error) {
        return copyPrompt(String((error && (error.payload && (error.payload.error || error.payload.code))) || (error && error.message) || "target-failed"));
      }
      if (!target || !target.sessionId) return copyPrompt("no-session");
      if (typeof d.confirmTarget === "function" && !d.confirmTarget(target)) {
        return { delivered: false, copied: false, reason: "cancelled", mode: options.sendMode };
      }

      const requestId = typeof d.newRequestId === "function" ? d.newRequestId() : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
      try {
        const sent = await d.send({
          id: draftId,
          tone: options.tone || "",
          lang: options.lang || "zh",
          facts: options.facts !== false,
          voice: options.voice !== false,
          mode: options.deliveryMode === "steer" ? "steer" : "queue",
          sessionId: target.sessionId,
          requestId: requestId
        });
        if (sent && sent.ok) {
          return {
            delivered: true,
            copied: false,
            sessionId: sent.sessionId || target.sessionId,
            short: sent.short || target.short || String(target.sessionId).slice(0, 8),
            mode: sent.mode || options.deliveryMode || "queue",
            requestId: sent.requestId || requestId
          };
        }
        return copyPrompt(String((sent && (sent.error || sent.code)) || "rejected"));
      } catch (error) {
        const payload = error && error.payload;
        const reason = String((payload && (payload.error || payload.code)) || (error && error.message) || "send-failed");
        return copyPrompt(reason);
      }
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
      const [settings, setSettings] = React.useState(function () { return readSettings(); });
      const [settingsOpen, setSettingsOpen] = React.useState(false);
      const [hostStale, setHostStale] = React.useState(false);
      const [tones, setTones] = React.useState([]);
      const [tone, setTone] = React.useState("");
      const [editingId, setEditingId] = React.useState(null);
      const [editState, setEditState] = React.useState({ en: "", zh: "" });

      const t = function (key, vars) { return translate(lang, key, vars); };

      const load = React.useCallback(function () {
        setState(function (prev) { return { loading: true, error: null, drafts: prev.drafts }; });
        fetchJson("/post-draft/list", { method: "GET" }, t("error.load")).then(
          function (json) { setState({ loading: false, error: null, drafts: json.drafts || [] }); },
          function (error) { setState({ loading: false, error: String((error && error.message) || error), drafts: [] }); }
        );
      }, []);

      React.useEffect(function () { load(); }, [load]);

      React.useEffect(function () {
        fetch("/post-draft/tones").then(function (r) { return readJsonResponse(r, t("error.load")); }).then(function (json) {
          if (json && json.ok && Array.isArray(json.tones) && json.tones.length) {
            setTones(json.tones);
            const wanted = settings.defaultTone;
            const preferred = json.tones.filter(function (x) { return x.id === wanted; })[0] || json.tones[0];
            setTone(function (prev) { return prev || preferred.id; });
          }
        }).catch(function (error) {
          // 404/405 + 空 body = 宿主还在跑旧插件（没有 /tones、/draft 这些路由）
          if (error && (error.status === 404 || error.status === 405)) setHostStale(true);
        });
      }, []);

      function showToast(message, isError) {
        setToast({ message, isError: !!isError });
        if (typeof setTimeout === "function") setTimeout(function () { setToast(null); }, 3600);
      }

      function chooseLang(next) {
        if (next === lang) return;
        setLang(next);
        writeLang(next);
      }

      function switchLang() {
        chooseLang(lang === "zh" ? "en" : "zh");
      }

      function saveSettings(patch) {
        const next = writeSettings(Object.assign({}, settings, patch));
        setSettings(next);
        if (patch && patch.defaultTone) setTone(patch.defaultTone);
        showToast(t("settings.saved"));
      }

      function resetSettings() {
        const next = writeSettings(DEFAULT_SETTINGS);
        setSettings(next);
        setTone(next.defaultTone);
        showToast(t("settings.saved"));
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
        }, t("toast.postFailed")).then(
          function () { showToast(t("toast.posted")); load(); },
          function (error) {
            setState(function (prev) { return Object.assign({}, prev, { drafts: snapshot }); });
            showToast(t("toast.postFailed") + String((error && error.message) || error), true);
          }
        );
      }

      function fetchPromptText(id, selectedTone) {
        const params = "id=" + encodeURIComponent(id) +
          "&tone=" + encodeURIComponent(selectedTone || "") +
          "&lang=" + lang +
          "&facts=" + (settings.includeFacts ? "1" : "0") +
          "&voice=" + (settings.includeVoice ? "1" : "0");
        return fetch("/post-draft/rewrite-prompt?" + params).then(function (response) {
          if (!response.ok) {
            return response.json().then(function (json) { throw new Error((json && json.error) || ("HTTP " + response.status)); });
          }
          return response.text();
        });
      }

      function onRegenerate(id, selectedTone) {
        const toneObj = tones.filter(function (x) { return x.id === selectedTone; })[0];
        const toneLabel = toneObj ? (lang === "en" ? toneObj.labelEn : toneObj.label) : selectedTone;
        const langSnapshot = lang;
        deliverOrCopy(id, {
          tone: selectedTone,
          lang: langSnapshot,
          facts: settings.includeFacts,
          voice: settings.includeVoice,
          mode: settings.deliveryMode,
          deliveryMode: settings.deliveryMode,
          sendMode: settings.sendMode
        }, {
          getTarget: function () { return fetchJson("/post-draft/target", { method: "GET" }, t("toast.sendFailed")); },
          confirmTarget: function (target) {
            if (typeof window === "undefined" || typeof window.confirm !== "function") return true;
            return window.confirm(t("confirm.sendTo", { session: target.short || target.sessionId, cwd: target.cwd || "-" }));
          },
          send: function (payload) {
            return fetchJson("/post-draft/send-prompt", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload)
            }, t("toast.sendFailed"));
          },
          getPrompt: function () { return fetchPromptText(id, selectedTone); },
          copy: function (text) { return copyText(text); },
          newRequestId: function () {
            try {
              if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
            } catch (e) {}
            return "post-draft-" + Date.now() + "-" + Math.random().toString(36).slice(2);
          }
        }).then(function (result) {
          if (result.delivered) {
            showToast(t("toast.sent", { session: result.short || result.sessionId, mode: result.mode }));
            return;
          }
          if (result.reason === "cancelled") return;
          if (result.copied) {
            showToast(t("toast.sendFallbackCopy", { reason: result.reason }) + (result.copyMethod ? "" : ""));
            return;
          }
          showToast(t("toast.promptFailed") + String(result.copyError || result.reason || ""), true);
        }).catch(function (error) {
          showToast(t("toast.sendFailed") + String((error && error.message) || error), true);
        });
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
        const saveLabel = t("toast.saveFailed");
        // DSH 宿主的 webServer 只保证 GET/POST 转发，所以这里用 POST（服务端同时接受 PUT）
        fetch("/post-draft/draft", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: id, en: editState.en, zh: editState.zh })
        }).then(function (response) {
          return readJsonResponse(response, saveLabel);
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
            showToast(String((error && error.message) || error), true);
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
          h("button", {
            type: "button",
            style: S.langBtn,
            title: t("settings.title"),
            "aria-expanded": settingsOpen ? "true" : "false",
            onClick: function () { setSettingsOpen(!settingsOpen); }
          }, "⚙"),
          h("button", { type: "button", style: S.btn, title: t("app.refresh"), onClick: load }, t("app.refresh"))
        ),
        settingsOpen ? h("div", { style: S.settingsBox },
          h("div", { style: S.settingsRow },
            h("span", { style: S.settingsLabel }, t("settings.defaultTone")),
            h("select", {
              style: S.toneSelect,
              value: settings.defaultTone,
              onChange: function (e) { saveSettings({ defaultTone: e.target.value }); }
            },
              tones.length
                ? tones.map(function (tone) { return h("option", { key: tone.id, value: tone.id }, lang === "en" ? tone.labelEn : tone.label); })
                : h("option", { value: settings.defaultTone }, settings.defaultTone)
            )
          ),
          h("div", { style: S.settingsRow },
            h("span", { style: S.settingsLabel }, t("settings.language")),
            h("button", { type: "button", style: lang === "zh" ? S.langBtn : S.settingsBtn, onClick: function () { chooseLang("zh"); } }, t("settings.lang.zh")),
            h("button", { type: "button", style: lang === "en" ? S.langBtn : S.settingsBtn, onClick: function () { chooseLang("en"); } }, t("settings.lang.en"))
          ),
          h("div", { style: S.settingsRow },
            h("span", { style: S.settingsLabel }, t("settings.includeFacts")),
            h("button", {
              type: "button",
              style: settings.includeFacts ? S.langBtn : S.settingsBtn,
              "data-setting": "includeFacts",
              onClick: function () { saveSettings({ includeFacts: !settings.includeFacts }); }
            }, settings.includeFacts ? t("settings.on") : t("settings.off"))
          ),
          h("div", { style: S.settingsRow },
            h("span", { style: S.settingsLabel }, t("settings.includeVoice")),
            h("button", {
              type: "button",
              style: settings.includeVoice ? S.langBtn : S.settingsBtn,
              "data-setting": "includeVoice",
              onClick: function () { saveSettings({ includeVoice: !settings.includeVoice }); }
            }, settings.includeVoice ? t("settings.on") : t("settings.off"))
          ),
          h("div", { style: S.settingsRow },
            h("span", { style: S.settingsLabel }, t("settings.sendMode")),
            h("button", {
              type: "button",
              style: S.settingsBtn,
              "data-setting": "sendMode",
              onClick: function () { saveSettings({ sendMode: settings.sendMode === "send" ? "copy" : "send" }); }
            }, settings.sendMode === "send" ? t("settings.sendMode.send") : t("settings.sendMode.copy"))
          ),
          h("div", { style: S.settingsRow },
            h("span", { style: S.settingsLabel }, t("settings.deliveryMode")),
            h("button", {
              type: "button",
              style: S.settingsBtn,
              "data-setting": "deliveryMode",
              onClick: function () { saveSettings({ deliveryMode: settings.deliveryMode === "queue" ? "steer" : "queue" }); }
            }, settings.deliveryMode === "queue" ? t("settings.deliveryMode.queue") : t("settings.deliveryMode.steer"))
          ),
          h("div", { style: S.settingsRow },
            h("button", { type: "button", style: S.settingsBtn, onClick: resetSettings }, t("settings.reset")),
            h("button", { type: "button", style: S.settingsBtn, onClick: function () { setSettingsOpen(false); } }, t("settings.close"))
          ),
          h("div", { style: S.settingsHint }, t("settings.hint"))
        ) : null,
        hostStale ? h("div", { style: S.staleBox }, t("host.stale")) : null,
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
        LANG_KEY: LANG_KEY,
        readJsonResponse: readJsonResponse,
        deliverOrCopy: deliverOrCopy,
        normalizeSettings: normalizeSettings,
        readSettings: readSettings,
        writeSettings: writeSettings,
        DEFAULT_SETTINGS: DEFAULT_SETTINGS,
        SETTINGS_KEY: SETTINGS_KEY
      }
    };
  }
});