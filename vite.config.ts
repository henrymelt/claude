import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
//
// `vite build` produces the installable web app (PWA): after the first visit the service
// worker caches every file, so it runs offline and data never leaves the device.
// `vite build --mode single` inlines everything into one self-contained index.html instead
// (used for the claude.ai page; service workers can't run there).
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    // Relative paths, so the app works from any folder (e.g. GitHub Pages' /claude/).
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      single
        ? viteSingleFile()
        : VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
            manifest: {
              name: 'Personal Ledger',
              short_name: 'Ledger',
              description: 'Double-entry personal bookkeeping. Runs offline; your data stays on this device.',
              lang: 'en-GB',
              start_url: './',
              scope: './',
              display: 'standalone',
              theme_color: '#4f46e5',
              background_color: '#f8fafc',
              icons: [
                { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
          }),
    ],
    build: single ? { outDir: 'dist-single' } : {},
  }
})
