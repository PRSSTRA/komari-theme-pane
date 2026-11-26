#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkDist = process.argv.includes('--dist');

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const failures = [];
const assert = (cond, msg) => {
  if (!cond) failures.push(msg);
};

// 1. Upstream Solid Glass stylesheet must stay untouched.
const EXPECTED_SOLID_GLASS_SHA256 = 'c3c9e4e739f2b3f991d2412c07970f53df4a54f9d416ec3e8e1c0d5261e84bc3';
const solidGlassHash = crypto.createHash('sha256').update(read('src/solid-glass.css')).digest('hex');
assert(
  solidGlassHash === EXPECTED_SOLID_GLASS_SHA256,
  `src/solid-glass.css was modified (sha256 ${solidGlassHash}); keep upstream unmodified and put overrides in src/pane.css (or update EXPECTED_SOLID_GLASS_SHA256 when upgrading upstream).`
);

// 2. Solid Glass preset & dark-mode blur cascade guard.
const themeCss = read('src/solid-glass-theme.css');
assert(
  themeCss.includes('preset=03011202011'),
  'src/solid-glass-theme.css should reference the calibrated Solid Glass preset 03011202011.'
);
const darkThemeBlock = themeCss.match(/\.dark\s*\{([\s\S]*?)\}/)?.[1] ?? '';
assert(
  /--glass-blur:\s*blur\([^;)]+\)\s*;/.test(darkThemeBlock) && !darkThemeBlock.includes('saturate('),
  'src/solid-glass-theme.css .dark must explicitly set --glass-blur without saturate() so :root does not leak saturate(180%) into dark mode.'
);

// 3. src/pane.css surface, hue, radius, highlight, and header contracts.
const paneCss = read('src/pane.css');
const lightBlock = paneCss.match(/:root:not\(\.dark\)\s*\{([\s\S]*?)\}/)?.[1] ?? '';
for (const token of ['--light-1', '--light-2', '--light-3']) {
  assert(
    new RegExp(`${token}:\\s*transparent\\s*;`).test(lightBlock),
    `src/pane.css :root:not(.dark) must set ${token}: transparent to prevent uneven ambient color tints across panels.`
  );
}

assert(
  !/oklch\([^)]*\b265\b/.test(paneCss),
  'src/pane.css contains legacy hue 265 OKLCH values; calibrate light neutral tokens to Zinc hue 286.'
);

const ALLOWED_HEX_TOKENS = /--sg-(?:success|warn|danger|series-cpu|tick-fg)\s*:/;
paneCss.split('\n').forEach((line, idx) => {
  if (/:[^;{}]*#[0-9a-fA-F]{3,8}\b/.test(line) && !ALLOWED_HEX_TOKENS.test(line)) {
    failures.push(`src/pane.css:${idx + 1} uses hardcoded hex surface color; derive surfaces from OKLCH Zinc tokens instead.`);
  }
});

