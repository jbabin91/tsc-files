import { defineConfig } from 'tsdown';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts', 'src/cli.ts'],
  exports: true,
  external: ['typescript'],
  format: ['esm'],
  minify: true,
  publint: true,
  shims: true,
  sourcemap: true,
  target: 'node20',
});
