import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000, // 10s timeout for async tests
  },
}); 