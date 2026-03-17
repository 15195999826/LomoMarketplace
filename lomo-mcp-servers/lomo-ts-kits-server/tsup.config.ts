import { defineConfig } from 'tsup';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const outDir = '../../plugins/lomo-kits/dist';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir,
  clean: true,
  splitting: false,
  noExternal: [/.*/],
  banner: {
    js: '#!/usr/bin/env node',
  },
  onSuccess: async () => {
    writeFileSync(resolve(outDir, 'package.json'), '{ "type": "module" }\n');
  },
});