assert(
  /\[data-slot="tabs-list"\]\[data-variant="default"\]\s*\{[^}]*--radius:\s*var\(--radius-control\)\s*;/.test(paneCss),
  'src/pane.css must set --radius: var(--radius-control) on [data-slot="tabs-list"][data-variant="default"] so tab trays match control radii.'
);
assert(
  /\.sg-spec-body,\s*\.sg-table-body\s*\{[^}]*background-color:\s*var\(--sg-well-surface\)\s*;[^}]*border-radius:\s*max\(0px,\s*calc\(var\(--radius\)\s*-\s*6px\)\)\s*;/.test(paneCss),
  'src/pane.css must keep .sg-spec-body and .sg-table-body unified on --sg-well-surface and concentric calc(var(--radius) - 6px).'
);
assert(
  /\.sg-view-options-trigger[^\n{]*\[aria-expanded="true"\][^{]*\{[^}]*background-clip:\s*padding-box\s*;/.test(paneCss),
  'src/pane.css must keep background-clip: padding-box on expanded .sg-view-options-trigger to prevent 2px double-bar top highlights.'
);
const detailHeaderBlock = paneCss.match(/\.sg-detail-header\s*\{([\s\S]*?)\}/)?.[1] ?? '';
assert(
  detailHeaderBlock && !/min-height\s*:/.test(detailHeaderBlock),
  'src/pane.css .sg-detail-header must not set min-height (avoids asymmetric vertical header padding inside .sg-spec-shell).'
);

// 4. Canvas vignette, concentric radius, and component shell contracts.
const dashboardHtml = read('src/dashboard.html');
const dashboardJs = read('src/dashboard.js');

for (const [file, content] of [['src/dashboard.html', dashboardHtml], ['src/dashboard.js', dashboardJs]]) {
  const arbitraryRadii = [...content.matchAll(/rounded-\[([^\]]+)\]/g)]
    .map((m) => m[1])
    .filter((v) => v !== '1.5px');
  assert(
    arbitraryRadii.length === 0,
    `${file} contains magic pixel border-radius classes (${arbitraryRadii.join(', ')}); use Solid Glass radius tokens or concentric CSS rules.`
  );
}

const vignetteCalls = [...dashboardJs.matchAll(/fillEasedVignette\(([^)]+)\)/g)]
  .map((m) => m[1])
  .filter((args) => !args.startsWith('ctx, x0,'));
for (const args of vignetteCalls) {
  const parts = args.split(',').map((s) => s.trim());
  assert(
    parts[5] === 'mask',
    `src/dashboard.js fillEasedVignette(${args}) must use transparent destination-out mask instead of painting solid RGB (${parts[5]}).`
  );
}

assert(
  !/sg-spec-shell[^"']*glass-panel/.test(dashboardJs),
  'src/dashboard.js .sg-spec-shell cards must use bg-card (not glass-panel) so they match the server table shell.'
);

// 5. Komari integration boundaries (index.html + dashboard.html).
const indexHtml = read('index.html');
assert(indexHtml.includes('<title>Komari Monitor</title>'), 'index.html must keep <title>Komari Monitor</title>.');
assert(indexHtml.includes('A simple server monitor tool.'), 'index.html must keep the Komari meta description.');
assert(/<body>/.test(indexHtml), 'index.html must keep a bare <body> tag for Komari injection.');
assert(dashboardHtml.includes('Powered by Komari Monitor.'), 'src/dashboard.html must keep the Powered by Komari Monitor. footer.');
for (const cls of ['km-layout', 'km-navbar', 'km-main', 'km-footer', 'km-node-display']) {
  assert(dashboardHtml.includes(cls), `src/dashboard.html must preserve semantic class ${cls}.`);
}

// 6. Manifest, package.json, and package-lock.json consistency.
const manifest = JSON.parse(read('komari-theme.json'));
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
assert(
  /^[a-z\d_-]+$/i.test(manifest.short) && /^\d+\.\d+\.\d+$/.test(manifest.version),
  'komari-theme.json must have a valid short name and semver version.'
);
assert(
  manifest.version === pkg.version,
  `Version mismatch: komari-theme.json (${manifest.version}) !== package.json (${pkg.version}).`
);
assert(
  lock.version === pkg.version && lock.packages?.['']?.version === pkg.version,
  `Version mismatch: package-lock.json (${lock.version}) !== package.json (${pkg.version}).`
);
if (manifest.preview !== undefined) {
  assert(
    manifest.preview === 'preview.png' && fs.existsSync(path.join(root, 'preview.png')),
    'komari-theme.json preview must point to root preview.png.'
  );
}
if (checkDist) {
  assert(fs.existsSync(path.join(root, 'dist/index.html')), 'Missing dist/index.html; run npm run build first.');
}

if (failures.length > 0) {
  console.error(`Design contract check failed (${failures.length} issue${failures.length > 1 ? 's' : ''}):`);
  for (const msg of failures) console.error(`  - ${msg}`);
  process.exit(1);
}

console.log(`Design contract check passed (${checkDist ? 'source + dist' : 'source'}).`);
