import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const requiredFiles = [
  'index.html',
  'admin.html',
  'style.css',
  'script.js',
  'admin.js',
  'bg.png',
  'mobile-bg.png',
  'backend/src/app.js',
  'backend/src/server.js',
  'web.config'
];

for (const file of requiredFiles) {
  const absolutePath = path.join(root, file);
  const info = await fs.stat(absolutePath);

  if (!info.isFile()) {
    throw new Error(`${file} exists but is not a file.`);
  }
}

await import('../backend/src/app.js');

console.log('Production verification passed.');
