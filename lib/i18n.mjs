// lib/i18n.mjs —— 面板 UI 文案的唯一来源（zh / en）
// 客户端 lib/client.js 内联的是同一份表；tests/i18n.test.mjs 会逐 key 比对两边，防止漂移。
export const LANGS = ["zh", "en"];
export const DEFAULT_LANG = "zh";

export const STRINGS = {
  zh: {
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
  en: {
    "app.title": "Outbox",
    "app.refresh": "Refresh",
    "app.lang": "中文",
    "app.langTitle": "Switch to Chinese",
    "loading": "Loading…",
    "empty.title": "No drafts yet",
    "empty.hint": "Tell the agent \u201cI just shipped XXX\u201d and a draft shows up here",
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
    "arch.emptyActive": "Nothing waiting \u2014 open the group below for posted / discarded",
    "toast.copied": "Copied {what} ({method})",
    "toast.copiedEn": "the English post",
    "toast.copiedZh": "the Chinese reply",
    "toast.copyFailed": "Copy failed: ",
    "toast.selectManual": "Text selected \u2014 press \u2318C to copy",
    "toast.posted": "Logged as posted; same source_key will not draft again",
    "toast.postFailed": "Could not mark posted: ",
    "toast.editSaved": "Saved ({en}/{limit} \u00b7 {zh}/{limit})",
    "toast.editFailed": "Save failed: ",
    "toast.tooLong": "Over {limit}; trim it first",
    "toast.promptCopied": "Rewrite prompt copied (tone: {tone}) \u2014 paste it into the conversation",
    "toast.promptFailed": "Could not build the rewrite prompt: "
  }
};

export function t(lang, key, vars) {
  const table = STRINGS[lang] || STRINGS[DEFAULT_LANG];
  let text = table[key];
  if (text === undefined) text = STRINGS[DEFAULT_LANG][key];
  if (text === undefined) return key;
  if (vars) {
    Object.keys(vars).forEach(function (k) { text = text.split("{" + k + "}").join(String(vars[k])); });
  }
  return text;
}

export default STRINGS;