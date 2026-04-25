import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['extension/**/*.js'],
      exclude: ['extension/dist/**'],
      thresholds: {
        lines: 40,
      },
    },
  },
});
