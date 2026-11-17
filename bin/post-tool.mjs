#!/usr/bin/env node
// 模型/脚本可直接调用的工具 CLI（插件没装上时的兜底）
//   node bin/post-tool.mjs post_facts --json '{"doi":"10.1101/2021.09.08.459436"}'
//   node bin/post-tool.mjs post_save --file /tmp/draft.json
//   node bin/post-tool.mjs post_list --json '{"status":"drafted"}'
//   node bin/post-tool.mjs post_mark_posted --json '{"id":"d-xxxx"}'
import fs from "node:fs";
import { callTool, TOOL_NAMES } from "../lib/tools.mjs";

const argv = process.argv.slice(2);
const name = argv[0];
if (!name || TOOL_NAMES.indexOf(name) === -1) {
  console.error("用法：node bin/post-tool.mjs <" + TOOL_NAMES.join("|") + "> [--json '{...}' | --file path | --stdin]");
  process.exit(2);
}

let args = {};
const iJson = argv.indexOf("--json");
const iFile = argv.indexOf("--file");
if (iJson !== -1) {
  args = JSON.parse(argv[iJson + 1] || "{}");
} else if (iFile !== -1) {
  args = JSON.parse(fs.readFileSync(argv[iFile + 1], "utf8"));
} else if (argv.indexOf("--stdin") !== -1) {
  const chunks = [];
  process.stdin.on("data", function (c) { chunks.push(c); });
  await new Promise(function (resolve) { process.stdin.on("end", resolve); });
  args = JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

try {
  const out = await callTool(name, args);
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  process.exit(out && out.ok === false ? 1 : 0);
} catch (e) {
  process.stdout.write(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) }, null, 2) + "\n");
  process.exit(1);
}
