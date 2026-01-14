import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/', '*.config.js', '*.config.mjs'],
    },
    globals: true,
    setupFiles: ['./test/setup.mjs'],
  },
});
