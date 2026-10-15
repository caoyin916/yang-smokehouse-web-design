// QA for ./dist: run `node scripts/check.mjs` after `node build.mjs`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const pages = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p); else if (p.endsWith(".html")) pages.push(p);
});
walk(DIST);

let problems = 0;
const fail = (page, msg) => { problems++; console.log(`  ✗ ${path.relative(DIST, page)}: ${msg}`); };
const exists = (url) => {
  const clean = decodeURI(url.split(/[?#]/)[0]);
  const p = path.join(DIST, clean);
  return fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(path.join(p, "index.html")));
};

for (const page of pages) {
  const html = fs.readFileSync(page, "utf8");
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] || "";
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] || "";
  if (!title) fail(page, "missing <title>");
  if (title.length > 75) fail(page, `title is ${title.length} chars`);
  if (!html.includes('content="noindex"') && (desc.length < 70 || desc.length > 165)) fail(page, `description is ${desc.length} chars`);
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(page, `${h1s} <h1> elements`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { fail(page, "invalid JSON-LD: " + e.message); }
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(m[0])) fail(page, "img without alt: " + m[0].slice(0, 80));
    if (!/\swidth="\d+"/.test(m[0]) && !/src=""/.test(m[0])) fail(page, "img without width/height: " + m[0].slice(0, 80));
  }
  const refs = [...html.matchAll(/\s(?:href|src|data-lightbox)="(\/[^"]*)"/g), ...html.matchAll(/(?:srcset|imagesrcset)="([^"]*)"/g)]
    .flatMap((m) => m[1].split(",").map((s) => s.trim().split(/\s+/)[0]))
    .filter((u) => u.startsWith("/") && !u.startsWith("//"));
  for (const u of new Set(refs)) if (!exists(u)) fail(page, "broken link: " + u);
  // dish deep links must point at real dishes
  for (const m of html.matchAll(/href="\/menu\/#dish-([^"]+)"/g)) {
    const menuHtml = fs.readFileSync(path.join(DIST, "menu/index.html"), "utf8");
    if (!menuHtml.includes(`data-dish="${m[1]}"`)) fail(page, "dish link to missing dish: " + m[1]);
  }
  console.log(`✓ ${path.relative(DIST, page).padEnd(22)} ${String(title.length).padStart(3)}ch title, ${String(desc.length).padStart(3)}ch description, ${(html.length / 1024).toFixed(0)} KB`);
}
console.log(problems ? `\n${problems} problem(s) found` : "\nAll checks passed");
process.exitCode = problems ? 1 : 0;
