import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * API integration tests. They call a running dev server (TEST_API_BASE,
 * default http://localhost:3031) backed by the local Docker Postgres, and
 * create/destroy their own throwaway bakeries in global setup.
 *
 *   npx next dev --port 3031   # in another terminal
 *   npm run test:api
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/api/global-setup.ts'],
    // Tests share two bakeries; run files serially so counts stay predictable.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
