import { defineConfig } from '@playwright/test';

const base = '/watercolor-playground/';

export default defineConfig({
  testDir: 'tests/e2e',
  webServer: {
    command: `npm run build && npx vite preview --port 4173 --strictPort --base ${base}`,
    url: `http://localhost:4173${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: `http://localhost:4173${base}`,
    launchOptions: { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
});
