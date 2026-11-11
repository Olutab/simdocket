// scripts/lib/pages-extra.mjs — v3: nav, paginated plans directory, provider pages, routes, homepage
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const EUROPE = new Set(['AL','AD','AM','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','GE','DE','GR','HU','IS','IE','IT','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','TR','UA','GB']);
export const PLAN_SIZE = 40;

export function navHtml(up = '') {
  return `<nav class="site-nav" aria-label="Main navigation">
<a href="${up}">Home</a><a href="${up}plans/">All plans</a><a href="${up}routes/">Routes</a><a href="${up}tool/">Optimizer</a><a href="${up}faq/">FAQ</a><a href="${up}about/">About</a><a href="${up}contact/">Contact</a>
</nav>`;
}

export const ROUTES = [
  { title: 'Southeast Asia backpacker loop', legs: [['TH',30],['VN',21],['MY',14]], photo: 'airalo-thailand-3gb-30d', blurb: 'The classic 65-day trail. One regional plan versus three locals — we run the real math.' },
  { title: 'European grand tour', legs: [['DE',14],['FR',10],['IT',7]], photo: 'airalo-europe-3gb-30d', blurb: '31 days, three heavyweights. Regional coverage is strong here, but is it cheapest?' },
  { title: 'Latin America run', legs: [['MX',14],['CO',10],['BR',12]], photo: 'airalo-mexico-3gb-30d', blurb: '36 days across three time zones. No single regional plan covers all three cleanly.' },
  { title: 'Southern & East Africa', legs: [['ZA',10],['KE',8]], photo: 'airalo-south-africa-3gb-30d', blurb: 'Safari-and-city combo. Out here, coverage partners matter more than sticker price.' },
  { title: 'Middle East classics', legs: [['AE',6],['TR',10],['EG',7]], photo: 'airalo-uae-3gb-30d', blurb: '23 days of deserts, bazaars and pyramids. Three locals against one global plan.' },
  { title: 'Oceania double', legs: [['AU',14],['NZ',10]], photo: 'airalo-australia-3gb-30d', blurb: '24 days down under. One regional plan covers both — we check whether it actually wins.' },
];
export const toolLink = (legs, up = '') => `${up}tool/?i=${legs.map(([c, d]) => `${c}.${d}`).join(',')}`;

const covers = (p, c) => {
  const set = p.coverage_codes.split(' ');
  return set.includes('GLB') || set.includes(c) || (set.includes('EU-39') && EUROPE.has(c));
};

function shell(title, desc, body, canonical, up = '../') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | SIMDOCKET</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="https://simdocket.example${canonical}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${up}style.css">
</head>
<body>
<header class="site-head"><a class="logo" href="${up}">SIMDOCKET</a><span class="logo-sub">eSIM comparisons for real itineraries</span></header>
<main class="page">${body}</main>
<footer class="site-foot"><p>SIMDOCKET — <a href="${up}about/">About</a> · <a href="${up}contact/">Contact</a> · <a href="${up}privacy/">Privacy</a> · <a href="${up}editorial/">Editorial standards</a></p></footer>
</body></html>`;
}

function planCard(r, base) {
  return `<article class="plan-card">
<div class="pc-top"><span class="pill pill-prov">${cap(r.provider)}</span><span class="pill">${r.category}</span>${r.estimated ? '<span class="badge badge-est">est.</span>' : ''}</div>
<h3><a href="${base}${r.slug}/">${esc(r.entity_name)}</a></h3>
<p class="pc-meta">${r.unlimited ? 'Fair-use unlimited' : r.cap_gb + ' GB'} · ${r.days} days · ${r.countries.slice(0, 3).join(', ')}${r.countries.length > 3 ? '…' : ''}</p>
<p class="pc-price">$${r.price} <span>· $${r.daily_cost}/day${r.price_per_gb ? ' · $' + r.price_per_gb + '/GB' : ''}</span></p>
</article>`;
}

export function renderPlansIndex(rows, page, totalPages, up) {
  const provs = [...new Set(rows.map(r => r.provider))].sort();
  const slice = rows.slice((page - 1) * PLAN_SIZE, page * PLAN_SIZE);
  const cards = slice.map(r => planCard(r, page === 1 ? './' : '../../../plans/')).join('\n');
  const chips = `<button class="chip on" data-prov="">All providers</button>` + provs.map(p => `<button class="chip" data-prov="${p}">${cap(p)}</button>`).join('');
  let pagerHtml = '';
  for (let i = 1; i <= totalPages; i++) {
    const href = i === 1 ? '/plans/' : `/plans/page/${i}/`;
    pagerHtml += `<a class="page-num${i === page ? ' on' : ''}" href="${href}">${i}</a>`;
  }
  const idx = JSON.stringify(rows.map(r => ({
    slug: r.slug, name: r.entity_name, prov: r.provider, cat: r.category,
    cap: r.cap_gb, days: r.days, price: r.price, daily: r.daily_cost,
    est: r.estimated, cc: r.countries.join(' '),
  })));
  const body = `<h1>Every plan we track${totalPages > 1 ? ` <span class="count">· page ${page} of ${totalPages}</span>` : ''}</h1>
