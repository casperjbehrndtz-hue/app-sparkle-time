import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "offline.html"],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages",
              networkTimeoutSeconds: 3,
              plugins: [
                {
                  handlerDidError: async () => {
                    return caches.match("/offline.html");
                  },
                },
              ],
            },
          },
        ],
      },
      manifest: {
        name: "NemtBudget – Smart budgetværktøj",
        short_name: "NemtBudget",
        description: "Find ud af hvad du reelt har til overs. Danmarks nemmeste budgetværktøj.",
        theme_color: "#1a2332",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // React core
            if (id.includes("/react-dom/") || id.includes("/react/") || id.includes("/scheduler/")) {
              return "vendor-react";
            }
            // Router
            if (id.includes("/react-router") || id.includes("/@remix-run/")) {
              return "vendor-router";
            }
            // Framer Motion
            if (id.includes("/framer-motion/")) {
              return "vendor-motion";
            }
            // Recharts (charting library, lazy-loaded with dashboard)
            if (id.includes("/recharts/")) {
              return "vendor-recharts";
            }
            // D3 (used by recharts + sankey)
            if (id.includes("/d3-") || id.includes("/victory-vendor/")) {
              return "vendor-d3";
            }
            // Radix UI primitives
            if (id.includes("/@radix-ui/")) {
              return "vendor-radix";
            }
            // Lucide icons
            if (id.includes("/lucide-react/")) {
              return "vendor-icons";
            }
            // PDF.js (lazy-loaded for payslip/pengetjek)
            if (id.includes("/pdfjs-dist/")) {
              return "vendor-pdfjs";
            }
            // Supabase
            if (id.includes("/@supabase/")) {
              return "vendor-supabase";
            }
            // Floating UI (tooltips, popovers)
            if (id.includes("/@floating-ui/") || id.includes("/floating-ui/")) {
              return "vendor-floating";
            }
            // Markdown rendering
            if (id.includes("/react-markdown/") || id.includes("/remark-") || id.includes("/rehype-") || id.includes("/unified/") || id.includes("/mdast-") || id.includes("/hast-") || id.includes("/micromark")) {
              return "vendor-markdown";
            }
          }
        },
      },
    },
  },
});
