// scripts/verify-images.mjs — protocol §9/§10 post-build gate
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = './dist';
const manifest = existsSync('./images.manifest.json') ? JSON.parse(readFileSync('./images.manifest.json', 'utf8')) : {};
const artists = Object.values(manifest).map(m => m.artist).filter(a => a && a !== 'Unknown');

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) files.push(p);
  }
})(DIST);

const fails = [], warns = [];
const variantCounts = {};
const pagesWithPhoto = new Set();
let imgTags = 0, captions = 0;

const relOf = (f) => f.slice(DIST.length).replace(/index\.html$/, '').replace(/\\/g, '/');

for (const f of files) {
  const html = readFileSync(f, 'utf8');
  const rel = relOf(f);

  for (const m of html.matchAll(/(?:src|srcset|content)="([^"]+)"/g)) {
    for (let v of m[1].split(',')) {
      v = v.trim().split(/\s+/)[0];
      if (!v.startsWith('/images/') && !v.startsWith('/og/')) continue;
      const p = join(DIST, v.split('?')[0]);
      if (!existsSync(p) || statSync(p).size === 0) fails.push(`${rel}: referenced file missing/empty → ${v}`);
    }
  }
  for (const m of html.matchAll(/<img[^>]*>/g)) {
    imgTags++;
    const tag = m[0];
    const src = (tag.match(/src="([^"]+)"/) || [])[1] || '';
    if (src && !src.startsWith('/') && !src.startsWith('http')) fails.push(`${rel}: relative image path → ${src}`);
    if (!/alt="/.test(tag)) warns.push(`${rel}: img missing alt`);
    if (!/width="/.test(tag) || !/height="/.test(tag)) warns.push(`${rel}: img missing width/height`);
  }
  for (const c of html.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)) {
    const txt = c[1];
    if (/wikimedia|commons|cc by/i.test(txt) || artists.some(a => txt.includes(a))) {
      captions++; fails.push(`${rel}: caption carries credit text`);
    }
  }
  const v = html.match(/data-photo-variant="([^"]+)"/);
  if (v) { variantCounts[v[1]] = (variantCounts[v[1]] || 0) + 1; pagesWithPhoto.add(rel); }
}

const noPhoto = files.map(relOf).filter(rel => rel.startsWith('/plans/') && !pagesWithPhoto.has(rel));

const withPhoto = pagesWithPhoto.size;
if (withPhoto >= 12) {
  const kinds = Object.keys(variantCounts).length;
  const maxShare = Math.max(...Object.values(variantCounts)) / withPhoto;
  if (kinds < 4) fails.push(`layout variety: only ${kinds} variants present`);
  if (maxShare > 0.45) fails.push(`layout variety: one variant on ${(maxShare * 100).toFixed(0)}% of photo pages`);
}

console.log(`verify-images: ${files.length} pages, ${imgTags} <img> tags checked.`);
console.log('Layout variants: ' + (Object.entries(variantCounts).map(([k, v]) => `${k} ${v}`).join(', ') || 'none') +
  (withPhoto >= 12 ? '   (OK)' : '   (too few photo pages to gate)'));
console.log(`Pages with a photo: ${withPhoto} / ${files.length} (${(100 * withPhoto / files.length).toFixed(0)}%).  Pages without a photo (on purpose): ${noPhoto.length}`);
noPhoto.slice(0, 20).forEach(p => console.log(`  - ${p}`));
console.log(`Captions found: ${captions}`);
if (warns.length) { console.log('Warnings:'); warns.slice(0, 20).forEach(w => console.log('  ! ' + w)); }
if (fails.length) { console.log('FAIL:'); fails.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
console.log('All image references resolve.');