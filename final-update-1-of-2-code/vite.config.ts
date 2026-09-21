import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'icons/favicon-16.png',
        'icons/favicon-32.png',
        'icons/apple-touch-icon.png',
      ],
      manifest: {
        id: '/',
        name: 'Mausam — Environmental Intelligence',
        short_name: 'Mausam',
        description:
          'Live weather, air quality, pollution mapping, AI predictions, and early environmental warnings.',
        theme_color: '#1D6FDC',
        background_color: '#EAF3FD',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['weather', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // OpenStreetMap tiles used by the pollution map — cache so the
            // map keeps working offline or on a flaky connection.
            urlPattern: ({ url }) => /tile\.openstreetmap\.org$/.test(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Weather / air-quality / geocoding APIs — serve fast from
            // cache, refresh in the background.
            urlPattern: ({ url }) =>
              [
                'api.open-meteo.com',
                'air-quality-api.open-meteo.com',
                'archive-api.open-meteo.com',
                'geocoding-api.open-meteo.com',
                'api.bigdatacloud.net',
              ].includes(url.hostname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'env-data-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
  },
})
