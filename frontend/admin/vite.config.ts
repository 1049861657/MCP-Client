import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/** Admin SPA 根目录（`frontend/admin/`） */
const adminRoot = dirname(fileURLToPath(import.meta.url));
/** 仓库根目录 */
const repoRoot = resolve(adminRoot, '../..');

export default defineConfig({
  plugins: [tailwindcss()],
  root: adminRoot,
  base: '/admin/',
  // 构建产物单独落到 public/admin/；勿把仓库 public/ 整包 copy 进 outDir
  publicDir: false,
  build: {
    outDir: resolve(repoRoot, 'public/admin'),
    emptyOutDir: true,
  },
});
