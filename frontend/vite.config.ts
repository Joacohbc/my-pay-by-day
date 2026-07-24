import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const chatbotPort = env.VITE_CHATBOT_PORT || env.CHATBOT_PORT || '3001'
  const backendPort = env.VITE_BACKEND_PORT || env.BACKEND_PORT || '8080'

  return {
    define: {
      __APP_VERSION__: JSON.stringify(env.GIT_SHA ?? process.env.GIT_SHA ?? 'dev'),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // The app can sit behind cookie-based auth walls (e.g. Cloudflare Access);
        // without credentials the manifest request gets redirected to the login
        // page and fails with a CORS error.
        useCredentials: true,
        manifest: {
          name: 'MyPayByDay',
          short_name: 'MyPayByDay',
          description: 'Personal finance tracker',
          start_url: '/',
          display: 'standalone',
          background_color: '#1B1E23',
          theme_color: '#1B1E23',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          share_target: {
            action: '/share-target',
            method: 'POST',
            enctype: 'multipart/form-data',
            params: {
              title: 'title',
              text: 'text',
              url: 'url',
              files: [
                {
                  name: 'files',
                  accept: ['image/*', 'application/pdf', 'text/plain', 'text/csv']
                }
              ]
            }
          }
        },
        workbox: {
          importScripts: ['/sw-share-target.js'],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallbackDenylist: [/^\/api\//, /^\/ws\//, /^\/grafana\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
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
      proxy: {
        '/api/ai': {
          target: `http://localhost:${chatbotPort}`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
        '/api/agent-tasks': {
          target: `http://localhost:${chatbotPort}`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
        '/ws': {
          target: `http://localhost:${backendPort}`,
          ws: true,
        },
      },
    },
  }
})
