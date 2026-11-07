import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['kanbot-pwa.svg'],
      manifest: {
        name: 'Kanbot',
        short_name: 'Kanbot',
        description: 'Agile project management for focused teams.',
        theme_color: '#2563EB',
        background_color: '#F7F8FA',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/kanbot-pwa.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
})
