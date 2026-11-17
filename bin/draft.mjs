#!/usr/bin/env node
// 出稿 CLI：node bin/draft.mjs --manual "我刚发了 Acme v1.1.0"
//           node bin/draft.mjs --source npm:@deepseek-ai/dsh
//           node bin/draft.mjs --collect
//           node bin/draft.mjs --list
//           node bin/draft.mjs --mock
import fs from "node:fs";
import path from "node:path";
import { loadConfig, createDraft, listDrafts, getEvent, ROOT } from "../lib/store.mjs";
import { composeManual, finalizeDraft, composeNpm, composeGithubRelease, composeArxiv } from "../lib/compose.mjs";
import { runCollect } from "../lib/collect.mjs";
import { renderCard } from "../lib/card.mjs";

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json" || a === "--force" || a === "--list" || a === "--collect" || a === "--mock") {
      out[a.replace(/^--/, "")] = true;
      continue;
    }
    if (a === "--manual" || a === "--source" || a === "--id") {
      out[a.replace(/^--/, "")] = argv[++i] || "";
      continue;
    }
    out._.push(a);
  }
  return out;
}

function line() {
  return console.log.apply(console, arguments);
}

function report(created, draft) {
  if (!created) return;
  line("");
  line("✓ 新建草稿 " + draft.id + "  " + draft.title);
  line("  EN " + draft.enWeight + "/" + draft.limit + "  ZH " + draft.zhWeight + "/" + draft.limit +
    "  待补 " + (draft.pending || []).length + "  阻断 " + (draft.blockers || []).length);
  line("  文件 drafts/" + draft.id + ".json");
  if (draft.media) {
    line("  卡片 " + (draft.media.png || draft.media.svg) + "（" + draft.media.engine + "）");
  }
  if ((draft.pending || []).length) {
    line("  待补：");
    (draft.pending || []).forEach(function (p) { line("    - " + p); });
  }
  if ((draft.blockers || []).length) {
    line("  ⚠ 阻断：");
    (draft.blockers || []).forEach(function (b) { line("    - " + JSON.stringify(b.detail)); });
  }
}

async function createFromCandidate(cand, config, opts) {
  const fin = finalizeDraft(cand, config);
  const res = createDraft(fin, config, opts);
  if (!res.created) {
    line("· 跳过（同 source_key 已有草稿：" + res.draft.id + " / " + res.draft.status + "）");
    line("  原因：" + res.reason);
    return res;
  }
  const media = renderCard(res.draft.card, res.draft.id);
  res.draft.media = media;
  const { saveDraft } = await import("../lib/store.mjs");
  saveDraft(res.draft);
  report(true, res.draft);
  return res;
}

async function sourceCandidate(spec, config) {
  const idx = spec.indexOf(":");
  if (idx === -1) throw new Error("--source 格式：npm:<pkg> | github:<owner/repo> | arxiv:<query> | rss:<url> | site:<id>");
  const kind = spec.slice(0, idx);
  const val = spec.slice(idx + 1);
  if (kind === "jsonapi") {
    const { jsonApiCandidate } = await import("../lib/sources.mjs");
    const items = (config.sources && config.sources.jsonapi) || [];
    const item = items.filter(function (x) { return x.id === val; })[0] || { id: "cli", url: val, author: config.authorName };
    return await jsonApiCandidate(item, config);
  }
  if (kind === "npm") {
    const { npmCandidate } = await import("../lib/sources.mjs");
    return await npmCandidate({ pkg: val, id: "cli", _config: config });
  }
  if (kind === "github") {
    const { githubCandidate } = await import("../lib/sources.mjs");
    return await githubCandidate({ repo: val, id: "cli" }, config);
  }
  if (kind === "arxiv") {
    const { arxivCandidate } = await import("../lib/sources.mjs");
    return await arxivCandidate({ query: val, id: "cli" }, config);
  }
  if (kind === "rss") {
    const { rssCandidate } = await import("../lib/sources.mjs");
    return await rssCandidate({ url: val, id: "cli" }, config);
  }
  if (kind === "site") {
    const { siteCandidate } = await import("../lib/sources.mjs");
    // site:2hai 先按 config 里的 id 查；查不到就把参数当成 URL
    const items = (config.sources && config.sources.site) || [];
    const item = items.filter(function (x) { return x.id === val; })[0];
    const target = item || { id: "cli", url: val, versionKey: "version" };
    const ev = getEvent("site:" + target.id);
    return await siteCandidate(target, config, ev && ev.lastValue);
  }
  throw new Error("不认识的来源类型：" + kind);
}

async function runMock(config, opts) {
  const file = path.join(ROOT, "data", "fixtures", "mock.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const results = [];
  const jobs = [];
  (data.npm || []).forEach(function (x) { jobs.push(function () { return composeNpm(x, config); }); });
  (data.github || []).forEach(function (x) { jobs.push(function () { return composeGithubRelease(x, config); }); });
  (data.arxiv || []).forEach(function (x) { jobs.push(function () { return composeArxiv(x, config); }); });
  line("mock 模式：从 " + file + " 造 " + jobs.length + " 条草稿（不联网）");
  for (let i = 0; i < jobs.length; i++) {
    const res = await createFromCandidate(jobs[i](), config, opts);
    results.push(res);
  }
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const opts = { force: !!args.force };

  if (args.list) {
    const all = listDrafts();
    if (args.json) return line(JSON.stringify(all, null, 2));
    line("共 " + all.length + " 条草稿");
    all.forEach(function (d) {
      line([d.status.padEnd(9), d.id.padEnd(20), String(d.enWeight).padStart(3) + "/" + d.limit,
        String((d.pending || []).length) + " 待补", d.title].join("  "));
    });
    return;
  }

  if (args.mock) return runMock(config, opts);

  if (args.collect) {
    const results = await runCollect(config, opts);
    results.forEach(function (r) {
      line("[" + r.status + "] " + r.kind + " " + r.label + (r.draftId ? " -> " + r.draftId : "") + (r.error ? "  " + r.error : "") + (r.reason ? "  " + r.reason : ""));
    });
    return;
  }

  if (args.manual) {
    const cand = composeManual({ text: args.manual }, config);
    return createFromCandidate(cand, config, opts);
  }

  if (args.source) {
    const cand = await sourceCandidate(args.source, config);
    if (!cand) return line("· 没有变化，不生成草稿");
    return createFromCandidate(cand, config, opts);
  }

  line("用法：");
  line("  node bin/draft.mjs --manual \"我刚发了 Acme v1.1.0\"");
  line("  node bin/draft.mjs --source npm:@deepseek-ai/dsh");
  line("  node bin/draft.mjs --source github:owner/repo");
  line("  node bin/draft.mjs --source jsonapi:biorxiv   # 或 jsonapi:<url>");
  line("  node bin/draft.mjs --collect");
  line("  node bin/draft.mjs --list");
  line("  node bin/draft.mjs --mock");
}

main().catch(function (e) {
  console.error("✗ " + (e && e.message ? e.message : e));
  process.exit(1);
});