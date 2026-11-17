// lib/collect.mjs —— 跑所有启用的源：新事件才出稿，同 source_key 只出一份
import { loadConfig, createDraft, readEvents, saveEvents, setEvent, findSourceDraft, applyRegen } from "./store.mjs";
import { finalizeDraft } from "./compose.mjs";
import { npmCandidate, githubCandidate, arxivCandidate, rssCandidate, jsonApiCandidate, siteCandidate, SkipSource } from "./sources.mjs";
import { renderCardForDraft } from "./card.mjs";

function enabled(items) {
  return (items || []).filter(function (x) { return x && x.enabled; });
}

export async function collectOne(kind, item, config) {
  const tagged = Object.assign({}, item, { _config: config });
  if (kind === "npm") return await npmCandidate(tagged);
  if (kind === "github") return await githubCandidate(item, config);
  if (kind === "arxiv") return await arxivCandidate(item, config);
  if (kind === "rss") return await rssCandidate(item, config);
  if (kind === "jsonapi") return await jsonApiCandidate(item, config);
  if (kind === "site") return await siteCandidate(item, config);
  throw new Error("unknown source kind: " + kind);
}

function wasEdited(draft) {
  return (draft.history || []).some(function (h) { return h.event === "edited"; });
}

export async function runCollect(config, opts) {
  const cfg = config || loadConfig();
  const options = opts || {};
  const results = [];
  const kinds = ["npm", "github", "jsonapi", "rss", "arxiv", "site"];

  for (let k = 0; k < kinds.length; k++) {
    const kind = kinds[k];
    const items = enabled((cfg.sources || {})[kind]);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const label = item.label || item.id;
      try {
        const raw = await collectOne(kind, item, cfg);
        if (!raw) {
          results.push({ kind: kind, id: item.id, label: label, status: "no-change" });
          continue;
        }
        const fin = finalizeDraft(raw, cfg);
        const existing = findSourceDraft(fin.sourceKey);
        if (existing) {
          const guardChanged = JSON.stringify(existing.guard || null) !== JSON.stringify(fin.guard || null);
          const pendingChanged = JSON.stringify(existing.pendingBase || []) !== JSON.stringify(fin.pending || []);
          if (!guardChanged && !pendingChanged) {
            results.push({ kind: kind, id: item.id, label: label, status: "duplicate", draftId: existing.id, reason: "same source_key already has a draft (" + existing.status + ")" });
            continue;
          }
          const textToo = !wasEdited(existing) && existing.status === "drafted";
          const updated = applyRegen(existing, fin, textToo);
          const media = textToo ? await renderCardForDraft(updated) : null;
          if (media && !media.error) {
            updated.media = media;
            const { saveDraft } = await import("./store.mjs");
            saveDraft(updated);
          }
          results.push({
            kind: kind, id: item.id, label: label, status: "updated", draftId: updated.id,
            guard: fin.guard ? fin.guard.kind : null, textRefreshed: textToo
          });
          continue;
        }
        const res = createDraft(fin, cfg, { force: !!options.force });
        if (res.created) {
          const media = await renderCardForDraft(res.draft);
          if (media && !media.error) {
            const { saveDraft } = await import("./store.mjs");
            res.draft.media = media;
            saveDraft(res.draft);
          }
          setEvent(fin.sourceKey, {
            status: "drafted",
            draftId: res.draft.id,
            title: fin.title,
            guard: fin.guard ? fin.guard.kind : null,
            lastValue: fin.source && fin.source.version ? fin.source.version : ""
          });
          results.push({
            kind: kind, id: item.id, label: label, status: "created", draftId: res.draft.id,
            title: fin.title, pending: fin.pending.length, guard: fin.guard ? fin.guard.kind : null
          });
        } else {
          results.push({ kind: kind, id: item.id, label: label, status: "duplicate", draftId: res.draft.id, reason: res.reason });
        }
      } catch (e) {
        if (e && e.name === "SkipSource") {
          results.push({ kind: kind, id: item.id, label: label, status: "skipped", code: e.code, reason: e.message });
        } else {
          results.push({ kind: kind, id: item.id, label: label, status: "error", error: String(e && e.message ? e.message : e) });
        }
      }
    }
  }

  const st = readEvents();
  st.lastCollectAt = new Date().toISOString();
  saveEvents(st);
  return results;
}
