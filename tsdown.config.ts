import { defineConfig } from 'tsdown';

export default defineConfig({
  clean: true,
  deps: { neverBundle: ['typescript'] },
  dts: true,
  entry: ['src/index.ts', 'src/cli.ts'],
  exports: true,
  format: ['esm'],
  minify: true,
  publint: true,
  shims: true,
  sourcemap: true,
  target: 'node20',
});
