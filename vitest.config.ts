import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@beastbots/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@beastbots/workers': path.resolve(__dirname, 'packages/workers/src/index.ts'),
    },
  },
  test: {
    globals: true,
    testTimeout: 15000,
    include: ['packages/*/src/**/__tests__/**/*.test.ts'],
    threads: false // run in single thread to avoid parser race conditions
  }
});
