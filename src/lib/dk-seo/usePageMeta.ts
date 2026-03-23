import { useEffect } from "react";
import type { PageMetaConfig, PageMetaOptions } from "./types";

// ── Helper: set or create a meta tag, return cleanup function ──
function setMeta(
  attr: "name" | "property",
  key: string,
  content: string
): () => void {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  const prevContent = el?.content ?? null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
  return () => {
    if (el) {
      if (prevContent === null) el.remove();
      else el.content = prevContent;
    }
  };
}

// ── Helper: set or create canonical link ──
function setCanonical(url: string): () => void {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  const prevHref = el?.href ?? null;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = url;
  return () => {
    if (el) {
      if (prevHref === null) el.remove();
      else el.href = prevHref;
    }
  };
}

/**
 * Creates a configured usePageMeta hook for a specific site.
 *
 * Usage:
 * ```typescript
 * // hooks/usePageMeta.ts
 * import { createUsePageMeta } from "dk-seo/react";
 * export const usePageMeta = createUsePageMeta({
 *   siteUrl: "https://nemtbudget.nu",
 *   siteName: "NemtBudget",
 *   defaultOgImage: "/og-nemtbudget.png",
 * });
 * ```
 */
export function createUsePageMeta(config: PageMetaConfig) {
  const {
    siteUrl,
    siteName,
    defaultOgImage,
    ogLocale = "da_DK",
    twitterSite,
    hreflangCodes = ["da", "x-default"],
  } = config;

  return function usePageMeta(options: PageMetaOptions) {
    const { title, description, path, ogImage, noIndex, jsonLd } = options;

    useEffect(() => {
      const prevTitle = document.title;
      document.title = title;

      const pagePath = path || window.location.pathname;
      const canonicalHref = `${siteUrl}${pagePath}`;
      const image = ogImage
        ? ogImage.startsWith("http") ? ogImage : `${window.location.origin}${ogImage}`
        : defaultOgImage.startsWith("http") ? defaultOgImage : `${window.location.origin}${defaultOgImage}`;

      const cleanups: (() => void)[] = [];

      // Canonical
      cleanups.push(setCanonical(canonicalHref));

      // Hreflang — clean stale and set fresh
      const staleHreflang = document.querySelectorAll('link[rel="alternate"][hreflang]');
      const prevHreflang: HTMLLinkElement[] = [];
      staleHreflang.forEach((el) => {
        prevHreflang.push(el.cloneNode(true) as HTMLLinkElement);
        el.remove();
      });
      const hreflangLinks: HTMLLinkElement[] = [];
      for (const code of hreflangCodes) {
        const link = document.createElement("link");
        link.rel = "alternate";
        link.hreflang = code;
        link.href = canonicalHref;
        document.head.appendChild(link);
        hreflangLinks.push(link);
      }

      // Standard meta
      cleanups.push(setMeta("name", "description", description));
      if (noIndex) {
        cleanups.push(setMeta("name", "robots", "noindex, nofollow"));
      }

      // Open Graph
      cleanups.push(setMeta("property", "og:title", title));
      cleanups.push(setMeta("property", "og:description", description));
      cleanups.push(setMeta("property", "og:image", image));
      cleanups.push(setMeta("property", "og:type", "website"));
      cleanups.push(setMeta("property", "og:url", canonicalHref));
      cleanups.push(setMeta("property", "og:locale", ogLocale));
      cleanups.push(setMeta("property", "og:site_name", siteName));

      // Twitter Card
      cleanups.push(setMeta("name", "twitter:card", "summary_large_image"));
      cleanups.push(setMeta("name", "twitter:title", title));
      cleanups.push(setMeta("name", "twitter:description", description));
      cleanups.push(setMeta("name", "twitter:image", image));
      if (twitterSite) {
        cleanups.push(setMeta("name", "twitter:site", twitterSite));
      }

      // JSON-LD
      let scriptEl: HTMLScriptElement | null = null;
      if (jsonLd) {
        scriptEl = document.createElement("script");
        scriptEl.type = "application/ld+json";
        scriptEl.textContent = JSON.stringify(jsonLd);
        scriptEl.setAttribute("data-page-meta", "true");
        document.head.appendChild(scriptEl);
      }

      return () => {
        document.title = prevTitle;
        cleanups.forEach((fn) => fn());
        hreflangLinks.forEach((link) => link.remove());
        // Restore previous hreflang if any
        prevHreflang.forEach((el) => document.head.appendChild(el));
        if (scriptEl?.parentNode) scriptEl.parentNode.removeChild(scriptEl);
      };
    }, [title, description, path, ogImage, noIndex, jsonLd]);
  };
}
