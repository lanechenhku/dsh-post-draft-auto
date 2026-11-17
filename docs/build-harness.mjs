#!/usr/bin/env node
// 生成 docs/panel-harness.html：把一份合成草稿数据 + 真实 lib/client.js 装进一个可渲染的最小宿主页。
// 用途：DSH 侧栏要重启才出现，构建期先用 harness 渲染同一份面板代码，验证 UI 与复制降级；数据是合成的，
// 不读本地草稿库，所以任何机器上都能跑出同样的结果。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const data = {
  ok: true,
  total: 3,
  drafts: [
    {
      id: "d-fixture-1",
      title: "A bioRxiv preprint: phenome-wide heritability enrichment of genomic loci",
      status: "drafted",
      generatedBy: "model",
      sourceKey: "paper:biorxiv:10.0000/2026.11.02.000001",
      enWeight: 178,
      zhWeight: 142,
      limit: 280,
      pending: [],
      blockers: [],
      guard: null,
      createdAt: "2026-11-18T00:00:00.000Z"
    },
    {
      id: "d-fixture-2",
      title: "Acme v1.2.3",
      status: "drafted",
      generatedBy: "template",
      sourceKey: "site:product:v1.2.3",
      enWeight: 96,
      zhWeight: 74,
      limit: 280,
      pending: ["要点：一句话说清这次最重要的变化", "链接：仓库 / 发布页"],
      blockers: [],
      guard: null,
      createdAt: "2026-11-17T00:00:00.000Z"
    },
    {
      id: "d-fixture-3",
      title: "Acme v1.2.4",
      status: "drafted",
      generatedBy: "template",
      sourceKey: "site:product:v1.2.4",
      enWeight: 88,
      zhWeight: 66,
      limit: 280,
      pending: [],
      blockers: [],
      guard: "pending-rollout",
      createdAt: "2026-11-17T00:00:00.000Z"
    }
  ]
};

const copyTexts = {
  "d-fixture-1": {
    en: "New preprint: a phenome-wide view of heritability enrichment.\n\n· 70 loci at FDR 5% across 444 GWAS\n· closed-form estimates, cost flat in trait count\n\nhttps://example.org/papers/example",
    zh: "新 preprint：把多个 GWAS 放在一起看遗传力富集在哪里。\n\n· 444 个 GWAS 里 70 个位点（FDR 5%）\n· 闭式解，代价不随性状数增长\n\nhttps://example.org/papers/example"
  },
  "d-fixture-2": {
    en: "Acme v1.2.3 is out.\n\nhttps://example.org/releases/v1.2.3",
    zh: "Acme v1.2.3 已发布。\n\nhttps://example.org/releases/v1.2.3"
  },
  "d-fixture-3": {
    en: "Acme v1.2.4 is out.\n\nhttps://example.org/releases/v1.2.4",
    zh: "Acme v1.2.4 已发布。"
  }
};

const template = fs.readFileSync(path.join(here, "panel-harness.template.html"), "utf8");
const mini = fs.readFileSync(path.join(here, "mini-react.js"), "utf8");
const client = fs.readFileSync(path.join(root, "lib/client.js"), "utf8");

const html = template
  .replace("/*__DATA__*/ null", JSON.stringify(data))
  .replace("/*__COPY__*/ null", JSON.stringify(copyTexts))
  .replace("/*__MINIREACT__*/", mini)
  .replace("/*__CLIENT__*/", client);

fs.writeFileSync(path.join(here, "panel-harness.html"), html);
console.log("harness written: docs/panel-harness.html | drafts=" + data.drafts.length + " | bytes=" + html.length);
