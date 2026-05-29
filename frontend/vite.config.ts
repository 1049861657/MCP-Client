import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const configDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(configDir, '..');
const frontendRoot = configDir;

/**
 * 单体 Vite MPA：HTML 平铺在 frontend/ 根目录，实现落在 src/{page}/。
 * legacyNavbar：遗留页（ai/settings/info）统一挂载 shared navbar（固定 JS 路径）。
 */
export default defineConfig({
  plugins: [tailwindcss()],
  root: frontendRoot,
  base: '/',
  publicDir: false,
  build: {
    outDir: resolve(repoRoot, 'public'),
    emptyOutDir: false,
    assetsDir: 'assets',
    rolldownOptions: {
      input: {
        main: resolve(frontendRoot, 'index.html'),
        admin: resolve(frontendRoot, 'admin.html'),
        settings: resolve(frontendRoot, 'settings.html'),
        info: resolve(frontendRoot, 'info.html'),
        legacyNavbar: resolve(frontendRoot, 'src/shared/legacy-navbar.entry.js'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'legacyNavbar') {
            return 'assets/legacy-navbar.js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
