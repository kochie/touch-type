// esbuild.config.js
import { build } from 'esbuild';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

build({
  entryPoints: [join(__dirname, 'electron-src/index.ts'), join(__dirname, "electron-src/preload.ts")], // Adjust this path if your main file is located somewhere else
  bundle: true,
  platform: 'node',
  external: [
    'next',
    'electron', // Don't bundle Electron, it's provided by Electron itself
    'electron-updater', // Don't bundle `electron-updater` as it dynamically loads native modules
    // 'electron-serve',
    '@sentry/electron',
    'app-root-path',
    'node:path',
  ],
  format: 'cjs',
  loader: {
    '.txt': 'file', // Load .txt files as text
  },
  outdir: 'main', // Output file for the bundled main process
  tsconfig: 'electron-src/tsconfig.json', // Path to the tsconfig.json file
})