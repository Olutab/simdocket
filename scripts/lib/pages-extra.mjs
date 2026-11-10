// scripts/lib/pages-extra.mjs — nav, all-plans index, routes hub, lively homepage
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const EUROPE = new Set(['AL','AD','AM','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','GE','DE','GR','HU','IS','IE','IT','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','TR','UA','GB']);

export function navHtml(up = '') {
  return `<nav class="site-nav" aria-label="Main navigation">
<a href="${up}">Home</a><a href="${up}plans/">All plans</a><a href="${up}routes/">Routes</a><a href="${up}tool/">Optimizer</a><a href="${up}faq/">FAQ</a><a href="${up}about/">About</a><a href="${up}contact/">Contact</a>
</nav>`;
}

export const ROUTES = [
  { title: 'Southeast Asia backpacker loop', legs: [['TH',30],['VN',21],['MY',14]], blurb: 'The classic 65-day trail. One regional plan versus three locals — we run the real math.' },
  { title: 'European grand tour', legs: [['DE',14],['FR',10],['IT',7]], blurb: '31 days, three heavyweights. Regional coverage is strong here, but is it cheapest?' },
  { title: 'Latin America run', legs: [['MX',14],['CO',10],['BR',12]], blurb: '36 days across three time zones. No single regional plan covers all three cleanly.' },
  { title: 'Southern & East Africa', legs: [['ZA',10],['KE',8]], blurb: 'Safari-and-city combo. Out here, coverage partners matter more than sticker price.' },
  { title: 'Middle East classics', legs: [['AE',6],['TR',10],['EG',7]], blurb: '23 days of deserts, bazaars and pyramids. Three locals against one global plan.' },
  { title: 'Oceania double', legs: [['AU',14],['NZ',10]], blurb: '24 days down under. One regional plan covers both — we check whether it actually wins.' },
];
export const toolLink = (legs, up = '') => `${up}tool/?i=${legs.map(([c, d]) => `${c}.${d}`).join(',')}`;

const covers = (p, c) => {
  const set = p.coverage_codes.split(' ');
  return set.includes('GLB') || set.includes(c) || (set.includes('EU-39') && EUROPE.has(c));
};

function shell(title, desc, body, canonical) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | SIMDOCKET</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="https://simdocket.example${canonical}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css">
</head>
<body>
<header class="site-head"><a class="logo" href="../">SIMDOCKET</a><span class="logo-sub">eSIM comparisons for real itineraries</span></header>
<main class="page">${body}</main>
<footer class="site-foot"><p>SIMDOCKET — <a href="../about/">About</a> · <a href="../contact/">Contact</a> · <a href="../privacy/">Privacy</a> · <a href="../editorial/">Editorial standards</a></p></footer>
</body></html>`;
}

export function renderPlansIndex(rows) {
  const byProv = {};
  for (const r of rows) (byProv[r.provider] ??= []).push(r);
  const sections = Object.keys(byProv).sort().map(pv => `
<section>
  <h2>${cap(pv)} <span class="count">(${byProv[pv].length} plans)</span></h2>
  <ul class="plan-list">
    ${byProv[pv].map(r => `<li><a href="./${r.slug}/">${esc(r.entity_name)}</a> — $${r.price}${r.estimated ? ' <span class="badge badge-est">est.</span>' : ''} · ${r.unlimited ? 'fair use' : r.cap_gb + ' GB'} · ${r.days}d · ${r.countries.slice(0, 4).join(', ')}${r.countries.length > 4 ? '…' : ''}</li>`).join('\n    ')}
  </ul>
</section>`).join('\n');
  return shell('All eSIM plans we track', `Every plan in the SIMDOCKET database, grouped by provider. ${rows.length} plans compared on price, data, validity and coverage.`,
    `<h1>Every plan we track</h1><p class="lead">${rows.length} plans across ${Object.keys(byProv).length} providers, grouped so you can browse a network's whole catalog at once. Blue "est." badges mark modeled prices; <a href="../editorial/">here is exactly what that means</a>.</p>${sections}`,
    '/plans/');
}

export function renderRoutes(rows) {
  const cards = ROUTES.map(rt => {
    const total = rt.legs.reduce((s, l) => s + l[1], 0);
    const covering = rows.filter(p => p.category !== 'local' && p.validityDays >= total && rt.legs.every(l => covers(p, l[0])))
      .sort((a, b) => a.price - b.price).slice(0, 2);
    const coverTxt = covering.length
      ? `Regional options that cover the whole route: ${covering.map(p => `<a href="/plans/${p.slug}/">${esc(p.entity_name)}</a> ($${p.price})`).join(', ')}.`
      : 'No single regional plan covers this route — the optimizer stacks locals for you.';
    return `<article class="route-card"><h3><a href="${toolLink(rt.legs, '/')}">${esc(rt.title)}</a></h3>
<p><strong>${rt.legs.map(l => `${l[0]} ${l[1]}d`).join(' → ')}</strong> · ${total} days total</p>
<p>${esc(rt.blurb)}</p><p>${coverTxt}</p></article>`;
  }).join('\n');
  return shell('Route guides', 'Multi-country eSIM routes with the plans that actually cover them, across Asia, Europe, the Americas, Africa, the Middle East and Oceania.',
    `<h1>Route guides</h1><p class="lead">Real itineraries with real coverage math. Click a route to open the optimizer pre-loaded, or read which plans cover it before you go.</p><div class="routes">${cards}</div>`,
    '/routes/');
}

