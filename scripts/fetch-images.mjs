// scripts/fetch-images.mjs — Protocol v2, corrected. The ONLY place that touches the network.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { hash, ladder, relevance, units, re, pickVariant } from './lib/images-core.mjs';

const UA = 'SIMDOCKET-imagebot/1.0 (https://simdocket.example)';
const WIKI_BASE = 'https://commons.wikimedia.org/w/api.php';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : Infinity;
const DIAGNOSE = args.includes('--diagnose') ? args[args.indexOf('--diagnose') + 1] : null;
const EXPLAIN = args.includes('--explain') ? args[args.indexOf('--explain') + 1] : null;
const REVIEW = args.includes('--review');
const RETRY_REJECTED = args.includes('--retry-rejected');

const config = JSON.parse(readFileSync('./images.config.json', 'utf8'));
const lines = readFileSync('./data/matrix.txt', 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(l => l.trim());
const header = lines[0].split('|');
const rows = lines.slice(1).map(l => {
  const c = l.split('|');
  return Object.fromEntries(header.map((h, i) => [h, (c[i] ?? '').trim()]));
}).filter(r => r.auditing_status !== 'UNVERIFIED-DRAFT');

const manifestPath = './images.manifest.json';
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const rejected = existsSync('./images.rejected.json') ? JSON.parse(readFileSync('./images.rejected.json', 'utf8')) : {};
const overrides = existsSync('./images.overrides.json') ? JSON.parse(readFileSync('./images.overrides.json', 'utf8')) : {};

const TITLE_REJECT = /\b(map|diagram|logo|icon|flag|coat of arms|chart|graph|screenshot|poster|stamp|banknote|cover|scheme|plan|drawing|illustration)\b/i;
const stripHtml = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const verbose = () => DIAGNOSE || EXPLAIN;

let netFails = 0;
async function wikiFetch(url) {
  let res;
  try { res = await fetch(url, { headers: { 'User-Agent': UA } }); }
  catch (e) { netFails++; throw new Error(`network/proxy failed: ${e.message}`); }
  if (res.status === 429) { console.error('Wikimedia answered 429 (rate limit). Stopping this run.'); process.exit(1); }
  if (!res.ok) { netFails++; throw new Error(`HTTP ${res.status}`); }
  return { status: res.status, json: await res.json() };
}

async function searchWiki(query) {
  const url = `${WIKI_BASE}?action=query&list=search&srnamespace=6&srlimit=20&format=json&srsearch=${encodeURIComponent(query + ' filetype:bitmap')}`;
  const { status, json } = await wikiFetch(url);
  const hits = json.query?.search || [];
  if (verbose()) console.log(`  step search "${query}" → HTTP ${status}, ${hits.length} raw results`);
  return hits;
}

async function getFileInfo(pageid) {
  const url = `${WIKI_BASE}?action=query&prop=imageinfo|categories&iiprop=url|size|mime|extmetadata&iiurlwidth=1600&cllimit=max&format=json&pageids=${pageid}`;
  const { json } = await wikiFetch(url);
  const page = json.query?.pages?.[pageid];
  const info = page?.imageinfo?.[0];
  if (!page || !info) return null;
  const meta = info.extmetadata || {};
  const lic = stripHtml(meta.LicenseShortName?.value).toLowerCase().replace(/\s+[0-9.]+$/, '').replace(/\s+/g, ' ');
  return {
    title: page.title.replace(/^File:/, ''), url: info.url, thumburl: info.thumburl || info.url,
    width: info.width, height: info.height, mime: info.mime, license: lic,
    artist: stripHtml(meta.Artist?.value) || 'Unknown', desc: stripHtml(meta.ImageDescription?.value),
    categories: (page.categories || []).map(c => c.title.replace(/^Category:/, '')),
  };
}

async function getInfoByTitle(title) {
  const url = `${WIKI_BASE}?action=query&prop=imageinfo|categories&iiprop=url|size|mime|extmetadata&iiurlwidth=1600&cllimit=max&format=json&titles=${encodeURIComponent(title.startsWith('File:') ? title : 'File:' + title)}`;
  const { json } = await wikiFetch(url);
  const page = Object.values(json.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  if (!page || !info || page.missing !== undefined) return null;
  const meta = info.extmetadata || {};
  const lic = stripHtml(meta.LicenseShortName?.value).toLowerCase().replace(/\s+[0-9.]+$/, '').replace(/\s+/g, ' ');
  return { title: page.title.replace(/^File:/, ''), url: info.url, thumburl: info.thumburl || info.url,
    width: info.width, height: info.height, mime: info.mime, license: lic,
    artist: stripHtml(meta.Artist?.value) || 'Unknown', desc: stripHtml(meta.ImageDescription?.value),
    categories: (page.categories || []).map(c => c.title.replace(/^Category:/, '')) };
}

const okLicense = (lic) => !!lic && !lic.includes('nc') && !lic.includes('nd') &&
  ['cc0', 'public domain', 'cc by', 'cc by-sa'].some(a => lic.startsWith(a));

async function tryLadder(query, headOverride, ctx, avoid, variant, slug) {
  const { head, steps } = ladder(query, headOverride);
  const tried = [];
  if (!steps.length) return { pool: [], tried };
  const u = units(query);
  for (const step of steps) {
    tried.push(step);
    await sleep(400);
    let hits;
    try { hits = await searchWiki(step); } catch (e) { console.error(`  ! ${e.message}`); continue; }
    const pass = [];
    for (const hit of hits) {
      await sleep(200);
      let info;
      try { info = await getFileInfo(hit.pageid); } catch (e) { console.error(`  ! ${e.message}`); continue; }
      if (!info) continue;
      const all = [info.title, info.desc, info.categories.join(' ')].join(' ');
      const imageId = `wikimedia:${hit.pageid}`;
      const say = (why) => { if (verbose()) console.log(`    REJECT ${info.title}: ${why}`); };
      if (TITLE_REJECT.test(info.title)) { say('title keyword (map/logo/diagram/…)'); continue; }
      if (info.width < 1000) { say('width < 1000px'); continue; }
      const ratio = info.width / info.height, minSide = Math.min(info.width, info.height);
      if (ratio < 1.2 && !(variant === 'thumb-side' && minSide >= 1000)) { say('portrait orientation'); continue; }
      if (!okLicense(info.license)) { say(`license "${info.license || 'none'}"`); continue; }
      if ((rejected[slug] || []).includes(imageId)) { say('listed in images.rejected.json'); continue; }
      const rel = relevance({ title: info.title, desc: info.desc, categories: info.categories,
        noAttribution: ['cc0', 'public domain'].includes(info.license) },
        { step, units: u, head, context: ctx, avoid, min: config.minScore });
      if (!rel.ok) { say(rel.reason); continue; }
      const matchedWords = [head, ...u.filter(w => w !== head && re(w).test(all)), ...ctx.filter(w => re(w).test(all))];
      if (verbose()) console.log(`    ACCEPT ${info.title} — score ${rel.score}, matched: ${matchedWords.join(', ')}`);
      pass.push({ ...info, imageId, relScore: rel.score, matchedWords });
    }
    if (pass.length) {
      pass.sort((a, b) => b.relScore - a.relScore);
      const top = pass[0].relScore;
      return { pool: pass.filter(c => c.relScore >= top - 2).slice(0, config.pool), tried, matchedStep: step };
    }
  }
  return { pool: [], tried };
}

async function processRow(row) {
  const slug = row.slug;
  if (manifest[slug] && !RETRY_REJECTED) return { status: 'skipped' };
  const variant = pickVariant(slug);
  const ctx = config.contexts[row.category] || [];
  const avoid = [...(row.image_avoid ? row.image_avoid.split(',').map(s => s.trim()).filter(Boolean) : []),
                 ...(config.avoidByContext[row.category] || [])];

  let pool = [], tried = [], matchedStep = '';
  if (overrides[slug]?.title) {                       // hand-picked file: license+size checks only
    const info = await getInfoByTitle(overrides[slug].title);
    if (info && okLicense(info.license) && info.width >= 1000) {
      pool = [{ ...info, imageId: `wikimedia:title:${info.title}`, relScore: 99, matchedWords: ['override'] }];
      matchedStep = 'override';
    }
  } else {
    const q = overrides[slug]?.query || row.image_query;
    let r = await tryLadder(q, row.image_head || null, ctx, avoid, variant, slug);
    pool = r.pool; tried = r.tried; matchedStep = r.matchedStep || '';
    if (!pool.length && row.image_query_alt) {
      r = await tryLadder(row.image_query_alt, null, ctx, avoid, variant, slug);
      pool = r.pool; tried = tried.concat(r.tried); matchedStep = r.matchedStep || '';
    }
  }
  if (!pool.length) return { status: 'no-photo', tried };

  const usage = {};
  for (const k in manifest) usage[manifest[k].imageId] = (usage[manifest[k].imageId] || 0) + 1;
  pool = pool.filter(c => (usage[c.imageId] || 0) < config.maxReuse);
  if (!pool.length) return { status: 'no-photo', tried, note: 'all candidates at max reuse' };

  const chosen = pool[hash(slug) % pool.length];
  if (verbose()) console.log(`  PICK ${chosen.title} (pool ${pool.length}, hash pick)`);
  if (DRY_RUN) return { status: 'dry', chosen };

  mkdirSync('./public/images', { recursive: true });
  let res;
  try { res = await fetch(chosen.thumburl, { headers: { 'User-Agent': UA } }); }
  catch (e) { netFails++; return { status: 'download-failed' }; }
  if (!res.ok) { netFails++; return { status: 'download-failed' }; }
  const buffer = Buffer.from(await res.arrayBuffer());
  for (const w of [1280, 800, 480])
    await sharp(buffer).rotate().resize(w, null, { withoutEnlargement: true }).webp({ quality: 80 }).toFile(`./public/images/${slug}-${w}.webp`);

  manifest[slug] = {
    files: [`${slug}-1280.webp`, `${slug}-800.webp`, `${slug}-480.webp`],
    width: chosen.width, height: chosen.height, alt: row.entity_name,
    artist: chosen.artist, license: chosen.license, licenseUrl: chosen.originalUrl ? '' : '',
    source: 'Wikimedia Commons', originalUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(chosen.title.replace(/ /g, '_'))}`,
    imageId: chosen.imageId, query: row.image_query, matchedStep, score: chosen.relScore,
    matchedWords: chosen.matchedWords, needsAttribution: !['cc0', 'public domain'].includes(chosen.license),
    focus: overrides[slug]?.focus || 'center', variant, fetchedAt: new Date().toISOString(),
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return { status: 'saved', chosen };
}

function writeReview() {
  const entries = Object.entries(manifest).sort((a, b) => (a[1].score || 0) - (b[1].score || 0));
  const html = `<!doctype html><meta charset="utf-8"><title>Image review</title>
<body style="font:14px sans-serif;background:#FAFAF7">
<h1>Review sheet — lowest scores first</h1>
${entries.map(([slug, m]) => `<div style="border:1px solid #141414;margin:8px;padding:8px;display:flex;gap:12px">
<img src="public/images/${slug}-480.webp" width="200" alt="">
<div><b>${slug}</b><br>${m.alt}<br>step: ${m.matchedStep} · score: ${m.score} · ${m.license}<br>matched: ${(m.matchedWords || []).join(', ')}<br><a href="${m.originalUrl}">original</a></div></div>`).join('\n')}
</body>`;
  writeFileSync('./review.html', html);
  console.log(`review.html written (${entries.length} photos, lowest scores first).`);
}

(async () => {
  if (REVIEW) { writeReview(); return; }
  if (DIAGNOSE) {
    console.log(`Diagnosing query: "${DIAGNOSE}" (context: local)`);
    await tryLadder(DIAGNOSE, null, config.contexts.local, [], 'hero-wide', 'diagnose');
    return;
  }
  let target = rows;
  if (EXPLAIN) target = rows.filter(r => r.slug === EXPLAIN);
  if (RETRY_REJECTED) target = rows.filter(r => rejected[r.slug]);
  if (LIMIT < Infinity) target = target.slice(0, LIMIT);
  if (EXPLAIN && !target.length) { console.log(`No row with slug "${EXPLAIN}".`); process.exit(1); }

  let saved = 0, skipped = 0; const missing = [];
  let i = 0;
  for (const row of target) {
    i++;
    const r = await processRow(row);
    if (r.status === 'saved') { saved++; console.log(`[${i}/${target.length}] ${row.slug} → "${r.chosen.title}" (${r.chosen.license}, score ${r.chosen.relScore})`); }
    else if (r.status === 'skipped') { skipped++; }
    else if (r.status === 'dry') console.log(`[DRY] ${row.slug} → would pick "${r.chosen.title}" (${r.chosen.license}, score ${r.chosen.relScore})`);
    else { missing.push({ slug: row.slug, tried: r.tried || [], note: r.note || r.status }); console.log(`[${i}/${target.length}] ${row.slug} → NO PHOTO (${r.note || 'nothing relevant'}${r.tried ? ', tried ' + r.tried.length + ' steps' : ''})`); }
  }

  const have = Object.keys(manifest).length;
  const total = rows.length;
  console.log(`\n--- SUMMARY ---`);
  console.log(`Coverage: ${have}/${total} (${(100 * have / total).toFixed(1)}%)`);
  console.log(`This run: saved ${saved}, skipped ${skipped}, no-photo-on-purpose ${missing.length}`);
  if (missing.length) { console.log('Pages with NO photo on purpose:'); missing.forEach(m => console.log(`  - ${m.slug}  (tried: ${m.tried.join(' | ') || 'n/a'})`)); }
  console.log(`Network failures: ${netFails}`);
  if (netFails > 0) process.exit(1);
  if (!DRY_RUN && total && have / total < parseFloat(process.env.MIN_COVERAGE || '0.6')) {
    console.log('Coverage below minimum 60% — exiting non-zero. Suggest better image_head / image_query_alt values, not a lower bar.');
    process.exit(1);
  }
})();