#!/usr/bin/env node
import path from "path";
import { fileURLToPath } from "url";
import { generateSitemap } from "../src/lib/dk-seo/sitemap.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

generateSitemap({
  siteUrl: "https://nemtbudget.nu",
  supabaseUrl: "https://gpzuhhfpwokevsljyumt.supabase.co",
  projectRoot: path.join(__dirname, ".."),
  outputPath: path.join(__dirname, "../public/sitemap.xml"),

  staticRoutes: [
    { path: "/",          changefreq: "weekly",  priority: "1.0" },
    { path: "/guides",    changefreq: "daily",   priority: "0.9" },
    { path: "/b2b",       changefreq: "monthly", priority: "0.6" },
    { path: "/install",   changefreq: "yearly",  priority: "0.4" },
    { path: "/privatliv", changefreq: "yearly",  priority: "0.3" },
    { path: "/vilkaar",   changefreq: "yearly",  priority: "0.3" },
    { path: "/lonseddel", changefreq: "monthly", priority: "0.8" },
    { path: "/pengetjek", changefreq: "monthly", priority: "0.8" },
  ],

  articleTable: "articles",
  articleSelect: "slug,published_at",
  articleFilter: "status=eq.published",
  articlePrefix: "/guides",
});
