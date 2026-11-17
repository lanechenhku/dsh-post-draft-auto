// lib/release-notes.mjs —— 解析 releases.md（「这一版改了什么」的唯一来源）
// 格式约定见 integrations/release-notes/releases.md：
//   ## v1.2.3 — 一句话标题
//   - 要点 1
//   - 要点 2
// 解析不到就返回 null（调用方必须标「功能点待补」，不许编）。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function expandHome(p) {
  const s = String(p || "");
  if (!s) return "";
  return s.indexOf("~") === 0 ? path.join(os.homedir(), s.slice(1)) : s;
}

// v1.2.3 / v1.2.3 / 9.09.1 → [9, 9, 0]
export function parseVersion(v) {
  const m = String(v || "").trim().match(/^[vV]?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2] || 0), Number(m[3] || 0)];
}

export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

// 从 releases.md 全文里取某一版：标题 + 日期(可选) + 要点
export function findReleaseNotes(text, version) {
  const target = parseVersion(version);
  if (!target) return null;
  const lines = String(text || "").split(/\r?\n/);
  let start = -1;
  let heading = "";
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#{2,3}\s+(.+)$/);
    if (!m) continue;
    const head = m[1].trim();
    const vm = head.match(/^[vV]?(\d+(?:\.\d+)*)/);
    if (!vm) continue;
    if (compareVersions(vm[1], version) === 0) {
      start = i;
      heading = head;
      break;
    }
  }
  if (start === -1) return null;

  let end = lines.length;
  for (let j = start + 1; j < lines.length; j++) {
    if (/^#{2,3}\s+/.test(lines[j])) { end = j; break; }
  }

  const titleMatch = heading.match(/^[vV]?\d+(?:\.\d+)*\s*[—–-]\s*(.+)$/);
  const title = titleMatch ? titleMatch[1].trim() : "";
  let date = "";
  const bullets = [];
  for (let k = start + 1; k < end; k++) {
    const raw = lines[k].trim();
    if (!raw) continue;
    const dm = raw.match(/^_(.+)_$/);
    if (dm && !date) { date = dm[1].trim(); continue; }
    const bm = raw.match(/^[-*]\s+(.+)$/);
    if (bm) {
      const clean = bm[1].replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\x60([^\x60]+)\x60/g, "$1").trim();
      if (clean.length > 3) bullets.push({ text: clean, line: k + 1 });
    }
  }
  return {
    version: version,
    title: title,
    date: date,
    heading: heading,
    bullets: bullets,
    line: start + 1
  };
}

// files 可以是字符串或字符串数组，按顺序取第一个存在的
export function readReleaseNotes(files, version) {
  const list = Array.isArray(files) ? files : [files];
  for (let i = 0; i < list.length; i++) {
    const raw = expandHome(list[i]);
    if (!raw) continue;
    try {
      if (!fs.existsSync(raw)) continue;
      const text = fs.readFileSync(raw, "utf8");
      const found = findReleaseNotes(text, version);
      if (!found) continue;
      return Object.assign({}, found, {
        file: raw,
        sourceUrl: "file://" + raw + "#L" + found.line
      });
    } catch {
      continue;
    }
  }
  return null;
}
