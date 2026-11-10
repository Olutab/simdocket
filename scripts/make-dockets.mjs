// scripts/make-dockets.mjs — draws one SVG docket card per plan
import { writeFileSync, mkdirSync } from 'node:fs';
import { loadMatrix } from './lib/matrix.mjs';

mkdirSync('./public/images', { recursive: true });
const rows = loadMatrix();
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const CAT = { local: '#B93D1A', regional: '#1F5FA8', global: '#141414' };

for (const r of rows) {
  const cap = r.unlimited ? 'UNLIMITED*' : r.cap_gb + ' GB';
  const capNote = r.unlimited ? ' *fair-use' : '';
  const initials = r.provider.slice(0, 2).toUpperCase();
  const rawName = r.entity_name.length > 34 ? r.entity_name.slice(0, 33) + '…' : r.entity_name;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#F2F1EC"/>
  <rect x="4" y="4" width="1192" height="622" fill="none" stroke="#141414" stroke-width="8"/>
  <polygon points="1200,0 1200,90 1110,0" fill="#FAFAF7"/>
  <rect x="60" y="60" width="150" height="150" fill="${CAT[r.category]}"/>
  <text x="135" y="158" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${initials}</text>
  <text x="60" y="300" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#141414">${esc(rawName)}</text>
  <text x="60" y="430" font-family="Arial, sans-serif" font-size="110" font-weight="bold" fill="${CAT[r.category]}">${cap}</text>
  <text x="60" y="500" font-family="Arial, sans-serif" font-size="36" fill="#141414">${r.days} days · ${esc(r.coverage_codes)}</text>
  <text x="60" y="560" font-family="Arial, sans-serif" font-size="36" fill="#555555">$${r.price}${r.estimated ? ' (estimate)' : ''}${capNote} · ${r.caveat_tier}</text>
  <path d="M700 560 L760 500 L820 540 L880 470 L940 520 L1000 460 L1060 510 L1120 450" fill="none" stroke="#141414" stroke-width="6" stroke-dasharray="14 10"/>
</svg>`;
  writeFileSync(`./public/images/${r.slug}.svg`, svg);
}
console.log(`Wrote ${rows.length} docket SVGs to public/images/`);