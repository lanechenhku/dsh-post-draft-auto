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
      title: "Example preprint: a neutral demo title",
      status: "drafted",
      generatedBy: "model",
      sourceKey: "paper:demo:example-1",
      enWeight: 194,
      zhWeight: 131,
      limit: 280,
      pending: [],
      blockers: [],
      guard: null,
      createdAt: "2026-11-18T00:00:00.000Z"
    },
    {
      id: "d-fixture-2",
      title: "example-package",
      status: "drafted",
      generatedBy: "template",
      sourceKey: "npm:example-package@1.2.3",
      enWeight: 84,
      zhWeight: 79,
      limit: 280,
      pending: ["要点：一句话说清这次最重要的变化", "链接：仓库 / 发布页"],
      blockers: [],
      guard: null,
      createdAt: "2026-11-18T00:00:00.000Z"
    },
    {
      id: "d-fixture-3",
      title: "Example product v1.3.0",
      status: "drafted",
      generatedBy: "template",
      sourceKey: "site:example-product:v1.3.0",
      enWeight: 83,
      zhWeight: 78,
      limit: 280,
      pending: [],
      blockers: [],
      guard: "pending-rollout",
      createdAt: "2026-11-18T00:00:00.000Z"
    }
  ]
};

const copyTexts = {
  "d-fixture-1": {
    en: "New preprint: Example preprint, a neutral demo of the draft desk.\n\n· first bullet from the abstract\n· second bullet, with its source\n\nhttps://example.org/paper",
    zh: "新 preprint：Example preprint —— 出稿工作台的中性示例稿。\n\n· 摘要里的第一条要点\n· 第二条要点，同样来自摘要\n\nhttps://example.org/paper"
  },
  "d-fixture-2": {
    en: "example-package 1.2.3 is out.\n\nhttps://example.org/package",
    zh: "example-package 1.2.3 已发布。\n\nhttps://example.org/package"
  },
  "d-fixture-3": {
    en: "Example product v1.3.0 is out.\n\nhttps://example.org/product",
    zh: "Example product v1.3.0 已发布。"
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
