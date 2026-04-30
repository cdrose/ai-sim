import { defineConfig } from 'vite';
export default defineConfig({
  base: '/ai-sim/',
  build: { outDir: 'dist' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    globals: true,
    testTimeout: 30000, // TF.js model init can be slow on first run
  }
});
