// lib/card.mjs —— 1200x675 发布卡片图
// 先保证有 SVG（任何环境都能下载/预览），再尝试用本机 Chrome 无头截成 PNG。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { MEDIA_DIR, ensureDirs } from "./store.mjs";

export const CARD_W = 1200;
export const CARD_H = 675;

function esc(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 粗略字宽：CJK 算 1 个单位，拉丁算 0.55
function units(ch) {
  const cp = ch.codePointAt(0);
  if (cp >= 0x2e80) return 1;
  if (cp >= 0x1f300) return 1;
  return 0.55;
}

function wrapLines(text, maxUnits, maxLines) {
  const chars = Array.from(String(text || "").trim());
  const lines = [];
  let cur = "";
  let acc = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const u = units(ch);
    if (acc + u > maxUnits) {
      lines.push(cur);
      cur = "";
      acc = 0;
      if (lines.length >= maxLines) break;
    }
    cur += ch;
    acc += u;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function brandOf(card) {
  const b = (card && card.brand) || {};
  return {
    name: b.name || "Acme",
    color: b.color || "#0f766e",
    accent: b.accent || "#14b8a6",
    footer: b.footer || ""
  };
}

export function cardSvg(card) {
  const c = card || {};
  const b = brandOf(c);
  const titleLines = wrapLines(c.title || "Update", 20, 2);
  const sub = c.subtitle ? wrapLines(c.subtitle, 52, 2) : [];
  const bullets = (c.bullets || []).slice(0, 3).map(function (x) { return wrapLines(x, 56, 1)[0] || ""; });
  const version = c.version || "";

  const parts = [];
  parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + CARD_W + '" height="' + CARD_H + '" viewBox="0 0 ' + CARD_W + ' ' + CARD_H + '">');
  parts.push('<defs>');
  parts.push('<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">');
  parts.push('<stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#111a2e"/>');
  parts.push('</linearGradient>');
  parts.push('</defs>');
  parts.push('<rect width="' + CARD_W + '" height="' + CARD_H + '" fill="url(#bg)"/>');
  parts.push('<rect x="0" y="0" width="10" height="' + CARD_H + '" fill="' + esc(b.accent) + '"/>');
  parts.push('<circle cx="1090" cy="120" r="190" fill="' + esc(b.color) + '" opacity="0.18"/>');
  // brand chip
  parts.push('<rect x="72" y="64" width="' + Math.max(96, 18 * b.name.length + 36) + '" height="44" rx="22" fill="' + esc(b.color) + '"/>');
  parts.push('<text x="' + (72 + Math.max(96, 18 * b.name.length + 36) / 2) + '" y="93" text-anchor="middle" font-family="PingFang SC,Helvetica Neue,Arial" font-size="22" fill="#e8fffb" font-weight="600">' + esc(b.name) + '</text>');
  if (version) {
    parts.push('<text x="1128" y="93" text-anchor="end" font-family="PingFang SC,Helvetica Neue,Arial" font-size="26" fill="' + esc(b.accent) + '" font-weight="600">' + esc(version) + '</text>');
  }
  // title
  let y = 208;
  titleLines.forEach(function (line, i) {
    parts.push('<text x="72" y="' + (y + i * 78) + '" font-family="PingFang SC,Helvetica Neue,Arial" font-size="68" font-weight="700" fill="#f8fafc">' + esc(line) + '</text>');
  });
  y += (titleLines.length - 1) * 78;

  // subtitle
  if (sub.length) {
    sub.forEach(function (line, i) {
      parts.push('<text x="74" y="' + (y + 62 + i * 40) + '" font-family="PingFang SC,Helvetica Neue,Arial" font-size="30" fill="#94a3b8">' + esc(line) + '</text>');
    });
    y += 62 + (sub.length - 1) * 40;
  }

  // bullets
  let by = Math.max(y + 96, 430);
  bullets.forEach(function (line) {
    if (!line) return;
    parts.push('<circle cx="84" cy="' + (by - 10) + '" r="6" fill="' + esc(b.accent) + '"/>');
    parts.push('<text x="108" y="' + by + '" font-family="PingFang SC,Helvetica Neue,Arial" font-size="30" fill="#e2e8f0">' + esc(line) + '</text>');
    by += 58;
  });

  // footer
  parts.push('<line x1="72" y1="600" x2="1128" y2="600" stroke="#1e293b" stroke-width="2"/>');
  parts.push('<text x="72" y="640" font-family="PingFang SC,Helvetica Neue,Arial" font-size="22" fill="#64748b">' + esc(b.footer) + '</text>');
  parts.push('<text x="1128" y="640" text-anchor="end" font-family="PingFang SC,Helvetica Neue,Arial" font-size="20" fill="#475569">' + esc(c.title || "") + '</text>');
  parts.push('</svg>');
  return parts.join("\n");
}

export function cardHtml(card) {
  const c = card || {};
  const b = brandOf(c);
  const bullets = (c.bullets || []).slice(0, 3);
  const rows = bullets.map(function (x) {
    return '<li><span class="dot"></span><span>' + esc(x) + '</span></li>';
  }).join("");
  const sub = c.subtitle ? '<p class="sub">' + esc(c.subtitle) + '</p>' : "";
  const ver = c.version ? '<div class="ver">' + esc(c.version) + '</div>' : "";
  return '<!doctype html><html><head><meta charset="utf-8"><style>' +
    '@page{size:' + CARD_W + 'px ' + CARD_H + 'px;margin:0}' +
    'html,body{margin:0;padding:0;width:' + CARD_W + 'px;height:' + CARD_H + 'px;overflow:hidden}' +
    'body{background:#0b1220 radial-gradient(60% 55% at 82% 6%, rgba(20,184,166,0.22) 0%, rgba(11,18,32,0) 70%);' +
    'font-family:"PingFang SC","Helvetica Neue",Arial,sans-serif;color:#f8fafc;box-sizing:border-box;' +
    'padding:64px 72px 48px;display:flex;flex-direction:column;border-left:10px solid ' + b.accent + '}' +
    '.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:56px}' +
    '.chip{background:' + b.color + ';color:#e8fffb;font-weight:600;font-size:22px;padding:10px 22px;border-radius:22px;letter-spacing:.02em}' +
    '.ver{color:' + b.accent + ';font-weight:600;font-size:26px;font-variant-numeric:tabular-nums}' +
    'h1{font-size:68px;line-height:1.08;margin:0 0 18px;letter-spacing:-0.01em;max-width:1000px}' +
    '.sub{font-size:30px;color:#94a3b8;margin:0 0 34px;line-height:1.35;max-width:980px}' +
    'ul{list-style:none;margin:auto 0 0;padding:0}' +
    'li{display:flex;gap:16px;align-items:flex-start;font-size:29px;line-height:1.4;color:#e2e8f0;margin-top:16px}' +
    '.dot{width:11px;height:11px;border-radius:50%;background:' + b.accent + ';margin-top:14px;flex:0 0 auto}' +
    '.foot{margin-top:26px;padding-top:18px;border-top:2px solid #1e293b;display:flex;justify-content:space-between;' +
    'font-size:21px;color:#64748b}' +
    '</style></head><body><div class="top"><div class="chip">' + esc(b.name) + '</div>' + ver + '</div>' +
    '<h1>' + esc(c.title || "Update") + '</h1>' + sub + '<ul>' + rows + '</ul>' +
    '<div class="foot"><span>' + esc(b.footer) + '</span><span>' + esc(c.title || "") + '</span></div>' +
    '</body></html>';
}

function chromePath() {
  const cands = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium"
  ].filter(Boolean);
  for (let i = 0; i < cands.length; i++) {
    try { if (fs.existsSync(cands[i])) return cands[i]; } catch {}
  }
  return "";
}

