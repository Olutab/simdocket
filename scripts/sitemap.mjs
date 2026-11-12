// scripts/sitemap.mjs — splits sitemap into chunks, indexable URLs only
import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

const SITE_URL = process.env.SITE_URL || 'https://simdocket.netlify.app';
const CHUNK = 1000;
const PAGES = './dist/pages.json';

if (!existsSync(PAGES)) { console.error('dist/pages.json missing — run build.mjs first.'); process.exit(1); }
const pages = JSON.parse(readFileSync(PAGES, 'utf8'));

function urlset(pg) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pg.map(p => `  <url><loc>${SITE_URL}${p.loc}</loc><lastmod>${p.lastmod}</lastmod></url>`).join('\n')}
</urlset>`;
}

const chunks = [];
for (let i = 0; i < pages.length; i += CHUNK) chunks.push(pages.slice(i, i + CHUNK));

chunks.forEach((chunk, n) => writeFileSync(`./dist/sitemap-${n + 1}.xml`, urlset(chunk)));

const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${chunks.map((_, n) => `  <sitemap><loc>${SITE_URL}/sitemap-${n + 1}.xml</loc></sitemap>`).join('\n')}
</sitemapindex>`;
writeFileSync('./dist/sitemap.xml', index);

console.log(`Sitemap: ${pages.length} indexable URLs in ${chunks.length} file(s).`);
console.log(`  → ${SITE_URL}/sitemap.xml`);