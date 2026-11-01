import { defineConfig } from 'vitest/config';

// `base` is relative so the built game works from any path,
// including GitHub Pages project sites (https://<user>.github.io/<repo>/).
export default defineConfig({
  base: './',
  build: { outDir: 'dist', sourcemap: false },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 120000,
  },
});
