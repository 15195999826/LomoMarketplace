import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: '../../plugins/lomo-kits/dist',
  clean: true,
  splitting: false,
  noExternal: [/.*/],  // inline ALL dependencies
  banner: {
    js: '#!/usr/bin/env node',
  },
});