<p class="lead">${rows.length} plans across ${provs.length} providers, ${PLAN_SIZE} per page. Search and filter across the whole catalog, or page through it — every card opens a docket with the complete math.</p>
<div class="filters">
  <input id="q" type="search" placeholder="Search all ${rows.length} plans — try “thailand”, “holafly”, “unlimited”" aria-label="Search plans">
  <div class="chip-row" id="chips">${chips}</div>
  <select id="cat" aria-label="Plan type">
    <option value="">All types</option><option value="local">Local (one country)</option><option value="regional">Regional</option><option value="global">Global</option>
  </select>
</div>
<div class="plan-grid" id="grid">${cards}</div>
<p id="count">Page ${page} of ${totalPages} · ${rows.length} plans total</p>
<div class="pager" id="pager">${pagerHtml}</div>
<section><h2>Browse by provider</h2>
<ul class="prov-list">${provs.map(p => `<li><a href="${up}providers/${p}/">${cap(p)}</a> <span>(${rows.filter(r => r.provider === p).length})</span></li>`).join('')}</ul></section>
<script type="application/json" id="idx">${idx}</script>
<script>
(function(){
  var IDX=JSON.parse(document.getElementById('idx').textContent);
  var grid=document.getElementById('grid'),q=document.getElementById('q'),cat=document.getElementById('cat'),
      chips=document.getElementById('chips'),pager=document.getElementById('pager'),count=document.getElementById('count');
  var serverGrid=grid.innerHTML,serverPager=pager.innerHTML,serverCount=count.textContent,prov='',SIZE=${PLAN_SIZE};
  function cardHtml(p){return '<article class="plan-card"><div class="pc-top"><span class="pill pill-prov">'+p.prov.charAt(0).toUpperCase()+p.prov.slice(1)+'</span><span class="pill">'+p.cat+'</span>'+(p.est?' <span class="badge badge-est">est.</span>':'')+'</div><h3><a href="/plans/'+p.slug+'/">'+p.name.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</a></h3><p class="pc-meta">'+(p.cap===-1?'Fair-use unlimited':p.cap+' GB')+' · '+p.days+' days · '+p.cc+'</p><p class="pc-price">$'+p.price+' <span>· $'+p.daily+'/day</span></p></article>';}
  function active(){return q.value!==''||prov!==''||cat.value!=='';}
  function matches(p){var t=q.value.toLowerCase();return (!prov||p.prov===prov)&&(!cat.value||p.cat===cat.value)&&(!t||(p.name+' '+p.prov+' '+p.cc).toLowerCase().indexOf(t)>-1);}
  function renderClient(cp){var list=IDX.filter(matches);var pages=Math.max(1,Math.ceil(list.length/SIZE));cp=Math.min(cp,pages);
    grid.innerHTML=list.slice((cp-1)*SIZE,cp*SIZE).map(cardHtml).join('')||'<p class="empty">No plans match. Clear a filter and try again.</p>';
    var h='';for(var i=1;i<=pages;i++){h+='<button class="page-num'+(i===cp?' on':'')+'" data-p="'+i+'">'+i+'</button>';}
    pager.innerHTML=h;count.textContent=list.length+' plans match · page '+cp+' of '+pages;}
  function reset(){grid.innerHTML=serverGrid;pager.innerHTML=serverPager;count.textContent=serverCount;}
  q.addEventListener('input',function(){active()?renderClient(1):reset();});
  cat.addEventListener('change',function(){active()?renderClient(1):reset();});
  chips.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;prov=b.getAttribute('data-prov')||'';Array.prototype.forEach.call(chips.children,function(x){x.classList.toggle('on',x===b);});active()?renderClient(1):reset();});
  pager.addEventListener('click',function(e){var b=e.target.closest('button.page-num');if(b){renderClient(Number(b.getAttribute('data-p')));}});
})();
</scr` + `ipt>`;
  return shell(`All eSIM plans we track${totalPages > 1 ? ` — page ${page}` : ''}`, `Search and filter ${rows.length} eSIM plans across ${provs.length} providers by price, data, validity and coverage. Page ${page} of ${totalPages}.`, body, page === 1 ? '/plans/' : `/plans/page/${page}/`, up);
}

export function renderProviderPage(rows, manifest, pv) {
  const list = rows.filter(r => r.provider === pv).sort((a, b) => a.daily_cost - b.daily_cost);
  const body = `<p class="crumbs"><a href="../../">Home</a> → <a href="../../plans/">All plans</a> → ${cap(pv)}</p>
