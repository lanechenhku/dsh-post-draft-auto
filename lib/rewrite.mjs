// lib/rewrite.mjs —— 「重新生成」用的重写指令（面板只负责复制，模型负责重写）
// 语气选项只是「改写指令」，不是词库；约束沿用 voice.md 与 config.voice。
export const DEFAULT_TONES = [
  { id: "neutral", label: "中性", labelEn: "Neutral", instruction: "保持现在的角度与结构，只收紧措辞；不要新增任何事实" },
  { id: "shorter", label: "更短", labelEn: "Shorter", instruction: "压到当前计权长度的 60-70%，保留最强的一条要点和链接" },
  { id: "technical", label: "更技术", labelEn: "More technical", instruction: "保留技术术语与数字，去掉比喻和形容词，句子更短" },
  { id: "casual", label: "更口语", labelEn: "More casual", instruction: "像跟同事说话：短句、少修饰；依然不吹，不加 emoji" }
];

function normalizeTone(raw, fallbackIndex) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id || "").trim();
  if (!id) return null;
  const base = DEFAULT_TONES.filter(function (x) { return x.id === id; })[0] || DEFAULT_TONES[fallbackIndex % DEFAULT_TONES.length];
  return {
    id: id,
    label: String(raw.label || base.label),
    labelEn: String(raw.labelEn || raw.label_en || base.labelEn),
    instruction: String(raw.instruction || base.instruction)
  };
}

// config.rewriteTones（可选）可只写 {id, instruction}，label 沿用默认；没配就用默认四个。
export function tonesFrom(config) {
  const raw = config && Array.isArray(config.rewriteTones) ? config.rewriteTones : null;
  if (!raw || raw.length === 0) return DEFAULT_TONES.slice();
  const out = [];
  raw.forEach(function (item, i) {
    const tone = normalizeTone(item, i);
    if (tone) out.push(tone);
  });
  return out.length ? out : DEFAULT_TONES.slice();
}

export function findTone(config, id) {
  const tones = tonesFrom(config);
  const wanted = String(id || "").trim();
  return tones.filter(function (tone) { return tone.id === wanted; })[0] || tones[0];
}

export function toneLabel(tone, lang) {
  return lang === "en" ? tone.labelEn : tone.label;
}

function factsBlock(draft) {
  const facts = Array.isArray(draft.facts) ? draft.facts : [];
  if (facts.length === 0) return "（这条稿没有 facts：重写时不要引入任何新数字/日期/作者名）";
  return facts.map(function (f, i) {
    const detail = (f && (f.detail || f.value)) || "";
    const src = (f && f.sourceUrl) || "";
    return (i + 1) + ". [" + ((f && f.kind) || "fact") + "] " + detail + (src ? "  <- " + src : "");
  }).join("\n");
}

// 输出可直接粘进对话的一段指令；只描述任务与约束，不含编造内容。
export function buildRewritePrompt(draft, config, toneId, lang) {
  const tone = findTone(config, toneId);
  const voice = (config && config.voice) || {};
  const banned = Array.isArray(voice.banned) && voice.banned.length ? voice.banned.join(" / ") : "（见 voice.md）";
  const limit = (config && config.limits && config.limits.tweet) || 280;
  const en = String((draft && draft.enText) || "");
  const zh = String((draft && draft.zhText) || "");
  const title = (draft && draft.title) || "";
  const key = (draft && draft.sourceKey) || "";
  const tags = voice.maxHashtags == null ? 2 : voice.maxHashtags;
  const emoji = voice.maxEmoji == null ? 3 : voice.maxEmoji;

  if (lang === "en") {
    return [
      "Rewrite this X draft (do not publish it; publishing stays manual).",
      "",
      "draft id: " + ((draft && draft.id) || "") + " | sourceKey: " + key + " | title: " + title,
      "Tone: " + toneLabel(tone, "en") + " - " + tone.instruction,
      "",
      "Current English post:",
      en,
      "",
      "Current Chinese reply:",
      zh,
      "",
      "Facts you may use (nothing outside this list):",
      factsBlock(draft),
      "",
      "Rules: keep every number/date/author exactly as in the facts; keep the link; no hype (" + banned + ");",
      "hashtags <= " + tags + ", emoji <= " + emoji + ";",
      "weighted length <= " + limit + " per post (CJK counts 2, a URL counts 23).",
      "When done, save it with post_save using the same sourceKey and the same facts array."
    ].join("\n");
  }

  return [
    "请重写这条 X 草稿（不要发布，发布仍然由我手动复制）。",
    "",
    "draft id：" + ((draft && draft.id) || "") + "｜sourceKey：" + key + "｜标题：" + title,
    "语气：" + toneLabel(tone, "zh") + " —— " + tone.instruction,
    "",
    "现有英文主推：",
    en,
    "",
    "现有中文回复：",
    zh,
    "",
    "可以引用的事实（facts 之外不许出现新的数字/日期/作者名）：",
    factsBlock(draft),
    "",
    "硬规则：数字、日期、作者名照抄 facts；链接保留；不吹（禁用词：" + banned + "）；",
    "hashtag <= " + tags + "，emoji <= " + emoji + "；",
    "每条计权长度 <= " + limit + "（CJK 算 2，URL 算 23）。",
    "写完后用 post_save 覆盖同一个 sourceKey，facts 原样带回去。"
  ].join("\n");
}
