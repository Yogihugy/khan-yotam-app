import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Khan Yotam — Sea Trail',
        short_name: 'Khan Yotam',
        description: 'See who\'s on the Sea Trail, chat, call for help',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#1a3a4a',
        background_color: '#0f2a36',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
