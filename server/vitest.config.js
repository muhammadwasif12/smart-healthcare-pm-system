import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    root: path.resolve(__dirname, '..'),
    include: ['tests/**/*.test.js'],
    testTimeout: 15000,
    hookTimeout: 15000,
    deps: {
      inline: [/vitest/],
    },
  },
  resolve: {
    alias: {
      vitest: path.resolve(__dirname, 'node_modules/vitest'),
    },
  },
});
