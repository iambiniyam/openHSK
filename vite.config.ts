import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig(() => ({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon-192.svg', 'icon-512.svg', 'brand/**/*.svg'],
      manifest: {
        name: 'OpenHSK',
        short_name: 'OpenHSK',
        description: 'Chinese learning app with HSK vocabulary, pinyin, stroke order, and quizzes.',
        theme_color: '#c2410c',
        background_color: '#fff7ed',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,json,txt,woff2}'],
        globIgnores: ['**/hsk3.0.json', '**/dictionary.txt', '**/graphics.txt', '**/cedict.txt.gz'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/(hsk3\.0\.json|dictionary\.txt|graphics\.txt)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'openhsk-dataset-cache',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 6,
                maxAgeSeconds: 60 * 60 * 24 * 45,
              },
            },
          },
          {
            urlPattern: ({ url }) => /\/brand\/.*\.svg$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'openhsk-brand-svg-cache',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'openhsk-image-cache',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
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
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('d3') || id.includes('react-force-graph-2d')) {
            return 'graph-vendor';
          }
          if (id.includes('hanzi-writer')) {
            return 'hanzi-vendor';
          }
          if (id.includes('@radix-ui')) {
            return 'radix-vendor';
          }
          if (id.includes('framer-motion')) {
            return 'motion-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
}));
