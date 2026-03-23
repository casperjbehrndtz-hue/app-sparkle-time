import type { VercelRequest, VercelResponse } from "@vercel/node";

const SITE = "https://nemtbudget.nu";
const SITE_NAME = "NemtBudget";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://gpzuhhfpwokevsljyumt.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

interface Post { slug: string; title: string; excerpt: string; published_at: string }

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  let posts: Post[] = [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?select=slug,title,excerpt,published_at&status=eq.published&order=published_at.desc&limit=50`,
      { headers: { apikey: SUPABASE_KEY } }
    );
    if (r.ok) posts = await r.json();
  } catch { /* fallback to empty */ }

  const items = posts.map(p => `    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${SITE}/guides/${p.slug}</link>
      <guid isPermaLink="true">${SITE}/guides/${p.slug}</guid>
      <description><![CDATA[${p.excerpt || ""}]]></description>
      <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>
    </item>`).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE}</link>
    <description>Guides om budget, lønseddel og privatøkonomi i Danmark</description>
    <language>da</language>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.status(200).send(xml);
}
