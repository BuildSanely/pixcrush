import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'src/cli/index.ts' },
  format: ['esm'],
  target: 'es2022',
  clean: true,
  dts: true,
  sourcemap: true,
  minify: true,
});
