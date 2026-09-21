/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Fills `%SITE_URL%` in index.html and emits the Zalo verification tag only when
 * VITE_ZALO_VERIFICATION is set, so a fresh clone builds correct absolute meta
 * URLs (OG/Twitter need them) without any .env file present.
 */
function htmlEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = (env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/+$/, '')
  const zalo = env.VITE_ZALO_VERIFICATION || ''

  return {
    name: 'splitz:html-env',
    transformIndexHtml(html: string) {
      return html
        .replaceAll('%SITE_URL%', siteUrl)
        .replaceAll(
          '%ZALO_VERIFY_META%',
          zalo ? `<meta name="zalo-platform-site-verification" content="${zalo}" />` : '',
        )
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    htmlEnv(mode),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: false, // dùng public/manifest.webmanifest tự viết
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // KHÔNG precache cấu hình runtime: Docker entrypoint ghi đè file này lúc
        // container khởi động — precache kèm content-hash sẽ đông băng cấu hình
        // của lần build. File nhỏ, thêm <script> blocking mỗi navigation là ổn.
        globIgnores: ['runtime-config.js'],
        navigateFallback: '/index.html',
        // Nhúng handler Web Push (push/notificationclick) vào SW do Workbox sinh ra,
        // để /sw.js có CẢ precache caching LẪN push (trước đây generateSW đè mất push).
        importScripts: ['/push-sw.js'],
        runtimeCaching: [
          {
            // Logo ngân hàng VietQR — cache lâu, dùng cache trước.
            urlPattern: /^https:\/\/cdn\.vietqr\.io\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vietqr-logos',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Font Google — cache lâu.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
}))
