---
name: post-draft
description: 用户说「我发了 X」（论文 DOI / Acme 版本 / npm 包 / 链接），或「你给我做的 X 上线了，我要发个推」时，抓真实事实 → 模型自己写稿 → 落盘到本地出稿工作台。用于发 X 前的出稿，不发布。
---

# 出稿（不发布）

用户提到「发了 / 上线了 / 出了 preprint」时按这个流程走。**不要**自己编功能点、数字或作者名。

## 步骤

1. 判断事实源，调 post_facts：
   - 论文 DOI（10.1101/…）→ `{"doi":"10.1101/2021.09.08.459436"}`
   - Acme 版本 → `{"version":"v1.2.3"}`（读线上 version.json + 本地 + releases.md）
   - npm 包 → `{"pkg":"@deepseek-ai/dsh"}`
   - 其他链接 → `{"url":"..."}`
   - 只有一句话 → `{"text":"我刚发了 …"}`
2. 看返回的 `facts`（每条带 `sourceUrl`）。**正文只能出现 facts 里的字符串**；没抓到的东西写成 `⟨待补：…⟩` 放进 `pending`。
3. 由你自己写三样东西（这是重点，不要套模板）：
   - `en`：英文主推，钩子 + 2–3 条事实要点 + 链接，≤280 计权（CJK=2，URL=23）
   - `zh`：中文回复，≤280 计权（中文约 140 字）
   - `card`：`{title, subtitle, version, bullets}`，一句话标题 + ≤3 条要点
4. 调 post_save，把 `facts` 原样带回并附 `sourceKey`（防重复）。返回里有 `draftId / enWeight / zhWeight / blockers`。
5. 告诉用户：草稿在 `drafts/<id>.json`、卡片图在 `media/<id>.png`，可开工作台（`npm start` → http://127.0.0.1:4789）复制。

## 插件没装时（兜底）

能力都在 CLI 里：

```bash
cd ~/Desktop/bot发布
node bin/post-tool.mjs post_facts --json '{"doi":"10.1101/2021.09.08.459436"}'
node bin/post-tool.mjs post_save  --file /tmp/draft.json   # {en, zh, card, facts, sourceKey, pending}
node bin/post-tool.mjs post_list
node bin/post-tool.mjs post_mark_posted --json '{"id":"d-xxxx"}'
```

## 禁止

- 不调任何 X/Twitter 接口，不用浏览器自动发；发布永远由用户手动复制粘贴
- 不 `git add/commit/push`
- 版本号/日期/百分数/作者名：只在 facts 里出现过的才能写进正文
