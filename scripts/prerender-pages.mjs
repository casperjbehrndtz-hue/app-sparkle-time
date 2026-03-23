#!/usr/bin/env node
/**
 * Post-build: pre-renders core pages with correct SEO meta tags.
 *
 * For each page in PAGES:
 *  1. Reads dist/index.html as template
 *  2. Injects page-specific <title>, <meta description>, <link canonical>
 *  3. Writes dist/[path]/index.html
 *
 * Result: Googlebot gets correct meta tags immediately — no JS rendering needed.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "../dist");
const SITE_URL = "https://nemtbudget.nu";

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PAGES = [
  {
    path: "/lonseddel",
    title: "Lønseddel-analyse — Forstå din løn og skat | NemtBudget",
    description:
      "Upload din lønseddel og se præcis hvad du betaler i skat, hvad din arbejdsgiver betaler for dig, og om din løn matcher medianen. Gratis og anonymt.",
  },
  {
    path: "/pengetjek",
    title: "Pengetjekket — Se hvor dine penge forsvinder | NemtBudget.nu",
    description:
      "Upload dit kontoudtog og få overblik over dit forbrug på 30 sekunder. Find skjulte abonnementer og unødvendige udgifter. Gratis og anonymt.",
  },
  {
    path: "/guides",
    title: "Guides & sparetips — NemtBudget",
    description:
      "Praktiske guides, sparetips og beregninger til din privatøkonomi. Budget, opsparing, skat og forsikring forklaret nemt.",
  },
];

function buildPage(shellHtml, page) {
  const canonical = `${SITE_URL}${page.path}`;

  let html = shellHtml
    .replace(/<title>.*?<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${esc(page.description)}">`
    );

  // Inject canonical link before </head>
  const headInject = `  <link rel="canonical" href="${esc(canonical)}">`;
  html = html.replace("</head>", `${headInject}\n</head>`);

  return html;
}

function main() {
  const shellPath = path.join(DIST, "index.html");
  if (!fs.existsSync(shellPath)) {
    console.error("[prerender-pages] dist/index.html not found — run vite build first");
    process.exit(1);
  }

  const shellHtml = fs.readFileSync(shellPath, "utf-8");

  let count = 0;
  for (const page of PAGES) {
    try {
      const html = buildPage(shellHtml, page);
      const dir = path.join(DIST, page.path.slice(1));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
      count++;
      console.log(`[prerender-pages] ✓ ${page.path}`);
    } catch (err) {
      console.warn(`[prerender-pages] Failed for ${page.path}:`, err.message);
    }
  }

  console.log(`[prerender-pages] Done — ${count}/${PAGES.length} pages pre-rendered`);
}

main();
