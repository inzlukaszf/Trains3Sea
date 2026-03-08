import { defineConfig } from 'vitest/config'

/**
 * Separate Vitest config for Selenium E2E tests.
 * Run with: npm run test:e2e
 * The app dev server must be running (start-server-and-test handles this).
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',         // E2E tests run in Node, not jsdom
    include: ['src/test/selenium/**/*.test.js'],
    testTimeout: 60000,
    hookTimeout: 30000,
    reporters: ['verbose'],
    pool: 'forks',               // Each suite gets its own process
    singleFork: true,            // One browser instance for all tests
  },
})
