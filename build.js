#!/usr/bin/env node
// Palette Studio build script
//
// Concatenates the split source files in src/ back into ONE deployable
// index.html in dist/ — the file you actually deploy to GitHub Pages and
// install to your home screen never changes shape; only how you *edit* it
// does. Deliberately zero-dependency (no esbuild, no bundler package) so
// this runs with nothing but Node itself: `node build.js`.
//
// Usage: node build.js

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');

function fail(msg) {
  console.error('\n✗ Build failed: ' + msg + '\n');
  process.exit(1);
}

function readFileOrFail(p, label) {
  if (!fs.existsSync(p)) fail('Missing ' + label + ' at ' + p);
  return fs.readFileSync(p, 'utf8');
}

// ── 1. Load the module order manifest ──────────────────────────────
// JS modules must concatenate in this exact order — the original file was
// one continuous script, so later modules can reference functions/vars
// defined earlier (and a few, like the harmony functions noted in
// harmony-generator.js, are referenced out of their "home" file — same as
// before the split, since this is a straight concatenation, not real
// ES modules with imports).
const orderFile = path.join(SRC, 'js', '_MODULE_ORDER.txt');
const moduleOrder = readFileOrFail(orderFile, 'module order manifest')
  .split('\n')
  .map(s => s.trim())
  .filter(Boolean);

// ── 2. Concatenate JS modules in order ──────────────────────────────
let jsParts = [];
for (const fname of moduleOrder) {
  const p = path.join(SRC, 'js', fname);
  jsParts.push(readFileOrFail(p, 'JS module "' + fname + '"'));
}
const js = jsParts.join('\n');

// ── 3. Load CSS ──────────────────────────────────────────────────
const css = readFileOrFail(path.join(SRC, 'styles.css'), 'styles.css');

// ── 4. Load the HTML shell template and inject ──────────────────────
const template = readFileOrFail(path.join(SRC, 'index.template.html'), 'index.template.html');
if (!template.includes('{{CSS}}')) fail('index.template.html is missing the {{CSS}} placeholder');
if (!template.includes('{{JS}}')) fail('index.template.html is missing the {{JS}} placeholder');

const output = template
  .replace('{{CSS}}', () => css)
  .replace('{{JS}}', () => js);

// ── 5. Basic sanity checks before writing anything ──────────────────
// These mirror the manual checks that caught real bugs across many past
// sessions — running them here means a broken build fails loudly instead
// of quietly shipping.
const openDivs = (output.match(/<div\b/g) || []).length;
const closeDivs = (output.match(/<\/div>/g) || []).length;
if (openDivs !== closeDivs) {
  fail(`Unbalanced <div> tags in output: ${openDivs} opened, ${closeDivs} closed.`);
}
const styleOpen = (output.match(/<style>/g) || []).length;
const styleClose = (output.match(/<\/style>/g) || []).length;
if (styleOpen !== styleClose) {
  fail(`Unbalanced <style> tags: ${styleOpen} opened, ${styleClose} closed.`);
}

// ── 6. Write dist/ ──────────────────────────────────────────────────
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), output, 'utf8');

const staticDir = path.join(SRC, 'static');
if (fs.existsSync(staticDir)) {
  for (const f of fs.readdirSync(staticDir)) {
    fs.copyFileSync(path.join(staticDir, f), path.join(DIST, f));
  }
}

console.log('✓ Built dist/index.html (' + Math.round(output.length / 1024) + ' KB) from ' + moduleOrder.length + ' JS modules + styles.css');
console.log('✓ Copied static assets: ' + (fs.existsSync(staticDir) ? fs.readdirSync(staticDir).join(', ') : '(none found)'));