export function renderHomeV2(rows, manifest) {
  const countries = new Set(rows.flatMap(r => r.countries));
  const providers = new Set(rows.map(r => r.provider));
  const hero = manifest['airalo-asia-3gb-30d'];
  const heroImg = hero ? `<figure class="home-hero-img"><img src="/images/${hero.files[0]}" width="${hero.width}" height="${hero.height}" alt="Airport departures board listing international flights" fetchpriority="high"></figure>` : '';
  const routeCards = ROUTES.map(rt => `<article class="route-card"><h3><a href="${toolLink(rt.legs)}">${esc(rt.title)}</a></h3><p><strong>${rt.legs.map(l => `${l[0]} ${l[1]}d`).join(' → ')}</strong></p><p>${esc(rt.blurb)}</p></article>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SIMDOCKET — eSIM comparisons for real multi-country itineraries</title>
<meta name="description" content="SIMDOCKET compares ${rows.length} eSIM plans across ${providers.size} providers by real cost per GB, coverage overlap and network quality — ranked for the route you're actually flying.">
<link rel="canonical" href="https://simdocket.example/">
<meta property="og:title" content="SIMDOCKET — eSIM comparisons for real itineraries">
<meta property="og:description" content="Compare eSIM plans by real cost per GB and coverage overlap, ranked for your exact multi-country route.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="site-head"><a class="logo" href="./">SIMDOCKET</a><span class="logo-sub">eSIM comparisons for real itineraries</span></header>
<main class="page">
  ${heroImg}
  <section class="hero">
    <h1>Stop overpaying for eSIMs on multi-country trips</h1>
    <p class="lead">Most "best eSIM" lists are affiliate spam. We compare ${rows.length} real plans across ${providers.size} providers by cost per usable GB, coverage overlap and install friction — ranked for the route you're actually flying.</p>
    <a href="tool/" class="btn-primary">Try the itinerary optimizer</a>
  </section>

  <div class="stats">
    <div><strong>${rows.length}</strong><span>plans filed</span></div>
    <div><strong>${countries.size}</strong><span>countries covered</span></div>
    <div><strong>${providers.size}</strong><span>providers compared</span></div>
    <div><strong>${ROUTES.length}</strong><span>route guides</span></div>
  </div>

  <section>
    <h2>How SIMDOCKET works</h2>
    <ol class="steps">
      <li><strong>Enter your route.</strong> Countries and days per leg — order matters, because validity clocks and coverage windows do too.</li>
      <li><strong>We run the math.</strong> Local stacks vs. regional blocks vs. global plans, scored on cost per usable GB, day-coverage and how many eSIMs you'd have to install.</li>
      <li><strong>You decide with eyes open.</strong> Every price is labeled sourced or estimated. Every caveat is listed. Every wrong-fit gets a warning before you pay.</li>
    </ol>
  </section>

  <section>
    <h2>Routes travelers actually fly</h2>
    <div class="routes">${routeCards}</div>
    <p><a href="routes/">Browse all route guides →</a> · <a href="plans/">Or browse every plan we track →</a></p>
  </section>

  <section>
    <h2>Why people trust the numbers</h2>
    <div class="trust-bar">
      <div class="trust-item"><h3>Real sources</h3><p>Sourced prices link to the provider's public pricing page with the date checked.</p></div>
      <div class="trust-item"><h3>Labeled estimates</h3><p>Unverified prices wear a visible badge and explain how they were modeled.</p></div>
      <div class="trust-item"><h3>No silent hiding</h3><p>Pages we can't stand behind are excluded from the sitemap — and we say so.</p></div>
      <div class="trust-item"><h3>Open method</h3><p>The full verification system lives on the <a href="methodology/">methodology page</a>.</p></div>
    </div>
  </section>
</main>
<footer class="site-foot">
  <p>SIMDOCKET — built with care, ${new Date().toISOString().slice(0, 10)}. <a href="about/">About</a> · <a href="contact/">Contact</a> · <a href="privacy/">Privacy</a> · <a href="terms/">Terms</a> · <a href="editorial/">Editorial standards</a> · <a href="faq/">FAQ</a></p>
</footer>
</body>
</html>`;
}