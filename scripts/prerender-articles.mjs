#!/usr/bin/env node
/**
 * Post-build: pre-renders all published articles to static HTML files.
 *
 * Runs AFTER vite build. For each article in Supabase:
 *  1. Fetches full content
 *  2. Converts markdown → HTML
 *  3. Injects SEO meta tags + content into the built index.html shell
 *  4. Writes dist/guides/[slug]/index.html
 *
 * Result: Googlebot gets full article HTML immediately — no JS rendering needed.
 * Real users still get the React SPA (createRoot replaces the pre-rendered content).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "../dist");

// ─── Env ──────────────────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const content = fs.readFileSync(path.join(__dirname, "../.env"), "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
    }
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SITE_URL = (process.env.VITE_SITE_URL ?? "https://kassen.dk").replace(/\/$/, "");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Minimal markdown → HTML for Google-readable content */
function mdToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let inTable = false;
  let tableHead = true;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("## ")) {
      if (inTable) { out.push("</table>"); inTable = false; }
      out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      if (inTable) { out.push("</table>"); inTable = false; }
      out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
    } else if (line.startsWith("- ")) {
      if (inTable) { out.push("</table>"); inTable = false; }
      out.push(`<li>${inlineFormat(line.slice(2))}</li>`);
    } else if (line.startsWith("| ") && line.includes("|")) {
      const cells = line.split("|").filter(Boolean).map((c) => c.trim());
      // Skip separator rows like |---|---|
      if (cells.every((c) => /^[-: ]+$/.test(c))) {
        tableHead = false;
        continue;
      }
      if (!inTable) {
        out.push("<table>");
        inTable = true;
        tableHead = true;
      }
      const tag = tableHead ? "th" : "td";
      out.push(
        `<tr>${cells
          .map((c) => `<${tag}>${inlineFormat(c)}</${tag}>`)
          .join("")}</tr>`
      );
      tableHead = false;
    } else if (line.trim() === "") {
      if (inTable) { out.push("</table>"); inTable = false; tableHead = true; }
      out.push("<br>");
    } else {
      if (inTable) { out.push("</table>"); inTable = false; tableHead = true; }
      out.push(`<p>${inlineFormat(line)}</p>`);
    }
  }

  if (inTable) out.push("</table>");
  return out.join("\n");
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
}

// ─── Fetch articles ───────────────────────────────────────────────────────────
async function fetchArticles() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[prerender] Missing Supabase credentials — skipping pre-render");
    return [];
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/articles?select=slug,title,excerpt,category,read_time,content,published_at&status=eq.published&order=published_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!res.ok) {
    console.warn(`[prerender] Supabase ${res.status} — skipping pre-render`);
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ─── Build the pre-rendered HTML page ────────────────────────────────────────
function buildPage(shellHtml, article) {
  const { slug, title, excerpt, category, read_time, content, published_at } = article;

  const description = (excerpt || content || "")
    .slice(0, 155)
    .replace(/[#\n*|]/g, "")
    .trim();

  const canonical = `${SITE_URL}/guides/${slug}`;

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: canonical,
    datePublished: published_at ?? undefined,
    inLanguage: "da",
    publisher: {
      "@type": "Organization",
      name: "Kassen",
      url: SITE_URL,
    },
  });

  // Replace all generic SEO tags with article-specific ones
  let html = shellHtml
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)} — Kassen</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(description)}">`)
    .replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="article">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(description)}">`)
    // Remove generic WebApplication JSON-LD (will be replaced with Article schema)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, "");

  const headInject = `
  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:url" content="${esc(canonical)}">
  <script type="application/ld+json">${jsonLd}</script>`;

  html = html.replace("</head>", `${headInject}\n</head>`);

  // Inject readable article content into #root for Googlebot
  const articleHtml = `
<div id="root" data-prerendered="true">
<header>
  <a href="/guides" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;color:#666;text-decoration:none;padding:12px 16px;">← Guides</a>
</header>
<main style="max-width:720px;margin:0 auto;padding:40px 16px;">
  <p style="font-size:12px;color:#999;margin-bottom:8px;">${esc(read_time ?? "")} læsetid · ${esc(category ?? "")}</p>
  <h1 style="font-size:2rem;font-weight:900;line-height:1.2;margin-bottom:32px;">${esc(title)}</h1>
  <div class="article-content">
    ${mdToHtml(content ?? "")}
  </div>
  <div style="margin-top:64px;padding:32px;background:#1a2332;border-radius:16px;text-align:center;">
    <h3 style="color:#fff;font-size:1.25rem;font-weight:700;margin-bottom:8px;">Beregn dit eget rådighedsbeløb</h3>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:20px;">Gratis · 3 minutter · Ingen login</p>
    <a href="/" style="display:inline-block;padding:12px 24px;background:#fff;color:#1a2332;font-weight:600;font-size:14px;border-radius:12px;text-decoration:none;">Prøv Kassen →</a>
  </div>
</main>
</div>`;

  html = html.replace('<div id="root"></div>', articleHtml);

  return html;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const shellPath = path.join(DIST, "index.html");
  if (!fs.existsSync(shellPath)) {
    console.error("[prerender] dist/index.html not found — run vite build first");
    process.exit(1);
  }

  const shellHtml = fs.readFileSync(shellPath, "utf-8");
  const articles = await fetchArticles();

  if (articles.length === 0) {
    console.log("[prerender] No published articles found — nothing to pre-render");
    return;
  }

  let count = 0;
  for (const article of articles) {
    try {
      const html = buildPage(shellHtml, article);
      const dir = path.join(DIST, "guides", article.slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
      count++;
    } catch (err) {
      console.warn(`[prerender] Failed for ${article.slug}:`, err.message);
    }
  }

  console.log(`[prerender] ✓ Pre-rendered ${count}/${articles.length} articles`);
}

main().catch((err) => {
  console.error("[prerender] Fatal:", err);
  process.exit(1);
});
