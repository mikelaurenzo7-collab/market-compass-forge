import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@beastbots/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@beastbots/workers': path.resolve(__dirname, 'packages/workers/src/index.ts'),
    },
    // Allow TypeScript ESM imports (.js extension → resolve .ts source)
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
  },
  test: {
    globals: true,
    testTimeout: 15000,
    include: ['packages/*/src/**/__tests__/**/*.test.ts', 'openclaw/**/*.test.ts'],
    threads: false // run in single thread to avoid parser race conditions
  }
});
