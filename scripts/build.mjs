// Builds the published site into _site/ (run by .github/workflows/static.yml).
//
// index.html stays editable as-is (it compiles its JSX in the browser with Babel). For the
// published page this script:
//   - precompiles the <script type="text/babel"> block into app.<hash>.js with esbuild
//   - drops the dev-only Babel <script data-dev-only> tag
//   - adds a Content-Security-Policy <meta> whose script-src only allows 'self' plus the
//     sha256 of each remaining inline script (so no 'unsafe-inline' / 'unsafe-eval')
//   - copies only the files the site needs (no .git, .DS_Store, README, workflow, ...)

import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { transform } from 'esbuild';

const OUT = '_site';
const sha = (algo, text, enc) => createHash(algo).update(text).digest(enc);

let html = readFileSync('index.html', 'utf8');

// 1. Precompile the JSX block.
const babelBlock = /<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/;
const match = html.match(babelBlock);
if (!match) throw new Error('No <script type="text/babel"> block found in index.html');
const { code } = await transform(match[1], {
  loader: 'jsx',
  jsx: 'transform', // classic runtime: React.createElement, React is a global (UMD)
  minify: true,
  target: 'es2019',
});
const appFile = `app.${sha('sha256', code, 'hex').slice(0, 10)}.js`;
// defer keeps the original order: the app runs after parsing, like the Babel version did.
html = html.replace(babelBlock, () => `<script defer src="${appFile}"></script>`);

// 2. Remove dev-only scripts (Babel standalone).
const before = html;
html = html.replace(/<script\b[^>]*\bdata-dev-only\b[^>]*>\s*<\/script>\s*/g, '');
if (html === before) throw new Error('Dev-only Babel <script data-dev-only> tag not found');

// 3. Content-Security-Policy with hashes of the inline scripts that remain
//    (anti-clickjacking guard, import map, Three.js module).
const inlineHashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(([, body]) => `'sha256-${sha('sha256', body, 'base64')}'`);
const csp = [
  "default-src 'self'",
  `script-src 'self' ${inlineHashes.join(' ')}`,
  "style-src 'self' 'unsafe-inline'", // React inline style={{}} and the page's <style> blocks
  "img-src 'self' data:",
  "font-src 'self'",
  "media-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  'upgrade-insecure-requests',
].join('; ');
const charset = '<meta charset="utf-8" />';
if (!html.includes(charset)) throw new Error('<meta charset> not found');
html = html.replace(charset, `${charset}\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);

// Guard: nothing third-party or in-browser-compiled may reach production.
for (const bad of ['text/babel', 'unpkg.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', '.development.js']) {
  if (html.includes(bad)) throw new Error(`Built page still references ${bad}`);
}

// 4. Write the site.
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
writeFileSync(`${OUT}/index.html`, html);
writeFileSync(`${OUT}/${appFile}`, code);
for (const file of ['config.js', 'CNAME']) cpSync(file, `${OUT}/${file}`);
cpSync('assets', `${OUT}/assets`, { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });

console.log(`Built ${OUT}/ (${appFile}, ${inlineHashes.length} inline script hashes in CSP)`);
