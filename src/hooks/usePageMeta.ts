import { createUsePageMeta } from "@/lib/dk-seo/usePageMeta";
import type { PageMetaOptions } from "@/lib/dk-seo/types";

const usePageMetaInternal = createUsePageMeta({
  siteUrl: "https://nemtbudget.nu",
  siteName: "NemtBudget",
  defaultOgImage: "/og-nemtbudget.png",
  hreflangCodes: ["da", "x-default"],
});

/**
 * Sets document title, meta description, and Open Graph / Twitter meta tags.
 * Backwards-compatible wrapper: accepts (title, description, imageUrl?) or PageMetaOptions.
 */
export function usePageMeta(
  titleOrOptions: string | PageMetaOptions,
  description?: string,
  imageUrl?: string
) {
  if (typeof titleOrOptions === "string") {
    usePageMetaInternal({ title: titleOrOptions, description: description!, ogImage: imageUrl });
  } else {
    usePageMetaInternal(titleOrOptions);
  }
}
