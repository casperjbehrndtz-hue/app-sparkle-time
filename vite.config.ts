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
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-charts": ["recharts"],
          "vendor-motion": ["framer-motion"],
          "vendor-radix": [
            "@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-tabs",
            "@radix-ui/react-accordion", "@radix-ui/react-tooltip", "@radix-ui/react-slider",
            "@radix-ui/react-popover", "@radix-ui/react-dropdown-menu", "@radix-ui/react-radio-group",
          ],
          "vendor-d3": ["d3-sankey", "d3-shape"],
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
    },
  },
});
