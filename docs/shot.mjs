#!/usr/bin/env node
// 渲染 docs/panel-harness.html 截图 + 记录「点复制 EN」之后真正交给剪贴板的文本。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const page = path.join(here, "panel-harness.html");
const bin = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"]
  .find((p) => fs.existsSync(p));
if (!bin) { console.error("no chrome"); process.exit(1); }
const base = ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--disable-extensions"];

function run(args, label, query) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "xdd-shot-"));
  const r = spawnSync(bin, base.concat(["--user-data-dir=" + profile]).concat(args).concat(["file://" + page + (query || "")]), { timeout: 60000, encoding: "utf8" });
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  console.log("[" + label + "] exit=" + r.status);
  return r;
}

run(["--virtual-time-budget=3000", "--window-size=460,760", "--screenshot=" + path.join(here, "panel.png")], "panel.png");
const size = fs.existsSync(path.join(here, "panel.png")) ? fs.statSync(path.join(here, "panel.png")).size : 0;
console.log("panel.png bytes=" + size);

// 复制链路：自动点「复制 EN」，把 toast + 真正进入剪贴板的文本 dump 出来
const dom = run(["--virtual-time-budget=4000", "--window-size=1010,760", "--dump-dom"], "copy-dump", "?copy=1");
if (dom.stdout) {
  fs.writeFileSync(path.join(here, "panel-copy-dom.html"), dom.stdout);
  const match = String(dom.stdout).match(/<div id="copied">([\s\S]*?)<\/div>\s*<\/div>/);
  const text = match ? match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "(no copy result)";
  fs.writeFileSync(path.join(here, "panel-copy.txt"), text);
  console.log("--- copy result ---");
  console.log(text.slice(0, 700));

  // 再跑一遍「clipboard 被拒」的降级链路（textarea + execCommand）
  const dom2 = run(["--virtual-time-budget=4000", "--window-size=1010,760", "--dump-dom"], "copy-fallback", "?copy=1&forcefallback=1");
  if (dom2.stdout) {
    const match2 = String(dom2.stdout).match(/<div id="copied">([\s\S]*?)<\/div>\s*<\/div>/);
    const text2 = match2 ? match2[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&") : "(no copy result)";
    fs.writeFileSync(path.join(here, "panel-copy-fallback.txt"), text2);
    console.log("--- fallback result ---");
    console.log(text2.slice(0, 400));
  }
}