/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // MapLibre's worker is an ES module (see src/map/maplibreWorker.ts).
  worker: { format: 'es' },
  build: {
    // MapLibre GL is ~1 MB minified on its own; that's expected for a WebGL map.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
});
