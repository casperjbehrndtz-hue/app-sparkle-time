#!/usr/bin/env node
/**
 * Generates public/sitemap.xml at build time.
 * Fetches all published article slugs from Supabase so new AI-generated
 * articles are immediately discoverable by Google after each deploy.
 *
 * Usage: node scripts/generate-sitemap.mjs
 * Automatically runs as part of `npm run build` via the prebuild script.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Load .env ────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, "../.env");
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
    }
  } catch {
    // .env missing — fall back to environment variables already set
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SITE_URL = (process.env.VITE_SITE_URL ?? "https://nemtbudget.nu").replace(/\/$/, "");

// ─── Static routes ─────────────────────────────────────────────────────────
const STATIC_ROUTES = [
  { path: "/",         changefreq: "weekly",  priority: "1.0" },
  { path: "/guides",   changefreq: "daily",   priority: "0.9" },
  { path: "/b2b",      changefreq: "monthly", priority: "0.6" },
  { path: "/install",  changefreq: "yearly",  priority: "0.4" },
  { path: "/privatliv",changefreq: "yearly",  priority: "0.3" },
  { path: "/vilkaar",  changefreq: "yearly",  priority: "0.3" },
  { path: "/lonseddel",changefreq: "monthly", priority: "0.8" },
  { path: "/pengetjek",changefreq: "monthly", priority: "0.8" },
];

// ─── Fetch published article slugs from Supabase ──────────────────────────
async function fetchArticles() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[sitemap] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — skipping article fetch");
    return [];
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?select=slug,published_at&status=eq.published&order=published_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) {
      console.warn(`[sitemap] Supabase returned ${res.status} — only static routes in sitemap`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("[sitemap] Could not fetch articles:", err.message);
    return [];
  }
}

// ─── Build XML ────────────────────────────────────────────────────────────
function buildXml(entries) {
  const urls = entries
    .map(({ loc, lastmod, changefreq, priority }) =>
      [
        "  <url>",
        `    <loc>${loc}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const articles = await fetchArticles();

  const staticEntries = STATIC_ROUTES.map((r) => ({
    loc: `${SITE_URL}${r.path}`,
    changefreq: r.changefreq,
    priority: r.priority,
  }));

  const articleEntries = articles.map((a) => ({
    loc: `${SITE_URL}/guides/${a.slug}`,
    lastmod: a.published_at ? a.published_at.split("T")[0] : undefined,
    changefreq: "monthly",
    priority: "0.7",
  }));

  const all = [...staticEntries, ...articleEntries];
  const xml = buildXml(all);

  const outPath = path.join(__dirname, "../public/sitemap.xml");
  fs.writeFileSync(outPath, xml, "utf-8");
  console.log(`[sitemap] ✓ ${all.length} URLs (${articles.length} articles + ${staticEntries.length} static)`);
}

main().catch((err) => {
  console.error("[sitemap] Fatal:", err);
  process.exit(1);
});
