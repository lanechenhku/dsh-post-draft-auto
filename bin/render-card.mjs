#!/usr/bin/env node
// 重新渲染卡片图：node bin/render-card.mjs --id d-xxxx    或   --all
import { listDrafts, getDraft, saveDraft, loadConfig } from "../lib/store.mjs";
import { renderCard } from "../lib/card.mjs";

const argv = process.argv.slice(2);
const all = argv.indexOf("--all") !== -1;
const idIdx = argv.indexOf("--id");
const id = idIdx !== -1 ? argv[idIdx + 1] : "";

loadConfig();

if (all) {
  listDrafts().forEach(function (d) {
    const media = renderCard(d.card, d.id);
    d.media = media;
    saveDraft(d);
    console.log(d.id + " -> " + (media.png || media.svg) + " [" + media.engine + "]" + (media.reason ? " " + media.reason : ""));
  });
} else if (id) {
  const d = getDraft(id);
  if (!d) {
    console.error("没有这条草稿：" + id);
    process.exit(1);
  }
  const media = renderCard(d.card, d.id);
  d.media = media;
  saveDraft(d);
  console.log(JSON.stringify(media, null, 2));
} else {
  console.log("用法：node bin/render-card.mjs --id <draftId> | --all");
}
