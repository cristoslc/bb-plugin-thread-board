// Stitch the chronicle into a PR-thread-style timeline view.
// Deterministic: reads entry files in filename sort order, git log for commits,
// merges by timestamp. Regenerates timeline.html in place.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const dir = new URL(".", import.meta.url).pathname;

const shas = execFileSync(
  "git",
  ["log", "origin/main..HEAD", "--format=%H|%ai|%s"],
  { cwd: dir, encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [h, d, ...rest] = line.split("|");
    return { h: h.slice(0, 7), d, msg: rest.join("|") };
  });

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const md = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");

const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
const entries = files.map((f) => {
  const raw = readFileSync(`${dir}${f}`, "utf8");
  const fm = {};
  const body = raw
    .replace(/^---\n([\s\S]*?)\n---\n/, (_, block) => {
      for (const line of block.split("\n")) {
        const m = line.match(/^([\w-]+):\s*(.*)$/);
        if (m) fm[m[1]] = m[2];
      }
      return "";
    })
    .trim();
  const ts = fm.timestamp ?? "";
  // Normalize both timestamp shapes (2026-09-25T133435 and 20260925T140932) to ISO.
  const iso = ts.includes("-")
    ? `${ts.slice(0, 10)}T${ts.slice(11, 13)}:${ts.slice(13, 15)}:${ts.slice(15, 17)}`
    : ts
      ? `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(9, 11)}:${ts.slice(11, 13)}:${ts.slice(13, 15)}`
      : f;
  const title = body.match(/^## (.+)$/m)?.[1] ?? f;
  return { t: new Date(`${iso}Z`).getTime(), iso, type: fm.type ?? "entry", responding: fm["responding-to"] ?? "nothing", body, title };
});

const items = [
  ...shas.map((c) => ({ t: new Date(c.d).getTime(), kind: "commit", c })),
  ...entries.map((e) => ({ t: e.t, kind: "entry", e })),
].sort((a, b) => a.t - b.t);

let html = "";
for (const it of items) {
  if (it.kind === "commit") {
    html += `<div class="commit"><code>${it.c.h}</code> ${esc(it.c.msg)} <span class="ts">${it.c.d}</span></div>\n`;
  } else {
    const e = it.e;
    html += `<div class="comment"><span class="ts">${e.iso}</span><strong>${esc(e.title)}</strong> <span class="meta">[${e.type}]</span><div class="responding">Responding to: ${esc(e.responding)}</div><div>${md(e.body)}</div></div>\n`;
  }
}

let tpl = readFileSync(`${dir}timeline.html`, "utf8");
tpl = tpl.replace("<!--TIMELINE-->", html);
tpl = tpl.replace(/· \d+ entries · \d+ commits/, `· ${entries.length} entries · ${shas.length} commits`);
writeFileSync(`${dir}timeline.html`, tpl);
console.log(`stitched ${entries.length} entries, ${shas.length} commits`);