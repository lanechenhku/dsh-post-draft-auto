/* 出稿工作台前端：无框架、无构建、只调本机 /api。界面文案全部走 window.DSH_I18N（与 lib/i18n.mjs 同源） */
(function () {
  "use strict";

  // 文案表由 lib/i18n.mjs 生成（tests/i18n.test.mjs 比对两者，防止漂移）
  var STRINGS = {
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
  var LANG_KEY = "postDraft.lang";
  var I = {
    STRINGS: STRINGS,
    LANGS: ["zh", "en"],
    DEFAULT_LANG: "zh",
    LANG_KEY: LANG_KEY,
    t: function (lang, key, vars) {
      var table = STRINGS[lang] || STRINGS.zh;
      var text = table[key];
      if (text === undefined) text = STRINGS.zh[key];
      if (text === undefined) return key;
      if (vars) Object.keys(vars).forEach(function (k) { text = text.split("{" + k + "}").join(String(vars[k])); });
      return text;
    },
    readLang: function () {
      try { return localStorage.getItem(LANG_KEY) === "en" ? "en" : "zh"; } catch (e) { return "zh"; }
    },
    writeLang: function (lang) {
      try { localStorage.setItem(LANG_KEY, lang === "en" ? "en" : "zh"); } catch (e) {}
    }
  };
  var LANG = I.readLang();
  function T(key, vars) { return I.t(LANG, key, vars); }

  var S = { drafts: [], state: null, selected: null, filter: "all", timer: null };
  var STATUS_KEYS = { discovered: "wb.status.discovered", drafted: "status.drafted", copied: "status.copied", published: "status.published", discarded: "status.discarded" };
  var GUARD_KEYS = {
    "pending-rollout": "wb.guard.pendingRollout",
    "online-newer": "wb.guard.onlineNewer",
    "local-missing": "wb.guard.localMissing",
    unparsable: "wb.guard.unparsable"
  };

  function statusLabel(status) { return STATUS_KEYS[status] ? T(STATUS_KEYS[status]) : status; }
  function guardLabel(kind) { return GUARD_KEYS[kind] ? T(GUARD_KEYS[kind]) : kind; }

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  async function api(path, opts) {
    var init = Object.assign({ headers: { "content-type": "application/json" } }, opts || {});
    var res = await fetch(path, init);
    var ct = res.headers.get("content-type") || "";
    var data = ct.indexOf("application/json") !== -1 ? await res.json() : await res.text();
    if (!res.ok) {
      var err = new Error(typeof data === "string" ? data : (data && data.error) || ("HTTP " + res.status));
      err.data = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  var toastTimer = null;
  function toast(msg, isErr) {
    var el = $("toast");
    el.textContent = msg;
    el.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = "toast" + (isErr ? " err" : ""); }, 2600);
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch (e) { /* 落到 execCommand */ }
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "readonly");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (!ok) throw new Error(T("wb.copyDenied"));
  }

  function fmtTime(iso) {
    if (!iso) return "";
    return String(iso).slice(0, 16).replace("T", " ");
  }

  function badge(status) {
    return '<span class="badge ' + esc(status) + '">' + esc(statusLabel(status)) + "</span>";
  }

  // ---------- 语言 ----------
  function applyStatic() {
    document.documentElement.lang = LANG === "en" ? "en" : "zh-CN";
    document.title = T("wb.docTitle");
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      el.textContent = T(el.getAttribute("data-i18n"));
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-placeholder]"), function (el) {
      el.setAttribute("placeholder", T(el.getAttribute("data-i18n-placeholder")));
    });
    var langBtn = $("langBtn");
    if (langBtn) {
      langBtn.textContent = T("app.lang");
      langBtn.title = T("app.langTitle");
    }
    var collectBtn = $("collectBtn");
    if (collectBtn && collectBtn.disabled) collectBtn.textContent = T("wb.collecting");
  }

  // 切换语言前把详情面板里未保存的编辑读回来，避免重渲染丢字
  function captureEdits() {
    if (!S.selected) return;
    var en = $("enText");
    var zh = $("zhText");
    if (en) S.selected.enText = en.value;
    if (zh) S.selected.zhText = zh.value;
  }

  function switchLang() {
    captureEdits();
    LANG = LANG === "zh" ? "en" : "zh";
    I.writeLang(LANG);
    applyStatic();
    renderList();
    renderSide();
    if (S.selected) renderDetail();
  }

  // ---------- 列表 ----------
  async function loadList() {
    var q = S.filter === "all" ? "" : "?status=" + encodeURIComponent(S.filter);
    var r = await api("/api/drafts" + q);
    S.drafts = r.drafts || [];
    renderList();
  }

  function renderList() {
    var box = $("list");
    if (!S.drafts.length) {
      box.innerHTML = '<p class="muted small" style="padding:8px">' + esc(T("wb.listEmpty")) + "</p>";
      return;
    }
    box.innerHTML = S.drafts.map(function (d) {
      var active = S.selected && S.selected.id === d.id ? " active" : "";
      var flags = [];
      if (d.generatedBy === "model") flags.push('<span style="color:var(--accent)">' + esc(T("wb.ai")) + "</span>");
      else flags.push('<span class="muted">' + esc(T("wb.template")) + "</span>");
      if (d.guard) flags.push('<span style="color:var(--bad)">' + esc(guardLabel(d.guard)) + "</span>");
      if (d.pendingCount) flags.push('<span class="muted">' + esc(T("wb.pendingCount", { n: d.pendingCount })) + "</span>");
      if (d.blockerCount) flags.push('<span style="color:var(--bad)">' + esc(T("wb.blockerCount", { n: d.blockerCount })) + "</span>");
      return '<div class="item' + active + '" data-id="' + esc(d.id) + '">' +
        "<h4>" + esc(d.title || d.id) + "</h4>" +
        '<div class="row">' + badge(d.status) +
        '<span class="muted small">' + esc((d.source && d.source.kind) || "") + "</span>" +
        '<span class="muted small">' + esc(fmtTime(d.createdAt)) + "</span></div>" +
        '<div class="row small">' + flags.join(" ") + "</div>" +
        "</div>";
    }).join("");

    Array.prototype.forEach.call(box.querySelectorAll(".item"), function (el) {
      el.addEventListener("click", function () { openDraft(el.getAttribute("data-id")); });
    });
  }

  function renderSide() {
    var st = S.state || {};
    var c = st.counts || {};
    $("stats").textContent = T("wb.stats", {
      total: st.total || 0,
      drafted: c.drafted || 0,
      published: c.published || 0,
      posted: st.postedCount || 0
    });
    var src = st.sources || [];
    var html = src.map(function (g) {
      return g.items.map(function (it) {
        var on = it.enabled ? T("wb.sourceOn") : T("wb.sourceOff");
        var color = it.enabled ? "var(--ok)" : "var(--muted)";
        return '<div style="margin:4px 0"><span style="color:' + color + '">[' + esc(on) + "]</span> " +
          esc(g.kind) + " · " + esc(it.label) +
          (it.target ? ' <span class="muted">' + esc(it.target) + "</span>" : "") + "</div>";
      }).join("");
    }).join("");
    $("sources").innerHTML = html + (st.lastCollectAt
      ? '<div class="muted" style="margin-top:6px">' + esc(T("wb.lastScan", { at: fmtTime(st.lastCollectAt) })) + "</div>" : "");
  }

  // ---------- 详情 ----------
  async function openDraft(id) {
    S.selected = await api("/api/drafts/" + encodeURIComponent(id));
    if (location.hash.slice(1) !== id) location.hash = id;
    renderList();
    renderDetail();
  }

  function meterHtml(weight, limit) {
    var pct = Math.min(100, Math.round((weight / limit) * 100));
    var over = weight > limit;
    return '<div class="bar"><i class="' + (over ? "over" : "") + '" style="width:' + pct + '%"></i></div>';
  }

  function setMeter(part, weight, limit) {
    var m = $(part === "en" ? "m-en" : "m-zh");
    var b = $(part === "en" ? "b-en" : "b-zh");
    var hint = $(part === "en" ? "hint-en" : "hint-zh");
    if (!m || !b) return;
    var over = weight > limit;
    m.textContent = weight + "/" + limit;
    m.className = "meter" + (over ? " over" : "");
    b.style.width = Math.min(100, Math.round((weight / limit) * 100)) + "%";
    b.className = over ? "over" : "";
    if (hint) hint.textContent = over ? T("wb.over", { n: weight - limit }) : T("wb.remaining", { n: limit - weight });
  }

  function alertsHtml(d) {
    var parts = [];
    if (d.guard) {
      parts.push('<div class="alert bad"><strong>🚫 ' + esc(T("wb.toast.guard")) + esc(guardLabel(d.guard.kind)) + "</strong>" +
        "<br/>" + esc(d.guard.message || "") +
        '<br/><span class="small">' + esc(d.guard.online || "?") + " · " + esc(d.guard.local || "?") + "</span></div>");
    }
    if ((d.blockers || []).length) {
      d.blockers.forEach(function (b) {
        var detail = Array.isArray(b.detail) ? b.detail.join(", ") : String(b.detail);
        parts.push('<div class="alert bad"><strong>' + esc(T("wb.blockerCount", { n: (d.blockers || []).length })) + "</strong>" + esc(b.hint || b.kind) +
          "<ul><li>" + esc(detail) + "</li></ul></div>");
      });
    }
    if ((d.pending || []).length) {
      parts.push('<div class="alert warn"><strong>' + esc(T("wb.pendingCount", { n: d.pending.length })) + "</strong><ul>" +
        d.pending.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div>");
    }
    return parts.join("");
  }

  function tweetBoxHtml(part, label, text, weight, limit) {
    var id = part + "Text";
    var over = weight > limit;
    return '<section class="box tweet">' +
      '<header><span class="label">' + esc(label) + '</span>' +
      '<span class="meter' + (over ? " over" : "") + '" id="m-' + part + '">' + weight + "/" + limit + "</span></header>" +
      meterHtml(weight, limit).replace('<div class="bar"><i class="', '<div class="bar"><i id="b-' + part + '" class="') +
      '<textarea id="' + id + '" data-part="' + part + '">' + esc(text) + "</textarea>" +
      '<div class="rowbtns">' +
      '<button class="primary" data-copy="' + part + '">' + esc(T("wb.copyN", { n: part === "en" ? 1 : 2 })) + "</button>" +
      '<span class="muted small" id="hint-' + part + '">' + esc(over ? T("wb.over", { n: weight - limit }) : T("wb.remaining", { n: limit - weight })) + "</span>" +
      "</div></section>";
  }

  function referenceHtml(d) {
    var r = d.reference;
    if (!r) return "";
    var lines = (r.lines || []).map(function (x) {
      return '<li style="margin:6px 0"><button class="ghost" data-ref-copy="' + esc(x.text) + '" title="' + esc(T("wb.copyLineTitle")) + '">' + esc(T("wb.copyOne")) + "</button> " +
        esc(x.text) + ' <span class="muted small">L' + esc(x.line) + "</span></li>";
    }).join("");
    return '<section class="box"><header><span class="label">' + esc(T("wb.referenceTitle")) + "</span>" +
      '<a class="muted small" href="' + esc(r.sourceUrl) + '">' + esc(T("wb.openSource")) + "</a></header>" +
      '<p class="small">' + esc(r.title) + "</p>" +
      (lines ? '<ul class="small" style="padding-left:18px">' + lines + "</ul>" : "") +
      '<p class="muted small">' + esc(T("wb.referenceNote")) + "</p></section>";
  }

  function factsHtml(d) {
    var rows = (d.facts || []).map(function (f) {
      var val = f.detail || f.value || "";
      return "<tr><td class='k'>" + esc(f.kind) + "</td><td>" + esc(val) + "</td><td>" +
        (f.sourceUrl ? '<a href="' + esc(f.sourceUrl) + '" target="_blank" rel="noreferrer">' + esc(T("wb.sourceCol")) + "</a>" : '<span class="muted">—</span>') +
        "</td></tr>";
    }).join("");
    return '<section class="box"><header><span class="label">' + esc(T("wb.factsTitle", { n: (d.facts || []).length })) + "</span>" +
      '<span class="muted small">' + esc(T("wb.factsNote")) + "</span></header>" +
      '<table class="facts">' + rows + "</table></section>";
  }

  function renderDetail() {
    var d = S.selected;
    if (!d) return;
    var media = d.media || {};
    var img = media.png || media.svg || "";
    var srcUrl = (d.source && d.source.url) || "";
    var genBadge = d.generatedBy === "model"
      ? '<span class="badge" style="color:#7dd3fc;border-color:#0e4a6b;background:#082f49">' + esc(T("wb.ai")) + "</span>"
      : '<span class="badge">' + esc(T("wb.template")) + "</span>";
    var meta = badge(d.status) + genBadge +
      "<span>" + esc((d.source && d.source.kind) || "") + " · " +
      (srcUrl ? '<a href="' + esc(srcUrl) + '" target="_blank" rel="noreferrer">' + esc(d.source.label || srcUrl) + "</a>" : esc(d.source.label || "")) +
      "</span>" +
      "<span>" + esc(T("wb.created", { at: fmtTime(d.createdAt) })) + "</span>" +
      '<span class="muted">' + esc(d.sourceKey) + "</span>";

    var html = '<div class="d-head"><h2>' + esc(d.title || d.id) + '</h2><div class="meta">' + meta + "</div></div>" +
      alertsHtml(d) +
      '<div class="grid"><div>' +
      tweetBoxHtml("en", T("wb.label.en"), d.enText, d.enWeight, d.limit) +
      tweetBoxHtml("zh", T("wb.label.zh"), d.zhText, d.zhWeight, d.limit) +
      "</div><div>" +
      '<section class="box"><header><span class="label">' + esc(T("wb.cardTitle")) + '</span><span class="muted small">' +
      esc(media.engine || T("wb.notRendered")) + "</span></header>" +
      (img ? '<img class="cardimg" src="' + esc(img) + '" alt="' + esc(T("wb.cardAlt")) + '">' : '<p class="muted small">' + esc(T("wb.noImage")) + "</p>") +
      '<div class="rowbtns">' +
      (img ? '<a class="btn primary" href="' + esc(img) + '" download="' + esc(d.id + (media.png ? ".png" : ".svg")) + '">' + esc(T("wb.download")) + "</a>" : "") +
      '<button id="rerenderBtn">' + esc(T("wb.rerender")) + "</button>" +
      (media.reason ? '<span class="muted small">' + esc(media.reason) + "</span>" : "") +
      "</div></section>" +
      referenceHtml(d) +
      factsHtml(d) +
      '<section class="box"><header><span class="label">' + esc(T("wb.history")) + '</span></header><ul class="small muted">' +
      (d.history || []).map(function (h) { return "<li>" + esc(fmtTime(h.at)) + " · " + esc(h.event) + (h.note ? " · " + esc(h.note) : "") + "</li>"; }).join("") +
      "</ul></section>" +
      "</div></div>" +
      '<div class="actions">' +
      '<button class="primary" id="saveBtn">' + esc(T("wb.save")) + "</button>" +
      '<button id="copiedBtn">' + esc(T("wb.markCopied")) + "</button>" +
      '<button class="primary" id="publishedBtn"' + (d.guard ? " disabled" : "") + ">" + esc(T("wb.publish")) + "</button>" +
      '<div class="spacer"></div>' +
      '<button class="danger" id="discardBtn">' + esc(T("wb.discard")) + "</button>" +
      "</div>";

    $("detail").innerHTML = html;
    bindDetail(d);
  }

  function bindDetail(d) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"), function (btn) {
      if (d.guard) { btn.disabled = true; btn.title = T("wb.copyDisabledTitle"); }
      btn.addEventListener("click", function () { copyPart(btn.getAttribute("data-copy")); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("textarea[data-part]"), function (ta) {
      ta.addEventListener("input", function () { scheduleWeigh(ta.getAttribute("data-part")); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-ref-copy]"), function (btn) {
      btn.addEventListener("click", async function () {
        try {
          await copyToClipboard(btn.getAttribute("data-ref-copy"));
          toast(T("wb.toast.refCopied"));
        } catch (e) { toast(T("wb.toast.copyFailed") + e.message, true); }
      });
    });
    var rerender = $("rerenderBtn");
    if (rerender) rerender.addEventListener("click", rerenderCard);
    $("saveBtn").addEventListener("click", saveEdit);
    $("copiedBtn").addEventListener("click", function () { setStatus("copied"); });
    $("publishedBtn").addEventListener("click", publish);
    $("discardBtn").addEventListener("click", discard);
  }

  function scheduleWeigh(part) {
    clearTimeout(S.timer);
    S.timer = setTimeout(async function () {
      var ta = $(part + "Text");
      if (!ta) return;
      try {
        var r = await api("/api/weigh", { method: "POST", body: JSON.stringify({ text: ta.value }) });
        setMeter(part, r.weight, r.limit);
      } catch (e) { /* 静默 */ }
    }, 220);
  }

  async function copyPart(part) {
    if (!S.selected) return;
    if (S.selected.guard) { toast(T("wb.toast.guard") + (S.selected.guard.message || ""), true); return; }
    try {
      var txt = await api("/api/drafts/" + encodeURIComponent(S.selected.id) + "/copy?part=" + part);
      await copyToClipboard(txt);
      toast(T("wb.toast.copiedN", { n: part === "en" ? 1 : 2, chars: String(txt).length }));
      try {
        await api("/api/drafts/" + encodeURIComponent(S.selected.id) + "/status", {
          method: "POST", body: JSON.stringify({ status: "copied" })
        });
        await refreshAll();
      } catch (e) { /* 状态可能已是 published，忽略 */ }
    } catch (e) {
      toast(T("wb.toast.copyFailed") + e.message, true);
    }
  }

  async function saveEdit() {
    if (!S.selected) return;
    try {
      var r = await api("/api/drafts/" + encodeURIComponent(S.selected.id), {
        method: "PATCH",
        body: JSON.stringify({ enText: $("enText").value, zhText: $("zhText").value })
      });
      S.selected = r.draft;
      renderDetail();
      await loadList();
      toast(T("wb.toast.saved", { en: r.draft.enWeight, zh: r.draft.zhWeight }));
    } catch (e) {
      toast(T("wb.toast.saveFailed") + e.message, true);
    }
  }

  async function setStatus(status) {
    if (!S.selected) return;
    try {
      await api("/api/drafts/" + encodeURIComponent(S.selected.id) + "/status", {
        method: "POST", body: JSON.stringify({ status: status })
      });
      await refreshAll();
      toast(T("wb.toast.statusSet", { label: statusLabel(status) }));
    } catch (e) {
      toast(T("wb.toast.actionFailed") + e.message, true);
    }
  }

  async function publish() {
    if (!S.selected) return;
    if (S.selected.guard) { toast(T("wb.toast.guard") + (S.selected.guard.message || ""), true); return; }
    var d = S.selected;
    var issues = (d.pending || []).length + (d.blockers || []).length;
    var override = false;
    if (issues) {
      if (!confirm(T("wb.confirm.publish", { pending: (d.pending || []).length, blockers: (d.blockers || []).length }))) return;
      override = true;
    }
    try {
      await api("/api/drafts/" + encodeURIComponent(d.id) + "/status", {
        method: "POST", body: JSON.stringify({ status: "published", override: override })
      });
      await refreshAll();
      toast(T("wb.toast.posted"));
    } catch (e) {
      if (e.data && e.data.error === "pending") {
        toast(T("wb.toast.pendingLeft"), true);
      } else if (e.data && e.data.error === "blocked") {
        toast(T("wb.toast.blockedLeft"), true);
      } else {
        toast(T("wb.toast.actionFailed") + e.message, true);
      }
    }
  }

  async function discard() {
    if (!S.selected) return;
    if (!confirm(T("wb.confirm.discard"))) return;
    await setStatus("discarded");
  }

  async function rerenderCard() {
    if (!S.selected) return;
    try {
      var r = await api("/api/drafts/" + encodeURIComponent(S.selected.id) + "/render-card", { method: "POST" });
      S.selected.media = r.media;
      renderDetail();
      toast(T("wb.toast.rendered", { engine: r.media.engine }));
    } catch (e) {
      toast(T("wb.toast.renderFailed") + e.message, true);
    }
  }

  // ---------- 全局 ----------
  async function refreshAll() {
    S.state = await api("/api/state");
    await loadList();
    renderSide();
    if (S.selected) {
      try {
        S.selected = await api("/api/drafts/" + encodeURIComponent(S.selected.id));
        renderDetail();
      } catch (e) { S.selected = null; }
    }
  }

  async function runCollect() {
    var btn = $("collectBtn");
    btn.disabled = true;
    btn.textContent = T("wb.collecting");
    try {
      var r = await api("/api/collect", { method: "POST", body: JSON.stringify({ force: false }) });
      var created = r.results.filter(function (x) { return x.status === "created"; });
      var errors = r.results.filter(function (x) { return x.status === "error"; });
      var skipped = r.results.filter(function (x) { return x.status === "skipped"; });
      var updated = r.results.filter(function (x) { return x.status === "updated"; });
      var dups = r.results.filter(function (x) { return x.status === "duplicate"; });
      console.log("collect", r.results);
      var summary = T("wb.toast.collect", { created: created.length, updated: updated.length, dups: dups.length, errors: errors.length });
      if (skipped.length) summary += T("wb.toast.collectSkipped", { n: skipped.length });
      toast(summary, errors.length > 0 || skipped.length > 0);
      if (skipped.length) console.warn("skipped:", skipped);
      if (errors.length) console.warn("source errors:", errors);
      await refreshAll();
      if (created.length) await openDraft(created[0].draftId);
    } catch (e) {
      toast(T("wb.toast.collectFailed") + e.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = T("wb.collect");
    }
  }

  function bindGlobal() {
    Array.prototype.forEach.call(document.querySelectorAll("#filters .chip"), function (c) {
      c.addEventListener("click", function () {
        Array.prototype.forEach.call(document.querySelectorAll("#filters .chip"), function (x) { x.classList.remove("active"); });
        c.classList.add("active");
        S.filter = c.getAttribute("data-filter");
        loadList();
      });
    });
    $("langBtn").addEventListener("click", switchLang);
    $("collectBtn").addEventListener("click", runCollect);
    $("refreshBtn").addEventListener("click", function () { refreshAll(); toast(T("wb.toast.refreshed")); });
    $("manualForm").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var text = $("manualText").value.trim();
      if (!text) return;
      try {
        var r = await api("/api/manual", { method: "POST", body: JSON.stringify({ text: text }) });
        $("manualText").value = "";
        await refreshAll();
        await openDraft(r.draft.id);
        toast(r.created ? T("wb.toast.manualCreated") : T("wb.toast.manualDuplicate"));
      } catch (e) {
        toast(T("wb.toast.manualFailed") + e.message, true);
      }
    });
  }

  // 支持 ?lang=en / ?lang=zh 深链（便于分享与验收），仍然会写回 localStorage
  var urlLang = new URLSearchParams(location.search).get("lang");
  if (urlLang === "en" || urlLang === "zh") {
    I.writeLang(urlLang);
    LANG = urlLang;
  }

  applyStatic();
  bindGlobal();
  refreshAll().then(function () {
    // 支持 #d-xxxx 深链（刷新后还能停在同一条草稿上）
    var hash = decodeURIComponent(location.hash.slice(1));
    if (hash) {
      api("/api/drafts/" + encodeURIComponent(hash)).then(function (d) {
        S.selected = d;
        renderList();
        renderDetail();
      }).catch(function () { /* 草稿可能已被删 */ });
    }
  }).catch(function (e) { toast(T("wb.toast.loadFailed") + e.message, true); });
})();