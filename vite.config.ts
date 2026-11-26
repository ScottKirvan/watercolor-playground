import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  // Preact JSX plus Prefresh, so component edits hot-swap without reloading the page (and losing the painting)
  plugins: [
    preact(),
    VitePWA({
      // 'prompt' keeps a new service worker waiting until every tab is closed: an automatic reload would wipe an unsaved painting
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Watercolor',
        short_name: 'Watercolor',
        description: 'A watercolour painting app that runs in your browser.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#e9e5dc',
        theme_color: '#e9e5dc',
        file_handlers: [
          { action: './', accept: { 'application/x-watercolor-project': ['.wcp'] } },
        ],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // the shell is precached; the 3 MB HEIC decoder and the font previews are cached the first time they are used
        globPatterns: ['**/*.{js,css,html}', 'icons/apple-touch-icon.png'],
        globIgnores: ['**/heic-to-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/assets/heic-to-'),
            handler: 'CacheFirst',
            options: { cacheName: 'heic-decoder' },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/fonts/single-line/'),
            handler: 'CacheFirst',
            options: { cacheName: 'single-line-fonts' },
          },
        ],
      },
    }),
  ],
  server: { host: true },
  // the HEIC decoder (~3 MB) is its own chunk, only fetched when an iPhone photo needs it
  build: { chunkSizeWarningLimit: 3500 },
});