// 生成 <id>.svg + <id>.card.html，再尝试 <id>.png
export function renderCard(card, id) {
  ensureDirs();
  const safeId = String(id || "card").replace(/[^A-Za-z0-9._-]/g, "-");
  const svgPath = path.join(MEDIA_DIR, safeId + ".svg");
  const htmlPath = path.join(MEDIA_DIR, safeId + ".card.html");
  const pngPath = path.join(MEDIA_DIR, safeId + ".png");
  fs.writeFileSync(svgPath, cardSvg(card), "utf8");
  fs.writeFileSync(htmlPath, cardHtml(card), "utf8");

  let png = null;
  let engine = "svg-only";
  let reason = "";
  const bin = chromePath();
  if (!bin) {
    reason = "没找到本机 Chrome/Chromium，只有 SVG";
  } else {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "xdd-chrome-"));
    const args = [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
      "--no-default-browser-check", "--disable-extensions", "--force-device-scale-factor=1",
      "--user-data-dir=" + profile,
      "--window-size=" + CARD_W + "," + CARD_H,
      "--screenshot=" + pngPath,
      "--virtual-time-budget=2000",
      "file://" + htmlPath
    ];
    const r = spawnSync(bin, args, { timeout: 45000, encoding: "utf8" });
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    if (fs.existsSync(pngPath) && fs.statSync(pngPath).size > 2000) {
      png = "/media/" + path.basename(pngPath);
      engine = "chrome-headless";
    } else {
      reason = "Chrome 无头截图失败（" + (r.stderr ? String(r.stderr).slice(0, 160) : "no output") + "）";
    }
  }

  return {
    svg: "/media/" + path.basename(svgPath),
    png: png,
    html: "/media/" + path.basename(htmlPath),
    engine: engine,
    reason: reason,
    width: CARD_W,
    height: CARD_H,
    renderedAt: new Date().toISOString()
  };
}

export async function renderCardForDraft(draft) {
  try {
    return renderCard(draft.card, draft.id);
  } catch (e) {
    return { error: String(e && e.message ? e.message : e) };
  }
}
