#!/usr/bin/env node
/**
 * Configurable sitemap generator for Danish finance apps.
 * Fetches published articles from Supabase and generates sitemap.xml.
 *
 * Usage:
 *   import { generateSitemap } from "dk-seo/sitemap";
 *   generateSitemap({ siteUrl: "...", staticRoutes: [...], ... });
 */
import fs from "fs";
import path from "path";

// ─── Load .env from project root ─────────────────────────────────────────────
function loadEnv(projectRoot) {
  const envPath = path.join(projectRoot, ".env");
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

// ─── Fetch articles from Supabase ────────────────────────────────────────────
async function fetchArticles(supabaseUrl, supabaseKey, table, select, filter) {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[sitemap] Missing Supabase credentials — skipping article fetch");
    return [];
  }
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/${table}?select=${select}&${filter}&order=published_at.desc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
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

// ─── XML helpers ─────────────────────────────────────────────────────────────
function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── Build XML ───────────────────────────────────────────────────────────────
function buildXml(entries) {
  const urls = entries
    .map(({ loc, lastmod, changefreq, priority }) =>
      [
        "  <url>",
        `    <loc>${escapeXml(loc)}</loc>`,
        lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : "",
        `    <changefreq>${escapeXml(changefreq)}</changefreq>`,
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

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Generate sitemap.xml from config.
 *
 * @param {Object} config
 * @param {string} config.siteUrl - Full site URL without trailing slash
 * @param {string} config.supabaseUrl - Supabase project URL (or env var name)
 * @param {string} [config.supabaseKeyEnv="VITE_SUPABASE_PUBLISHABLE_KEY"] - Env var for anon key
 * @param {Array<{path: string, changefreq: string, priority: string}>} config.staticRoutes
 * @param {string} config.articleTable - Supabase table name
 * @param {string} config.articleSelect - Supabase select fields
 * @param {string} config.articleFilter - Supabase filter query
 * @param {string} config.articlePrefix - URL prefix for articles, e.g. "/guides"
 * @param {string} [config.articleChangefreq="monthly"]
 * @param {string} [config.articlePriority="0.7"]
 * @param {string} config.outputPath - Absolute path for output file
 * @param {string} config.projectRoot - Project root for .env loading
 */
export async function generateSitemap(config) {
  const {
    siteUrl,
    supabaseUrl: supabaseUrlOverride,
    supabaseKeyEnv = "VITE_SUPABASE_PUBLISHABLE_KEY",
    staticRoutes,
    articleTable,
    articleSelect,
    articleFilter,
    articlePrefix,
    articleChangefreq = "monthly",
    articlePriority = "0.7",
    outputPath,
    projectRoot,
  } = config;

  // Load .env
  if (projectRoot) loadEnv(projectRoot);

  const supabaseUrl = supabaseUrlOverride || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env[supabaseKeyEnv];
  const baseUrl = (process.env.VITE_SITE_URL ?? siteUrl).replace(/\/$/, "");

  const articles = await fetchArticles(supabaseUrl, supabaseKey, articleTable, articleSelect, articleFilter);

  const staticEntries = staticRoutes.map((r) => ({
    loc: `${baseUrl}${r.path}`,
    changefreq: r.changefreq,
    priority: r.priority,
  }));

  const articleEntries = articles.map((a) => ({
    loc: `${baseUrl}${articlePrefix}/${a.slug}`,
    lastmod: a.published_at ? a.published_at.split("T")[0] : undefined,
    changefreq: articleChangefreq,
    priority: articlePriority,
  }));

  const all = [...staticEntries, ...articleEntries];
  const xml = buildXml(all);

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, xml, "utf-8");
  console.log(`[sitemap] ${baseUrl} — ${all.length} URLs (${articles.length} articles + ${staticEntries.length} static)`);
}
