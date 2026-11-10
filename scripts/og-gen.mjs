// scripts/og-gen.mjs — generates one OG card per plan page using real photos
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import sharp from 'sharp';

const DNA = { bg: '#FAF7F2', ink: '#2B2B2B', accent: '#8B5A3C', warning: '#4A6D7C' };
const OUT = './dist/og';
mkdirSync(OUT, { recursive: true });

const manifest = existsSync('./images.manifest.json') ? JSON.parse(readFileSync('./images.manifest.json', 'utf8')) : {};
const pages = JSON.parse(readFileSync('./dist/pages.json', 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fit = (s, max) => s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';

function overlay(title, datapoint, label) {
  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.25" stop-color="#141414" stop-opacity="0.15"/>
      <stop offset="1" stop-color="#141414" stop-opacity="0.92"/>
    </linearGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <rect x="60" y="56" width="340" height="62" fill="${DNA.accent}"/>
    <text x="80" y="100" font-family="Arial Black, Arial, sans-serif" font-size="34" font-weight="900" fill="${DNA.bg}">${esc(label)}</text>
    <text x="60" y="430" font-family="Arial Black, Arial, sans-serif" font-size="68" font-weight="900" fill="${DNA.bg}">${esc(fit(title, 40))}</text>
    <text x="60" y="500" font-family="Arial, sans-serif" font-size="32" fill="#F2F1EC">${esc(fit(datapoint, 58))}</text>
    <rect x="60" y="548" width="48" height="48" fill="${DNA.accent}"/>
    <text x="122" y="586" font-family="Arial Black, Arial, sans-serif" font-size="30" fill="${DNA.bg}">SIMDOCKET</text>
  </svg>`;
}

async function makeOg(slug, title, datapoint, label, photoPath) {
  const target = `${OUT}/${slug}.png`;
  if (existsSync(target)) return; // skip existing
  
  let base;
  if (photoPath && existsSync(photoPath)) {
    base = await sharp(photoPath).resize(1200, 630, { fit: 'cover' }).png().toBuffer();
  } else {
    // Fallback: branded card with no photo
    base = await sharp(Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="${DNA.ink}"/>
      <rect x="0" y="0" width="1200" height="14" fill="${DNA.accent}"/>
    </svg>`)).png().toBuffer();
  }

  const svg = Buffer.from(overlay(title, datapoint, label));
  await sharp(base).composite([{ input: svg, blend: 'over' }]).png({ quality: 90 }).toFile(target);
}

(async () => {
  const planPages = pages.filter(p => p.loc.startsWith('/plans/'));
  let done = 0, skipped = 0;
  for (const p of planPages) {
    const slug = p.loc.replace(/^\/plans\//, '').replace(/\/$/, '');
    const target = `${OUT}/${slug}.png`;
    if (existsSync(target)) { skipped++; continue; }
    
    const m = manifest[slug];
    const photoPath = m?.files?.[0] ? `./dist/images/${m.files[0]}` : null;
    const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const datapoint = m ? `${m.estimated ? 'est. ' : ''}$${m.price || '?'} · ${m.capGb === -1 ? 'fair-use' : m.capGb + 'GB'} · ${m.validityDays || '?'}d` : '';
    const label = m?.category ? m.category.toUpperCase() + ' PLAN' : 'PLAN DOCKET';
    
    await makeOg(slug, title, datapoint, label, photoPath);
    done++;
  }
  console.log(`OG cards: ${done} generated, ${skipped} already existed. Total: ${done + skipped}`);
})();