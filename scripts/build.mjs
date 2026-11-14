// scripts/build.mjs — v5: full pipeline, paginated plans directory, provider pages
import { mkdirSync, writeFileSync, rmSync, cpSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadMatrix, attachNeighbors } from './lib/matrix.mjs';
import { directAnswer, scenario, antiPitch, faq, h2 } from './lib/prose.mjs';
import { placePhoto, licenseUrlFor } from './photo-html.mjs';
import { navHtml, renderPlansIndex, renderRoutes, renderHomeV2, renderProviderPage, PLAN_SIZE } from './lib/pages-extra.mjs';
import { renderAbout, renderContact, renderPrivacy, renderTerms, renderEditorial, renderFAQ } from './lib/trust-pages.mjs';

const SITE_URL = process.env.SITE_URL || 'https://simdocket.netlify.app';const TODAY = new Date().toISOString().slice(0, 10);
const DIST = './dist';
const manifest = existsSync('./images.manifest.json') ? JSON.parse(readFileSync('./images.manifest.json', 'utf8')) : {};
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`;

console.log('Loading data…');
const rows = loadMatrix();
attachNeighbors(rows);

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
if (existsSync('./public')) cpSync('./public', DIST, { recursive: true });
if (existsSync('./tool/build')) cpSync('./tool/build', join(DIST, 'tool'), { recursive: true });

const pages = [];
const skipped = [];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const injectNav = (html, up) => html.replace('</header>', navHtml(up) + '\n</header>');
const fit = (s, max) => (s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…');

const templateFor = r =>
  r.category === 'global' ? 'global-backup'
  : r.unlimited ? 'unlimited-work'
  : r.category === 'regional' ? 'regional-heavy'
  : 'local-standard';

const SECTIONS = {
  'local-standard':  ['spec', 'answer', 'scenario', 'neighbors', 'antipitch', 'faq'],
  'regional-heavy':  ['answer', 'coverage', 'neighbors', 'scenario', 'antipitch', 'faq'],
  'global-backup':   ['answer', 'antipitch', 'spec', 'neighbors', 'faq'],
  'unlimited-work':  ['answer', 'fairuse', 'spec', 'scenario', 'neighbors', 'faq'],
};

function section(role, r, up) {
  const H = t => `<h2>${t}</h2>`;
  switch (role) {
    case 'answer': return `<section class="answer">${H(h2('answer', r.slug))}<p class="lead">${directAnswer(r)}</p></section>`;
    case 'spec': return `<section>${H(h2('spec', r.slug))}${specTable(r)}</section>`;
    case 'coverage': return `<section>${H(h2('coverage', r.slug))}<ul class="chips">${r.countries.map(c => `<li>${c}</li>`).join('')}</ul></section>`;
    case 'fairuse': return `<section>${H(h2('fairuse', r.slug))}<p>${scenarioFair(r)}</p></section>`;
    case 'scenario': return `<section>${H(h2('scenario', r.slug))}<p>${scenario(r)}</p></section>`;
    case 'neighbors': return `<section>${H(h2('neighbors', r.slug))}${neighborsTable(r, up)}</section>`;
    case 'antipitch': return `<section class="antipitch">${H(h2('antipitch', r.slug))}<p>${antiPitch(r)}</p></section>`;
    case 'faq': return `<section>${H(h2('faq', r.slug))}${faq(r).map(f => `<details class="faq-item"><summary>${f.q}</summary><p>${f.a}</p></details>`).join('')}</section>`;
  }
}

function scenarioFair(r) {
  return `This plan is sold as unlimited but carries a fair-use policy${r.fup_threshold_gb ? ` modeled at roughly ${r.fup_threshold_gb} GB/day of full speed` : ' whose exact threshold is not published'}. The optimizer credits it accordingly instead of treating it as infinite. If your trip depends on sustained heavy data, verify current terms with the provider.`;
}

function specTable(r) {
  const rowsHtml = [
    ['Provider', r.provider.charAt(0).toUpperCase() + r.provider.slice(1)], ['Type', r.category], ['Coverage', r.countries.join(', ')],
    ['Data', r.unlimited ? `Unlimited (fair use${r.fup_threshold_gb ? `, ~${r.fup_threshold_gb} GB/day` : ''})` : `${r.cap_gb} GB`],
    ['Validity', `${r.days} days`],
    ['Price', `$${r.price}${r.estimated ? ' <span class="badge badge-est">estimate</span>' : ''}`],
    ['Cost per day', `$${r.daily_cost}`],
    ['Cost per GB', r.price_per_gb === null ? 'n/a (fair use)' : `$${r.price_per_gb}`],
    ['Network', r.network_tech], ['Hotspot', r.hotspot_policy],
        ...(r.carrier ? [['Local carrier', esc(r.carrier)]] : []),
    ...(r.activation ? [['Validity starts', esc(r.activation)]] : []),
    ...(r.ekyc ? [['Registration (eKYC)', esc(r.ekyc)]] : []),
    ...(r.topup ? [['Top-ups', esc(r.topup)]] : []),
    ...(r.phone_included ? [['Phone number', esc(r.phone_included)]] : []),
    ['Caveat tier', `<span class="badge badge-${r.caveat_tier.toLowerCase()}">${r.caveat_tier}</span>`],
  ].map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('');
  return `<table class="spec-table"><tbody>${rowsHtml}</tbody></table>`;
}

function verdictFor(r, o) {
  const dPrice = Number((o.price - r.price).toFixed(2));
  const priceTxt = dPrice > 0 ? `$${dPrice} more` : dPrice < 0 ? `$${Math.abs(dPrice)} less` : 'the same price';
  if (o.unlimited && !r.unlimited) return `Stop counting gigabytes: fair-use unlimited for ${priceTxt}.`;
  if (!o.unlimited && r.unlimited) return `A predictable cap instead of fair-use, for ${priceTxt}.`;
  const dGb = o.cap_gb - r.cap_gb;
  if (dGb > 0 && o.price_per_gb !== null && r.price_per_gb !== null && o.price_per_gb <= r.price_per_gb)
    return `${dGb} GB more for ${priceTxt} — and a better rate ($${o.price_per_gb}/GB vs $${r.price_per_gb}/GB).`;
  if (dGb > 0) return `${dGb} GB more headroom for ${priceTxt} — you're buying comfort, not value.`;
  if (dGb < 0 && dPrice < 0) return `${Math.abs(dGb)} GB less for ${priceTxt} — the right call on Wi-Fi-heavy trips.`;
  return `Comparable shape at ${priceTxt}; decide on coverage notes or provider trust.`;
}

