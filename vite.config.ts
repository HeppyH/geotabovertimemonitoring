import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

const REPO_PATH = '/geotabovertimemonitoring/';
const PRODUCTION_ORIGIN = 'https://heppyh.github.io';

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        copyFileSync(
          resolve(__dirname, 'public/manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );
      },
    },
  ],
  base: command === 'build' ? `${PRODUCTION_ORIGIN}${REPO_PATH}` : REPO_PATH,
}));
