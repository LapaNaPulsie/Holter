/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon-32.png', 'favicon-64.png', 'assets/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Dzienniczek holterowski | Łapa na Pulsie',
        short_name: 'Holter',
        description: 'Dzienniczek obserwacji opiekuna w czasie badania Holter EKG psa lub kota.',
        lang: 'pl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#FFF5EB',
        theme_color: '#FFF5EB',
        icons: [
          { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/assets/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tylko pliki aplikacji (działa też bez zasięgu, np. na spacerze). Wpisy są w pamięci przeglądarki, nigdy w cache.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,ttf,webmanifest}'],
        globIgnores: ['**/html2canvas*', '**/purify*', '**/index.es-*'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/\.netlify\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    assetsDir: 'static',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'netlify/**/*.test.ts'],
  },
});