function neighborsTable(r, up) {
  if (!r.neighbors.length) return '<p>No comparable plans in the dataset yet.</p>';
  const body = r.neighbors.map(o =>
    `<tr><td><a href="${up}plans/${o.slug}/">${o.entity_name}</a></td><td>${o.unlimited ? 'fair use' : o.cap_gb + ' GB'}</td><td>$${o.price}</td><td>$${o.daily_cost}/day</td><td>${verdictFor(r, o)}</td></tr>`).join('');
  return `<table class="spec-table"><thead><tr><th>Plan</th><th>Data</th><th>Price</th><th>Per day</th><th>Why switch?</th></tr></thead><tbody>${body}</tbody></table>`;
}

function schemaFor(r, title, desc) {
  const faqs = faq(r);
  return [
    { '@context': 'https://schema.org', '@type': 'TechArticle', headline: fit(title, 110), description: desc,
      datePublished: TODAY, dateModified: r.last_checked || TODAY, author: { '@type': 'Organization', name: 'SIMDOCKET' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: 'Plans', item: SITE_URL + '/plans/' },
        { '@type': 'ListItem', position: 3, name: r.entity_name } ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f =>
        ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];
}

function head(r, title, desc, up, ogImage) {
  const schema = schemaFor(r, title, desc).map(s => `<script type="application/ld+json">${JSON.stringify(s)}</scr` + `ipt>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fit(title, 60)}</title>
<meta name="google-site-verification" content="Esl2MXvFiQBS6xZwCQSEQwKdE_mYnsAHNilOoBW1mxo" />
<meta name="description" content="${fit(desc, 158)}">
<link rel="canonical" href="${SITE_URL}/plans/${r.slug}/">
<meta property="og:title" content="${fit(title, 60)}">
<meta property="og:description" content="${fit(desc, 158)}">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
${FONTS}
<link rel="stylesheet" href="${up}style.css">
${schema}
</head>
<body>`;
}

function renderPlanPage(r) {
  const up = '../../';
  const photo = placePhoto(manifest, r.slug, { alt: r.entity_name });
  if (photo.variant === 'none') console.warn(`photo-html: no image for "${r.slug}"`);
  const m = manifest[r.slug];
  const ogImage = m ? `${SITE_URL}/images/${m.files[0]}` : null;
  const title = `${r.entity_name}: ${r.days} Days of eSIM Data | SIMDOCKET`;
  const desc = directAnswer(r);
  const estBanner = r.estimated
    ? `<div class="est-banner"><strong>Note:</strong> This price is an estimate from public catalog bands. <a href="${up}methodology/">How we estimate</a>.</div>` : '';
      const secs = SECTIONS[templateFor(r)].map(role => section(role, r, up));
  const body = [secs[0], photo.afterIntro, secs[1], secs[2], photo.mid, ...secs.slice(3)].join('\n');
  return `${head(r, title, desc, up, ogImage)}
<header class="site-head">
  <a class="logo" href="${up}">SIMDOCKET</a>
  <span class="logo-sub">eSIM comparisons for real itineraries</span>
</header>
<main class="page">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${up}">Home</a> → <a href="${up}plans/">Plans</a> → <span>${r.entity_name}</span></nav>
  <header class="page-head">
    <h1>${r.entity_name}</h1>
    ${photo.titleSide}
  </header>
  ${photo.hero}
  ${estBanner}
  <article>
  ${body}
  </article>
</main>
<footer class="site-foot">
  <p>SIMDOCKET — <a href="${up}methodology/">Method</a> · <a href="${up}about/">About</a> · <a href="${up}contact/">Contact</a></p>
  ${photo.credit}
</footer>
</body>
</html>`;
}

function renderMethodology() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Method and limits — SIMDOCKET</title>
<meta name="description" content="How SIMDOCKET prices are estimated and verified, how network scores are modeled, and what this site cannot tell you.">
<link rel="canonical" href="${SITE_URL}/methodology/">
${FONTS}
<link rel="stylesheet" href="../style.css">
</head>
<body>
<header class="site-head"><a class="logo" href="../">SIMDOCKET</a><span class="logo-sub">eSIM comparisons for real itineraries</span></header>
<main class="page">
  <h1>Method and limits</h1>
  <p class="lead">Every price carries one of three labels. Here is what they mean and how we verify.</p>
  <h2>The three-tier audit</h2>
  <p><strong>SOURCED / HUMAN-CHECKED</strong>: a real provider or documentation link, with the date checked. <strong>ESTIMATED</strong>: modeled from public catalog pricing bands, labeled everywhere it appears. <strong>UNVERIFIED-DRAFT</strong>: not published at all. Nothing is hidden silently.</p>
  <h2>How estimates are derived</h2>
  <p>Provider × tier baseline bands observed in public catalogs. Figures are rounded on purpose and replaced by listed prices as rows get verified.</p>
  <h2>Network score</h2>
  <p>Modeled from plan-level data — 5G availability, provider density, caveat tiers. A plan-market signal, not measured speed.</p>
  <h2>Photos</h2>
  <p>Wikimedia Commons under CC0 / public domain / CC BY / CC BY-SA, matched by relevance check. No relevant match means no photo. Credits on the <a href="../credits/">credits page</a>.</p>
  <h2>What this site cannot tell you</h2>
  <p>Live stock, promo codes, current outages, guaranteed throughput. Treat rankings as value shapes to verify at checkout.</p>
</main>
<footer class="site-foot"><p>SIMDOCKET — updated ${TODAY}.</p></footer>
</body>
</html>`;
}

function renderCredits() {
  const entries = Object.entries(manifest).sort((a, b) => a[0].localeCompare(b[0]));
  const items = entries.map(([slug, m]) =>
    `<div class="credit-row" id="${slug}"><a href="/plans/${slug}/">${esc(m.alt)}</a> — photo by ${esc(m.artist)} · <a href="${m.licenseUrl || licenseUrlFor(m.license)}">${esc(m.license)}</a> · <a href="${m.originalUrl}">original file</a></div>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Photo credits — SIMDOCKET</title>
<meta name="description" content="Every photograph on SIMDOCKET with its photographer, licence and original file on Wikimedia Commons.">
<link rel="canonical" href="${SITE_URL}/credits/">
${FONTS}
<link rel="stylesheet" href="../style.css">
</head>
<body>
<header class="site-head"><a class="logo" href="../">SIMDOCKET</a><span class="logo-sub">eSIM comparisons for real itineraries</span></header>
<main class="page">
  <h1>Photo credits</h1>
  <p class="lead">${entries.length} photographs from Wikimedia Commons under free licences. Thank you to every contributor.</p>
  ${items || '<p>No photos yet.</p>'}
</main>
<footer class="site-foot"><p>SIMDOCKET — credits updated ${TODAY}.</p></footer>
</body>
</html>`;
}

console.log('Generating pages…');
for (const r of rows) {
  if (r.auditing_status === 'UNVERIFIED-DRAFT') { skipped.push(r.slug); continue; }
  const dir = join(DIST, 'plans', r.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), injectNav(renderPlanPage(r), '../../'));
  pages.push({ loc: `/plans/${r.slug}/`, lastmod: r.last_checked || TODAY });
}

const planPages = Math.ceil(rows.length / PLAN_SIZE);
for (let pg = 1; pg <= planPages; pg++) {
  const dir = pg === 1 ? join(DIST, 'plans') : join(DIST, 'plans', 'page', String(pg));
  mkdirSync(dir, { recursive: true });
  const up = pg === 1 ? '../' : '../../../';
  writeFileSync(join(dir, 'index.html'), injectNav(renderPlansIndex(rows, pg, planPages, up), up));
  pages.push({ loc: pg === 1 ? '/plans/' : `/plans/page/${pg}/`, lastmod: TODAY });
}

for (const pv of [...new Set(rows.map(r => r.provider))].sort()) {
  mkdirSync(join(DIST, 'providers', pv), { recursive: true });
  writeFileSync(join(DIST, 'providers', pv, 'index.html'), injectNav(renderProviderPage(rows, manifest, pv), '../../'));
  pages.push({ loc: `/providers/${pv}/`, lastmod: TODAY });
}

const trustPages = [
  { path: 'about', render: renderAbout }, { path: 'contact', render: renderContact },
  { path: 'privacy', render: renderPrivacy }, { path: 'terms', render: renderTerms },
  { path: 'editorial', render: renderEditorial }, { path: 'faq', render: renderFAQ },
  { path: 'methodology', render: renderMethodology }, { path: 'credits', render: renderCredits },
];
for (const { path, render } of trustPages) {
  mkdirSync(join(DIST, path), { recursive: true });
  writeFileSync(join(DIST, path, 'index.html'), injectNav(render(), '../'));
  pages.push({ loc: `/${path}/`, lastmod: TODAY });
}

mkdirSync(join(DIST, 'routes'), { recursive: true });
writeFileSync(join(DIST, 'routes', 'index.html'), injectNav(renderRoutes(rows), '../'));
pages.push({ loc: '/routes/', lastmod: TODAY });

writeFileSync(join(DIST, 'index.html'), injectNav(renderHomeV2(rows, manifest), ''));
pages.push({ loc: '/', lastmod: TODAY });
pages.push({ loc: '/tool/', lastmod: TODAY });

writeFileSync(join(DIST, 'pages.json'), JSON.stringify(pages, null, 2));

const estShare = Math.round(100 * rows.filter(r => r.estimated).length / rows.length);
console.log(`Built ${pages.length} indexable pages.`);
console.log(`Estimate share: ${estShare}% (track this down before Wave 2).`);
if (skipped.length) console.log(`NOT published (UNVERIFIED-DRAFT): ${skipped.length} → ${skipped.join(', ')}`);
else console.log('No pages held back. Nothing noindexed silently.');