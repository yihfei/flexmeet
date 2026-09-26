import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // Inline the workspace package (it ships TS source); keep npm deps external.
  noExternal: ['@flexmeet/shared'],
});
