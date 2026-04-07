import { defineConfig } from 'vite';
export default defineConfig({
  test: { environment: 'jsdom', globals: true, setupFiles: ['./app/src/test/setup.ts'] }
});
