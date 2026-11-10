// scripts/validate-redirects.mjs — fails the build on redirect mistakes
import { readFileSync, existsSync } from 'node:fs';

const REDIRECTS = './data/redirects.txt';
const PAGES = './dist/pages.json';

if (!existsSync(REDIRECTS)) { console.log('No redirects file.'); process.exit(0); }
if (!existsSync(PAGES)) { console.error('dist/pages.json missing.'); process.exit(1); }

const lines = readFileSync(REDIRECTS, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
const liveSlugs = new Set(JSON.parse(readFileSync(PAGES, 'utf8')).map(p => p.loc));
const seen = new Set();
const errors = [];

for (const l of lines) {
  const parts = l.split(/\s+/);
  if (parts.length !== 2) { errors.push(`bad line: "${l}"`); continue; }
  const [from, to] = parts.map(s => s.startsWith('/') ? s : '/' + s + '/');
  if (from === to) errors.push(`self-loop: ${from}`);
  if (liveSlugs.has(from)) errors.push(`shadows a live page: ${from}`);
  if (!liveSlugs.has(to)) errors.push(`target missing or noindex: ${to}`);
  if (seen.has(from)) errors.push(`duplicate source: ${from}`);
  seen.add(from);
}

for (const l of lines) {
  const [from, to] = l.split(/\s+/).map(s => s.startsWith('/') ? s : '/' + s + '/');
  if (seen.has(to)) errors.push(`chain: ${from} → ${to} → …`);
}

if (errors.length) {
  console.log(`REDIRECTS FAIL — ${errors.length} problem(s):`);
  errors.forEach(e => console.log('  ✗ ' + e));
  process.exit(1);
}
console.log(`Redirects: ${seen.size} validated, no chains, no shadowing.`);