<h1>${cap(pv)} eSIM plans</h1>
<p class="lead">${list.length} plans filed for ${cap(pv)}, sorted by cost per day. “est.” badges mark modeled prices — <a href="../../editorial/">here is exactly what that means</a>.</p>
<div class="plan-grid">${list.map(r => planCard(r, '../../plans/')).join('\n')}</div>`;
  return shell(`${cap(pv)} eSIM plans`, `${list.length} ${cap(pv)} eSIM plans compared by price per day, data cap, validity and coverage.`, body, `/providers/${pv}/`, '../../');
}

export function renderRoutes(rows) {
  const cards = ROUTES.map(rt => {
    const total = rt.legs.reduce((s, l) => s + l[1], 0);
    const covering = rows.filter(p => p.category !== 'local' && p.validityDays >= total && rt.legs.every(l => covers(p, l[0])))
      .sort((a, b) => a.price - b.price).slice(0, 2);
    const coverTxt = covering.length
      ? `Regional options covering the whole route: ${covering.map(p => `<a href="/plans/${p.slug}/">${esc(p.entity_name)}</a> ($${p.price})`).join(', ')}.`
      : 'No single regional plan covers this route — the optimizer stacks locals for you.';
    return `<article class="route-card"><img class="rc-img" src="/images/${rt.photo}-480.webp" alt="" width="480" height="270" loading="lazy">
<h3><a href="${toolLink(rt.legs, '/')}">${esc(rt.title)}</a></h3>
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
  const routeCards = ROUTES.map(rt => `<article class="route-card"><img class="rc-img" src="/images/${rt.photo}-480.webp" alt="" width="480" height="270" loading="lazy"><h3><a href="${toolLink(rt.legs)}">${esc(rt.title)}</a></h3><p><strong>${rt.legs.map(l => `${l[0]} ${l[1]}d`).join(' → ')}</strong></p><p>${esc(rt.blurb)}</p></article>`).join('\n');
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
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="site-head"><a class="logo" href="./">SIMDOCKET</a><span class="logo-sub">eSIM comparisons for real itineraries</span></header>
<main class="page">
  ${heroImg}
  <section class="hero">
    <p class="eyebrow">Data-first eSIM comparisons</p>
    <h1>Stop overpaying for eSIMs on multi-country trips</h1>
    <p class="lead">Most "best eSIM" lists are affiliate spam. We compare ${rows.length} real plans across ${providers.size} providers by cost per usable GB, coverage overlap and install friction — ranked for the route you're actually flying.</p>
    <a href="tool/" class="btn-primary">Try the itinerary optimizer</a>
  </section>

  <div class="stats-band">
    <div><strong>${rows.length}</strong><span>plans filed</span></div>
    <div><strong>${countries.size}</strong><span>countries covered</span></div>
    <div><strong>${providers.size}</strong><span>providers compared</span></div>
    <div><strong>${ROUTES.length}</strong><span>route guides</span></div>
  </div>

  <section>
    <p class="eyebrow">How it works</p>
    <h2>Three steps, no affiliate fog</h2>
    <ol class="steps">
      <li><strong>Enter your route.</strong> Countries and days per leg — order matters, because validity clocks and coverage windows do too.</li>
      <li><strong>We run the math.</strong> Local stacks vs. regional blocks vs. global plans, scored on cost per usable GB, day-coverage and how many eSIMs you'd have to install.</li>
      <li><strong>You decide with eyes open.</strong> Every price labeled sourced or estimated. Every caveat listed. Every wrong-fit gets a warning before you pay.</li>
    </ol>
  </section>

  <section>
    <p class="eyebrow">Start here</p>
    <h2>Routes travelers actually fly</h2>
    <div class="routes">${routeCards}</div>
    <p><a href="routes/">Browse all route guides →</a> · <a href="plans/">Or search every plan we track →</a></p>
  </section>

  <section class="cta-band">
    <h2>Your route. Ranked in seconds.</h2>
    <p>Thailand → Vietnam → Malaysia, or Lagos → Nairobi → Cape Town. Enter the legs, get the cheapest honest stack.</p>
    <a href="tool/" class="btn-primary">Open the optimizer</a>
  </section>

  <section>
    <p class="eyebrow">Why people trust the numbers</p>
    <div class="trust-bar">
      <div class="trust-item"><h3>Real sources</h3><p>Sourced prices link to the provider's public pricing page with the date checked.</p></div>
      <div class="trust-item"><h3>Labeled estimates</h3><p>Unverified prices wear a visible badge and explain how they were modeled.</p></div>
      <div class="trust-item"><h3>No silent hiding</h3><p>Pages we can't stand behind are excluded from the sitemap — and we say so.</p></div>
      <div class="trust-item"><h3>Open method</h3><p>The full verification system lives on the <a href="methodology/">methodology page</a>.</p></div>
    </div>
  </section>
</main>
<footer class="site-foot">
  <p>SIMDOCKET — ${new Date().toISOString().slice(0, 10)}. <a href="about/">About</a> · <a href="contact/">Contact</a> · <a href="privacy/">Privacy</a> · <a href="terms/">Terms</a> · <a href="editorial/">Editorial standards</a> · <a href="faq/">FAQ</a></p>
</footer>
</body>
</html>`;
}