/* 出稿工作台前端：无框架、无构建、只调本机 /api */
(function () {
  "use strict";

  var S = { drafts: [], state: null, selected: null, filter: "all", timer: null };
  var LABELS = { discovered: "已发现", drafted: "待发", copied: "已复制", published: "已发", discarded: "丢弃" };
  var GUARD_LABELS = {
    "pending-rollout": "待上线",
    "online-newer": "版本不一致",
    "local-missing": "缺本地版本",
    unparsable: "版本不可比"
  };

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
    if (!ok) throw new Error("浏览器不允许自动复制，请手动选中文本框内容");
  }

  function fmtTime(iso) {
    if (!iso) return "";
    return String(iso).slice(0, 16).replace("T", " ");
  }

  function badge(status) {
    return '<span class="badge ' + esc(status) + '">' + esc(LABELS[status] || status) + "</span>";
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
      box.innerHTML = '<p class="muted small" style="padding:8px">没有草稿。点「扫描源」或上面手动出稿。</p>';
      return;
    }
    box.innerHTML = S.drafts.map(function (d) {
      var active = S.selected && S.selected.id === d.id ? " active" : "";
      var flags = [];
      if (d.generatedBy === "model") flags.push('<span style="color:var(--accent)">AI 生成</span>');
      else flags.push('<span class="muted">模板生成</span>');
      if (d.guard) flags.push('<span style="color:var(--bad)">' + esc(GUARD_LABELS[d.guard] || d.guard) + "</span>");
      if (d.pendingCount) flags.push('<span class="muted">' + d.pendingCount + " 待补</span>");
      if (d.blockerCount) flags.push('<span style="color:var(--bad)">' + d.blockerCount + " 阻断</span>");
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
    $("stats").textContent = "共 " + (st.total || 0) + " 条 · 待发 " + (c.drafted || 0) +
      " · 已发 " + (c.published || 0) + " · 台账 " + (st.postedCount || 0) + " 条";
    var src = st.sources || [];
    var html = src.map(function (g) {
      return g.items.map(function (it) {
        var on = it.enabled ? "开" : "关";
        var color = it.enabled ? "var(--ok)" : "var(--muted)";
        return '<div style="margin:4px 0"><span style="color:' + color + '">[' + on + "]</span> " +
          esc(g.kind) + " · " + esc(it.label) +
          (it.target ? ' <span class="muted">' + esc(it.target) + "</span>" : "") + "</div>";
      }).join("");
    }).join("");
    $("sources").innerHTML = html + (st.lastCollectAt
      ? '<div class="muted" style="margin-top:6px">上次扫描：' + esc(fmtTime(st.lastCollectAt)) + "</div>" : "");
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
    if (hint) hint.textContent = over ? "超了 " + (weight - limit) + " 计权" : "剩余 " + (limit - weight) + " 计权";
  }

  function alertsHtml(d) {
    var parts = [];
    if (d.guard) {
      parts.push('<div class="alert bad"><strong>🚫 先别发：' + esc(GUARD_LABELS[d.guard.kind] || d.guard.kind) + "</strong>" +
        "<br/>" + esc(d.guard.message || "") +
        '<br/><span class="small">线上 ' + esc(d.guard.online || "?") + " · 本地 " + esc(d.guard.local || "?") +
        "。两侧版本号相等后这条会自动解封（重新扫描一次即可）。</span></div>");
    }
    if ((d.blockers || []).length) {
      d.blockers.forEach(function (b) {
        var detail = Array.isArray(b.detail) ? b.detail.join(", ") : String(b.detail);
        parts.push('<div class="alert bad"><strong>不能发：</strong>' + esc(b.hint || b.kind) +
          "<ul><li>未溯源：" + esc(detail) + "</li></ul></div>");
      });
    }
    if ((d.pending || []).length) {
      parts.push('<div class="alert warn"><strong>还有 ' + d.pending.length + " 处待补：</strong><ul>" +
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
      '<button class="primary" data-copy="' + part + '">复制第 ' + (part === "en" ? 1 : 2) + " 条</button>" +
      '<span class="muted small" id="hint-' + part + '">剩余 ' + (limit - weight) + " 计权</span>" +
      "</div></section>";
  }

  function referenceHtml(d) {
    var r = d.reference;
    if (!r) return "";
    var lines = (r.lines || []).map(function (x) {
      return '<li style="margin:6px 0"><button class="ghost" data-ref-copy="' + esc(x.text) + '" title="复制这句">复制</button> ' +
        esc(x.text) + ' <span class="muted small">L' + esc(x.line) + "</span></li>";
    }).join("");
    return '<section class="box"><header><span class="label">参考素材（原文）</span>' +
      '<a class="muted small" href="' + esc(r.sourceUrl) + '">打开源文件</a></header>' +
      '<p class="small">' + esc(r.title) + "</p>" +
      (lines ? '<ul class="small" style="padding-left:18px">' + lines + "</ul>" : "") +
      '<p class="muted small">这些是 CHANGELOG 原话，只作参考：你挑一句改成推文再填入上面的稿子。</p></section>';
  }

  function factsHtml(d) {
    var rows = (d.facts || []).map(function (f) {
      var val = f.detail || f.value || "";
      return "<tr><td class='k'>" + esc(f.kind) + "</td><td>" + esc(val) + "</td><td>" +
        (f.sourceUrl ? '<a href="' + esc(f.sourceUrl) + '" target="_blank" rel="noreferrer">源</a>' : '<span class="muted">—</span>') +
        "</td></tr>";
    }).join("");
    return '<section class="box"><header><span class="label">事实（' + (d.facts || []).length + '）</span>' +
      '<span class="muted small">所有数字/版本号都必须在这里</span></header>' +
      '<table class="facts">' + rows + "</table></section>";
  }

  function renderDetail() {
    var d = S.selected;
    if (!d) return;
    var media = d.media || {};
    var img = media.png || media.svg || "";
    var srcUrl = (d.source && d.source.url) || "";
    var genBadge = d.generatedBy === "model"
      ? '<span class="badge" style="color:#7dd3fc;border-color:#0e4a6b;background:#082f49">AI 生成</span>'
      : '<span class="badge">模板生成（fallback）</span>';
    var meta = badge(d.status) + genBadge +
      '<span>' + esc((d.source && d.source.kind) || "") + " · " +
      (srcUrl ? '<a href="' + esc(srcUrl) + '" target="_blank" rel="noreferrer">' + esc(d.source.label || srcUrl) + "</a>" : esc(d.source.label || "")) +
      "</span>" +
      '<span>创建 ' + esc(fmtTime(d.createdAt)) + "</span>" +
      '<span class="muted">' + esc(d.sourceKey) + "</span>";

    var html = '<div class="d-head"><h2>' + esc(d.title || d.id) + '</h2><div class="meta">' + meta + "</div></div>" +
      alertsHtml(d) +
      '<div class="grid"><div>' +
      tweetBoxHtml("en", "第 1 条 · 英文主推", d.enText, d.enWeight, d.limit) +
      tweetBoxHtml("zh", "第 2 条 · 中文回复", d.zhText, d.zhWeight, d.limit) +
      "</div><div>" +
      '<section class="box"><header><span class="label">卡片图 1200×675</span><span class="muted small">' +
      esc(media.engine || "未渲染") + "</span></header>" +
      (img ? '<img class="cardimg" src="' + esc(img) + '" alt="卡片图">' : '<p class="muted small">还没有图，点下面重新渲染</p>') +
      '<div class="rowbtns">' +
      (img ? '<a class="btn primary" href="' + esc(img) + '" download="' + esc(d.id + (media.png ? ".png" : ".svg")) + '">下载图片</a>' : "") +
      '<button id="rerenderBtn">重新渲染</button>' +
      (media.reason ? '<span class="muted small">' + esc(media.reason) + "</span>" : "") +
      "</div></section>" +
      referenceHtml(d) +
      factsHtml(d) +
      '<section class="box"><header><span class="label">历史</span></header><ul class="small muted">' +
      (d.history || []).map(function (h) { return "<li>" + esc(fmtTime(h.at)) + " · " + esc(h.event) + (h.note ? " · " + esc(h.note) : "") + "</li>"; }).join("") +
      "</ul></section>" +
      "</div></div>" +
      '<div class="actions">' +
      '<button class="primary" id="saveBtn">保存修改</button>' +
      '<button id="copiedBtn">标记已复制</button>' +
      '<button class="primary" id="publishedBtn"' + (d.guard ? " disabled" : "") + ">已发到 X</button>" +
      '<div class="spacer"></div>' +
      '<button class="danger" id="discardBtn">丢弃</button>' +
      "</div>";

    $("detail").innerHTML = html;
    bindDetail(d);
  }

  function bindDetail(d) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"), function (btn) {
      if (d.guard) { btn.disabled = true; btn.title = "版本未对齐，暂不能复制"; }
      btn.addEventListener("click", function () { copyPart(btn.getAttribute("data-copy")); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("textarea[data-part]"), function (ta) {
      ta.addEventListener("input", function () { scheduleWeigh(ta.getAttribute("data-part")); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-ref-copy]"), function (btn) {
      btn.addEventListener("click", async function () {
        try {
          await copyToClipboard(btn.getAttribute("data-ref-copy"));
          toast("已复制参考句");
        } catch (e) { toast("复制失败：" + e.message, true); }
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
    if (S.selected.guard) { toast("先别发：" + (S.selected.guard.message || "版本未对齐"), true); return; }
    try {
      var txt = await api("/api/drafts/" + encodeURIComponent(S.selected.id) + "/copy?part=" + part);
      await copyToClipboard(txt);
      toast("已复制第 " + (part === "en" ? 1 : 2) + " 条（" + String(txt).length + " 字符）");
      try {
        await api("/api/drafts/" + encodeURIComponent(S.selected.id) + "/status", {
          method: "POST", body: JSON.stringify({ status: "copied" })
        });
        await refreshAll();
      } catch (e) { /* 状态可能已是 published，忽略 */ }
    } catch (e) {
      toast("复制失败：" + e.message, true);
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
      toast("已保存（EN " + r.draft.enWeight + " / ZH " + r.draft.zhWeight + " 计权）");
    } catch (e) {
      toast("保存失败：" + e.message, true);
    }
  }

  async function setStatus(status) {
    if (!S.selected) return;
    try {
      await api("/api/drafts/" + encodeURIComponent(S.selected.id) + "/status", {
        method: "POST", body: JSON.stringify({ status: status })
      });
      await refreshAll();
      toast("状态：" + (LABELS[status] || status));
    } catch (e) {
      toast("操作失败：" + e.message, true);
    }
  }

  async function publish() {
    if (!S.selected) return;
    if (S.selected.guard) { toast("先别发：" + (S.selected.guard.message || "版本未对齐"), true); return; }
    var d = S.selected;
    var issues = (d.pending || []).length + (d.blockers || []).length;
    var override = false;
    if (issues) {
      if (!confirm("这条草稿还有 " + (d.pending || []).length + " 处待补、" + (d.blockers || []).length +
        " 处阻断。确认你已经按最终内容发到 X 了吗？")) return;
      override = true;
    }
    try {
      await api("/api/drafts/" + encodeURIComponent(d.id) + "/status", {
        method: "POST", body: JSON.stringify({ status: "published", override: override })
      });
      await refreshAll();
      toast("已记录到台账（同 source_key 不会再出稿）");
    } catch (e) {
      if (e.data && e.data.error === "pending") {
        toast("还有待补内容未处理", true);
      } else if (e.data && e.data.error === "blocked") {
        toast("有未溯源的数字，先改稿", true);
      } else {
        toast("操作失败：" + e.message, true);
      }
    }
  }

  async function discard() {
    if (!S.selected) return;
    if (!confirm("丢弃后这条不会再出现在列表里（同 source_key 也不会再自动出稿）。确定？")) return;
    await setStatus("discarded");
  }

  async function rerenderCard() {
    if (!S.selected) return;
    try {
      var r = await api("/api/drafts/" + encodeURIComponent(S.selected.id) + "/render-card", { method: "POST" });
      S.selected.media = r.media;
      renderDetail();
      toast("卡片已重新渲染（" + r.media.engine + "）");
    } catch (e) {
      toast("渲染失败：" + e.message, true);
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
    btn.textContent = "扫描中…";
    try {
      var r = await api("/api/collect", { method: "POST", body: JSON.stringify({ force: false }) });
      var created = r.results.filter(function (x) { return x.status === "created"; });
      var errors = r.results.filter(function (x) { return x.status === "error"; });
      var skipped = r.results.filter(function (x) { return x.status === "skipped"; });
      var updated = r.results.filter(function (x) { return x.status === "updated"; });
      var dups = r.results.filter(function (x) { return x.status === "duplicate"; });
      console.log("collect", r.results);
      toast("扫描完成：新建 " + created.length + " · 更新 " + updated.length + " · 跳过 " + dups.length +
        (skipped.length ? " · 待配置 " + skipped.length : "") + " · 错误 " + errors.length,
        errors.length > 0 || skipped.length > 0);
      if (skipped.length) console.warn("跳过：", skipped);
      if (errors.length) console.warn("源错误：", errors);
      await refreshAll();
      if (created.length) await openDraft(created[0].draftId);
    } catch (e) {
      toast("扫描失败：" + e.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = "扫描源";
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
    $("collectBtn").addEventListener("click", runCollect);
    $("refreshBtn").addEventListener("click", function () { refreshAll(); toast("已刷新"); });
    $("manualForm").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var text = $("manualText").value.trim();
      if (!text) return;
      try {
        var r = await api("/api/manual", { method: "POST", body: JSON.stringify({ text: text }) });
        $("manualText").value = "";
        await refreshAll();
        await openDraft(r.draft.id);
        toast(r.created ? "已出稿（记得补占位符）" : "这条来源已有草稿");
      } catch (e) {
        toast("出稿失败：" + e.message, true);
      }
    });
  }

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
  }).catch(function (e) { toast("加载失败：" + e.message, true); });
})();