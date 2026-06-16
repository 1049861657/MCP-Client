import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config.js';

const configDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(configDir, '..');

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      visualizer({
        filename: resolve(repoRoot, 'docs/stats.html'),
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    ],
  }),
);
