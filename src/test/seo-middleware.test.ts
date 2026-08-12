import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import middleware from "../../middleware";

/** Vitest kører fra projektroden, hvor public/ ligger. */
const rod = (p: string) => resolve(process.cwd(), p);

/**
 * Disse tests låser indekseringskontrakten fast.
 *
 * Baggrund: middlewaren faldt tilbage på routes["/"] og pageContent["/"] for
 * enhver ukendt sti. Resultatet var, at hver fejlstavet, udgået eller privat
 * URL svarede 200 med hele forsidens indhold og en canonical der pegede på
 * sig selv. Verificeret live: /denne-side-findes-slet-ikke-12345 gav 200 med
 * forsidens indhold. For Google er det et domæne hvor uendeligt mange URL'er
 * er selverklærede dubletter af forsiden, og det koster hele domænets
 * troværdighed, ikke kun de forkerte siders.
 *
 * Falder en af disse tests, er den fejl på vej tilbage.
 */

const SITE = "https://nemtbudget.nu";

const GOOGLEBOT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

/** Overskrift der kun står i forsidens pageContent. Dukker den op på en anden
 *  sti, serverer vi forsidens indhold under en fremmed URL. */
const FORSIDE_MARKOER = "Hvad NemtBudget gør for dig";

/** Statiske sider middlewaren skal kende hver for sig. */
const STATISKE_SIDER = [
  "/lonseddel",
  "/pengetjek",
  "/jobskifte",
  "/lonudvikling",
  "/guides",
  "/b2b",
  "/partner",
  "/privatliv",
  "/vilkaar",
  "/install",
];

beforeAll(() => {
  // Uden nøgle springer guide-fetcheren Supabase-opslaget over og bruger sin
  // fallback. Det holder testene offline og deterministiske.
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

async function fetchAsBot(path: string) {
  const res = await middleware(
    new Request(`${SITE}${path}`, { headers: { "user-agent": GOOGLEBOT } })
  );
  const body = await res.text();
  return {
    status: res.status,
    body,
    title: body.match(/<title>([^<]*)<\/title>/)?.[1] ?? "",
    canonical: body.match(/rel="canonical" href="([^"]*)"/)?.[1] ?? "",
    isNoIndex: /<meta name="robots" content="noindex/.test(body),
  };
}

function sitemapStier(): string[] {
  const xml = readFileSync(rod("public/sitemap.xml"), "utf-8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].replace(SITE, "")
  );
}

describe("SEO-middleware: ukendte stier", () => {
  it("svarer 404 og noindex i stedet for forsidens indhold", async () => {
    const r = await fetchAsBot("/denne-side-findes-slet-ikke-12345");

    expect(r.status).toBe(404);
    expect(r.isNoIndex).toBe(true);
    expect(r.body).not.toContain(FORSIDE_MARKOER);
  });

  it("gør ikke private ruter til dubletter af forsiden", async () => {
    for (const path of ["/admin", "/login"]) {
      const r = await fetchAsBot(path);
      expect(r.status, `${path} skal svare 404`).toBe(404);
      expect(r.body, `${path} må ikke vise forsidens indhold`).not.toContain(
        FORSIDE_MARKOER
      );
    }
  });
});

describe("SEO-middleware: kendte sider", () => {
  it("serverer forsiden med indhold og korrekt canonical", async () => {
    const r = await fetchAsBot("/");

    expect(r.status).toBe(200);
    expect(r.isNoIndex).toBe(false);
    expect(r.body).toContain(FORSIDE_MARKOER);
    expect(r.canonical).toBe(SITE);
  });

  it("giver hver statisk side sin egen canonical og ikke forsidens tekst", async () => {
    for (const path of STATISKE_SIDER) {
      const r = await fetchAsBot(path);

      expect(r.status, `${path} skal svare 200`).toBe(200);
      expect(r.canonical, `${path} skal pege på sig selv`).toBe(`${SITE}${path}`);
      expect(r.body, `${path} må ikke genbruge forsidens tekst`).not.toContain(
        FORSIDE_MARKOER
      );
    }
  });

  it("giver hver statisk side en unik title", async () => {
    const stier = ["/", ...STATISKE_SIDER];
    const titles = await Promise.all(
      stier.map(async (p) => (await fetchAsBot(p)).title)
    );

    expect(titles.filter(Boolean)).toHaveLength(stier.length);
    expect(new Set(titles).size).toBe(stier.length);
  });
});

describe("SEO-middleware: ruter med generisk fallback", () => {
  it("markerer delte budgetter noindex, så hvert share-id ikke bliver en dublet", async () => {
    const r = await fetchAsBot("/s/abc123");

    expect(r.status).toBe(200);
    expect(r.isNoIndex).toBe(true);
    expect(r.body).not.toContain(FORSIDE_MARKOER);
  });

  it("markerer guides vi ikke kan hente noindex frem for at udgive samme tekst igen", async () => {
    const r = await fetchAsBot("/guides/findes-ikke-som-artikel");

    expect(r.status).toBe(200);
    expect(r.isNoIndex).toBe(true);
    expect(r.body).not.toContain(FORSIDE_MARKOER);
  });
});

describe("Sitemap og middleware er enige", () => {
  const stier = sitemapStier();

  it("har et sitemap med indhold at tjekke", () => {
    expect(stier.length).toBeGreaterThan(30);
    expect(stier).toContain("/");
    expect(stier).toContain("/install");
  });

  it("kender hver sti sitemap'et lover Google", async () => {
    for (const sti of stier) {
      const r = await fetchAsBot(sti === "/" ? "/" : sti);

      expect(
        r.status,
        `${sti} står i sitemap.xml, men middlewaren svarer ${r.status}. ` +
          `Enten skal ruten tilføjes til middleware.ts, eller også skal den ud af sitemap'et.`
      ).toBe(200);
    }
  });

  it("serverer ingen statisk sitemap-side med noindex", async () => {
    // Guides undtaget: uden Supabase-nøgle rammer de fallbacken, som med vilje
    // er noindex. I produktion hentes de fra databasen og indekseres normalt.
    const statiske = stier.filter((s) => !s.startsWith("/guides/"));

    for (const sti of statiske) {
      const r = await fetchAsBot(sti);
      expect(r.isNoIndex, `${sti} står i sitemap.xml, men serveres noindex`).toBe(
        false
      );
    }
  });
});

describe("robots.txt", () => {
  const robots = readFileSync(rod("public/robots.txt"), "utf-8");

  it("holder alle user-agents i én gruppe", () => {
    // Robots-grupper er IKKE kumulative. Får en navngiven crawler sin egen
    // gruppe, ignorerer den Disallow-listen i gruppen for "*" fuldstændigt.
    const grupper = robots
      .split(/\n\s*\n/)
      .filter((blok) => /^\s*User-agent:/im.test(blok));

    expect(
      grupper,
      "Hver ekstra gruppe fritager sine crawlere fra Disallow-listen"
    ).toHaveLength(1);
  });

  it("holder admin og login ude af indekset", () => {
    expect(robots).toMatch(/^Disallow: \/admin$/m);
    expect(robots).toMatch(/^Disallow: \/login$/m);
  });

  it("peger på sitemap'et", () => {
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });
});

describe("SEO-middleware: rigtige brugere", () => {
  it("lader browsere få SPA'en frem for bot-HTML", async () => {
    const res = await middleware(
      new Request(`${SITE}/denne-side-findes-slet-ikke-12345`, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        },
      })
    );

    // next() videresender til SPA-shell'en, som selv viser sin 404-side.
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
