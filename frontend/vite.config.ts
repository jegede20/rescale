import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const apiProxyTarget = 'http://127.0.0.1:8000';

const makePostOnlyProxy = () => ({
  target: apiProxyTarget,
  changeOrigin: true,
  bypass(req: { method?: string }) {
    if (req.method !== 'POST' && req.method !== 'OPTIONS') {
      return '/index.html';
    }
    return undefined;
  },
});

const proxyRoutes = {
  '/parse': makePostOnlyProxy(),
  '/scrape': makePostOnlyProxy(),
  '/ocr': makePostOnlyProxy(),
  '/voice': makePostOnlyProxy(),
  '/ai-parse': makePostOnlyProxy(),
  '/nutrition': makePostOnlyProxy(),
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Rescale',
        short_name: 'Rescale',
        description: 'Your recipe. Perfectly sized.',
        theme_color: '#C4622D',
        background_color: '#FAFAF7',
        display: 'standalone',
        start_url: '/app',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,woff2}'],
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: proxyRoutes,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: proxyRoutes,
  },
});
