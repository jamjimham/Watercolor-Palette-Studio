import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Several source files (value-study.js in particular) run
    // browser-init code — event listener wiring, etc. — at module-load
    // time, same as the original single-file app did. jsdom gives tests
    // real window/document globals so those modules import cleanly,
    // rather than needing every test file to hand-roll its own stubs.
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
});
