import { useEffect } from "react";

const DEFAULT_OG_IMAGE = "/hero-couple.webp";

/**
 * Sets document title, meta description, and Open Graph / Twitter meta tags.
 * Simple alternative to react-helmet — no extra dependency needed.
 */
export function usePageMeta(
  title: string,
  description: string,
  imageUrl?: string
) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;

    const ogImage = imageUrl || DEFAULT_OG_IMAGE;
    const absoluteImage = ogImage.startsWith("http")
      ? ogImage
      : `${window.location.origin}${ogImage}`;
    const pageUrl = window.location.href;

    // Helper: set or create a meta tag
    function setMeta(
      attr: "name" | "property",
      key: string,
      content: string
    ): () => void {
      let el = document.querySelector(
        `meta[${attr}="${key}"]`
      ) as HTMLMetaElement | null;
      const prevContent = el?.content ?? null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
      return () => {
        if (el) {
          if (prevContent === null) {
            el.remove();
          } else {
            el.content = prevContent;
          }
        }
      };
    }

    // Hreflang alternate links (DA/EN/NO — same URL, client-side toggle)
    const hreflangCodes = ["da", "en", "no", "x-default"] as const;
    const hreflangLinks: HTMLLinkElement[] = [];
    for (const code of hreflangCodes) {
      // Remove any existing hreflang link for this code
      const existing = document.querySelector(
        `link[rel="alternate"][hreflang="${code}"]`
      );
      if (existing) existing.remove();

      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = code;
      // x-default points to the same URL (Danish is the default)
      link.href = pageUrl;
      document.head.appendChild(link);
      hreflangLinks.push(link);
    }

    const cleanups = [
      setMeta("name", "description", description),
      // Open Graph
      setMeta("property", "og:title", title),
      setMeta("property", "og:description", description),
      setMeta("property", "og:image", absoluteImage),
      setMeta("property", "og:type", "website"),
      setMeta("property", "og:url", pageUrl),
      // Twitter Card
      setMeta("name", "twitter:card", "summary_large_image"),
      setMeta("name", "twitter:title", title),
      setMeta("name", "twitter:description", description),
    ];

    return () => {
      document.title = prev;
      cleanups.forEach((fn) => fn());
      hreflangLinks.forEach((link) => link.remove());
    };
  }, [title, description, imageUrl]);
}
