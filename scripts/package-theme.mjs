import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'komari-theme.json'), 'utf8'));
if (!/^[a-z\d_-]+$/i.test(manifest.short) || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
  throw new Error('Expected a theme short name and release version in komari-theme.json');
}
if (!statSync(join(root, 'dist/index.html')).isFile()) throw new Error('Missing dist/index.html');
const entries = ['komari-theme.json', 'dist'];
if (manifest.preview !== undefined) {
  if (manifest.preview !== 'preview.png' || !statSync(join(root, 'preview.png')).isFile()) {
    throw new Error('Manifest preview must point to the root preview.png');
  }
  entries.push('preview.png');
}

const release = join(root, 'release');
mkdirSync(release, { recursive: true });
const temp = mkdtempSync(join(release, '.package-'));
const name = `komari-theme-${manifest.short.toLowerCase()}-${manifest.version}.zip`;
try {
  const archive = join(temp, name);
  execFileSync('zip', ['-q', '-r', archive, ...entries, '-x', '*/.*', '__MACOSX/*', '*/__MACOSX/*'], {
    cwd: root,
    stdio: 'inherit',
  });
  renameSync(archive, join(release, name));
  console.log(`release/${name}`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
