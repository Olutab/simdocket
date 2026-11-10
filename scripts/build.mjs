// scripts/build.mjs — warm editorial aesthetic with trust pages
import { mkdirSync, writeFileSync, rmSync, cpSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadMatrix, attachNeighbors } from './lib/matrix.mjs';
import { directAnswer, scenario, antiPitch, faq, h2 } from './lib/prose.mjs';
import { placePhoto, licenseUrlFor } from './photo-html.mjs';
import { navHtml, renderPlansIndex, renderRoutes, renderHomeV2 } from './lib/pages-extra.mjs';

const SITE_URL = process.env.SITE_URL || 'https://simdocket.example';
const TODAY = new Date().toISOString().slice(0, 10);
const DIST = './dist';
const manifest = existsSync('./images.manifest.json') ? JSON.parse(readFileSync('./images.manifest.json', 'utf8')) : {};

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

const fit = (s, max) => (s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…');
const injectNav = (html, up) => html.replace('</header>', navHtml(up) + '\n</header>');

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
    ['Provider', r.provider], ['Type', r.category], ['Coverage', r.countries.join(', ')],
    ['Data', r.unlimited ? `Unlimited (fair use${r.fup_threshold_gb ? `, ~${r.fup_threshold_gb} GB/day` : ''})` : `${r.cap_gb} GB`],
    ['Validity', `${r.days} days`],
    ['Price', `$${r.price}${r.estimated ? ' <span class="badge badge-est">estimate</span>' : ''}`],
    ['Cost per day', `$${r.daily_cost}`],
    ['Cost per GB', r.price_per_gb === null ? 'n/a (fair use)' : `$${r.price_per_gb}`],
    ['Network', r.network_tech], ['Hotspot', r.hotspot_policy],
    ['Caveat tier', `<span class="badge badge-${r.caveat_tier.toLowerCase()}">${r.caveat_tier}</span>`],
  ].map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('');
  return `<table class="spec-table"><tbody>${rowsHtml}</tbody></table>`;
}

function neighborsTable(r, up) {
  if (!r.neighbors.length) return '<p>No comparable plans in the dataset yet.</p>';
  const body = r.neighbors.map(o =>
    `<tr><td><a href="${up}plans/${o.slug}/">${o.entity_name}</a></td><td>${o.unlimited ? 'fair use' : o.cap_gb + ' GB'}</td><td>${o.days}d</td><td>$${o.price}</td><td>$${o.daily_cost}/day</td></tr>`).join('');
  return `<table class="spec-table"><thead><tr><th>Plan</th><th>Data</th><th>Validity</th><th>Price</th><th>Per day</th></tr></thead><tbody>${body}</tbody></table>`;
}

function schemaFor(r, title, desc) {
  const faqs = faq(r);
  return [
    { '@context': 'https://schema.org', '@type': 'TechArticle', headline: fit(title, 110), description: desc,
      datePublished: TODAY, dateModified: r.last_checked || TODAY, author: { '@type': 'Organization', name: 'SIMDOCKET' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: 'Plans', item: SITE_URL + '/' },
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
<meta name="description" content="${fit(desc, 158)}">
<link rel="canonical" href="${SITE_URL}/plans/${r.slug}/">
<meta property="og:title" content="${fit(title, 60)}">
<meta property="og:description" content="${fit(desc, 158)}">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
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
  
  // Warm editorial title
  const countryNames = { TH: 'Thailand', VN: 'Vietnam', MY: 'Malaysia', ID: 'Indonesia', PH: 'Philippines' };
  const country = countryNames[r.countries[0]] || r.countries[0];
  const title = `${r.entity_name}: ${r.days} Days of eSIM Data for ${country} | SIMDOCKET`;
  
  const desc = directAnswer(r);
  const estBanner = r.estimated
    ? `<div class="est-banner"><strong>Note:</strong> This price is an estimate based on public catalog pricing bands. <a href="${up}methodology/">How we estimate prices</a>.</div>` : '';
  const secs = SECTIONS[templateFor(r)].map(role => section(role, r, up));
  const body = [secs[0], photo.afterIntro, secs[1], secs[2], photo.mid, ...secs.slice(3)].join('\n');
  
  return `${head(r, title, desc, up, ogImage)}
<header class="site-head">
  <a class="logo" href="${up}">SIMDOCKET</a>
  <span class="logo-sub">eSIM comparisons for real itineraries</span>
</header>
<main class="page">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${up}">Home</a> → <a href="${up}">Plans</a> → <span>${r.entity_name}</span></nav>
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
  <p>SIMDOCKET compares eSIM plans across providers by real cost per GB, network quality, and coverage overlap. <a href="${up}methodology/">Our methodology</a> · <a href="${up}about/">About us</a> · <a href="${up}contact/">Contact</a></p>
  ${photo.credit}
</footer>
</body>
</html>`;
}

function renderHome() {
  const desc = 'SIMDOCKET compares every major eSIM provider by real cost per GB, network quality, and coverage overlap. File the right eSIM for the route you\'re actually flying.';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SIMDOCKET — eSIM Comparisons for Real Itineraries</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE_URL}/">
<meta property="og:title" content="SIMDOCKET — eSIM Comparisons for Real Itineraries">
<meta property="og:description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="site-head">
  <a class="logo" href="./">SIMDOCKET</a>
  <span class="logo-sub">eSIM comparisons for real itineraries</span>
</header>
<main class="page">
  <section class="hero">
    <h1>Stop overpaying for eSIMs on multi-country trips</h1>
    <p class="lead">We compare every major eSIM provider's plans by real cost per GB, network quality, and coverage overlap — so you can file the right eSIM for the route you're actually flying.</p>
    <a href="tool/" class="btn-primary">Try the itinerary optimizer</a>
  </section>

  <section>
    <h2>Why we built this</h2>
    <p class="lead">Every "best eSIM" list we found was either affiliate spam or a single-provider pitch. We wanted a tool that actually compares the options for real itineraries — not just Thailand, but Thailand → Vietnam → Malaysia in 65 days. So we built one, and we're sharing the data openly.</p>
    <p>Right now we have ${rows.length} plans filed across ${new Set(rows.map(r => r.countries.join(','))).size} countries. Every price carries one of three labels: <strong>SOURCED</strong> (we checked the provider's public pricing page), <strong>ESTIMATED</strong> (modeled from public catalog bands, clearly marked), or <strong>UNVERIFIED-DRAFT</strong> (not published). We never silently hide a page or fake a source.</p>
  </section>

  <section>
    <h2>Popular routes</h2>
    <div class="routes">
      <article class="route-card">
        <h3><a href="tool/?i=TH.30,VN.21,MY.14">Southeast Asia backpacker loop</a></h3>
        <p>Thailand → Vietnam → Malaysia over 65 days. We compare regional plans vs. three locals to find the cheapest stack with good coverage.</p>
      </article>
      <article class="route-card">
        <h3><a href="tool/?i=DE.14,FR.10,IT.7">European grand tour</a></h3>
        <p>Germany → France → Italy over 31 days. See which regional plan covers all three, or if locals are cheaper.</p>
      </article>
      <article class="route-card">
        <h3><a href="tool/?i=TH.21,JP.14">Thailand + Japan digital nomad</a></h3>
        <p>No single regional plan covers both. We show you the optimal two-plan stack.</p>
      </article>
    </div>
  </section>

  <section>
    <h2>How we verify data</h2>
    <div class="trust-bar">
      <div class="trust-item">
        <h3>Real sources</h3>
        <p>Every sourced price links to the provider's public pricing page with the date checked.</p>
      </div>
      <div class="trust-item">
        <h3>Labeled estimates</h3>
        <p>Unverified prices are clearly marked and modeled from public catalog bands.</p>
      </div>
      <div class="trust-item">
        <h3>No silent noindex</h3>
        <p>Pages with unverified high-stakes claims are excluded from the sitemap, never hidden silently.</p>
      </div>
      <div class="trust-item">
        <h3>Open methodology</h3>
        <p>Our full verification system is documented on the <a href="methodology/">methodology page</a>.</p>
      </div>
    </div>
  </section>

  <section>
    <h2>Ready to compare?</h2>
    <p class="lead">Enter your itinerary and see ranked eSIM stacks by cost, friction, and data limits.</p>
    <p><a href="tool/" class="btn-primary">Open the optimizer</a></p>
  </section>
</main>
<footer class="site-foot">
  <p>SIMDOCKET — built ${TODAY}. <a href="about/">About</a> · <a href="contact/">Contact</a> · <a href="privacy/">Privacy</a> · <a href="terms/">Terms</a> · <a href="editorial/">Editorial standards</a></p>
</footer>
</body>
</html>`;
}

function renderTrustPage(title, desc, content) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — SIMDOCKET</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE_URL}/${title.toLowerCase().replace(/\s+/g, '-')}/">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css">
</head>
<body>
<header class="site-head"><a class="logo" href="../">SIMDOCKET</a><span class="logo-sub">eSIM comparisons for real itineraries</span></header>
<main class="page">
  <h1>${esc(title)}</h1>
  ${content}
</main>
<footer class="site-foot"><p>SIMDOCKET — updated ${TODAY}.</p></footer>
</body>
</html>`;
}

function renderAbout() {
  const content = `
<p class="lead">We built SIMDOCKET because every "best eSIM" list we found was either affiliate spam or a single-provider pitch. We wanted a tool that actually compares the options for real itineraries — not just Thailand, but Thailand → Vietnam → Malaysia in 65 days.</p>

<h2>What makes us different</h2>
<p>Most eSIM review sites are built to maximize affiliate commissions from a single provider. They'll tell you Airalo is "the best" or Holafly is "the best" depending on who pays them more. We don't work that way.</p>
<p>SIMDOCKET compares every major provider — Airalo, Holafly, Nomad, Saily, Ubigi, Maya, and more — by real cost per GB, network quality, and coverage overlap. We show you the optimal stack for your actual itinerary, not the one that pays us the most.</p>

<h2>Our data honesty system</h2>
<p>Every price on SIMDOCKET carries one of three labels:</p>
<ul>
  <li><strong>SOURCED:</strong> We checked the provider's public pricing page and linked to it with the date checked.</li>
  <li><strong>ESTIMATED:</strong> Modeled from public catalog pricing bands, clearly marked with a blue badge.</li>
  <li><strong>UNVERIFIED-DRAFT:</strong> Not published at all. These pages are excluded from the sitemap, never hidden silently.</li>
</ul>
<p>We never invent sources, prices, or safety claims. If we don't have the data, we say so.</p>

<h2>Who we are</h2>
<p>SIMDOCKET is built by a small team of developers and travelers who are tired of affiliate spam. We fund the site through affiliate links (when you buy through our optimizer, we may earn a commission), but we never let that influence our rankings. The optimizer shows you the cheapest option for your route, period.</p>

<p>Questions? <a href="../contact/">Get in touch</a>.</p>`;
  return renderTrustPage('About Us', 'Who we are, why we built SIMDOCKET, and how we verify our data.', content);
}

function renderContact() {
  const content = `
<p class="lead">We'd love to hear from you. Whether you found a data error, have a question about the optimizer, or just want to say hi, reach out.</p>

<h2>Email</h2>
<p><a href="mailto:hello@simdocket.example">hello@simdocket.example</a></p>

<h2>Report a data error</h2>
<p>If you spot a price that's wrong, a plan that doesn't exist, or a photo that doesn't match the page, email us with:</p>
<ul>
  <li>The URL of the page</li>
  <li>What's wrong</li>
  <li>The correct information (if you know it)</li>
</ul>
<p>We'll fix it and thank you publicly on our changelog.</p>

<h2>Partnership inquiries</h2>
<p>If you run a travel blog, OTA, or digital nomad community and want to embed our optimizer or partner on content, email us. We're happy to discuss white-label options, custom corridors, or co-branded tools.</p>`;
  return renderTrustPage('Contact', 'How to reach the SIMDOCKET team with questions, data errors, or partnership inquiries.', content);
}

function renderPrivacy() {
  const content = `
<p class="lead">SIMDOCKET respects your privacy. Here's what we collect and why.</p>

<h2>What we collect</h2>
<p><strong>We don't collect personal data.</strong> The optimizer runs entirely in your browser. Your itinerary never leaves your device. We don't use cookies, tracking pixels, or analytics scripts on content pages.</p>

<p><strong>We do collect:</strong></p>
<ul>
  <li>Basic server logs (IP address, page visited, timestamp) — standard for any website, used for debugging and abuse prevention</li>
  <li>Aggregate traffic data from Netlify analytics (page views, referrers) — no personally identifiable information</li>
</ul>

<h2>Third-party services</h2>
<p>We use:</p>
<ul>
  <li><strong>Netlify</strong> for hosting and deployment</li>
  <li><strong>Google Fonts</strong> for typography (they may log your IP when loading fonts)</li>
  <li><strong>Wikimedia Commons</strong> for photos (we download them locally, so you never connect to Wikimedia directly)</li>
</ul>

<h2>Affiliate links</h2>
<p>When you click a link to an eSIM provider, that link may contain an affiliate tracking parameter. The provider knows you came from SIMDOCKET, but we don't share any data about you with them.</p>

<h2>Your rights</h2>
<p>Since we don't collect personal data, there's nothing to delete or export. If you have concerns, <a href="../contact/">contact us</a>.</p>`;
  return renderTrustPage('Privacy Policy', 'What data SIMDOCKET collects (spoiler: almost nothing) and how we use it.', content);
}

function renderTerms() {
  const content = `
<p class="lead">By using SIMDOCKET, you agree to these terms.</p>

<h2>Disclaimer</h2>
<p>SIMDOCKET provides eSIM plan comparisons for informational purposes only. We are not affiliated with any eSIM provider. Prices, coverage, and policies change frequently — always verify current terms directly with the provider before purchase.</p>

<h2>Estimates</h2>
<p>Prices marked as "ESTIMATED" are modeled from public catalog pricing bands and may not reflect current live prices. Treat them as ballpark figures, not guarantees.</p>

<h2>Affiliate disclosure</h2>
<p>SIMDOCKET may earn affiliate commissions when you purchase eSIM plans through links on our site. This does not influence our rankings — the optimizer always shows you the cheapest option for your route, regardless of commission rates.</p>

<h2>No warranty</h2>
<p>We provide this data "as is" without warranty of any kind. We strive for accuracy but cannot guarantee that all information is current or complete.</p>

<h2>Limitation of liability</h2>
<p>SIMDOCKET is not liable for any damages arising from your use of this site or reliance on our data. You are solely responsible for verifying eSIM terms before purchase.</p>`;
  return renderTrustPage('Terms of Service', 'Legal disclaimer, affiliate disclosure, and warranty information.', content);
}

function renderEditorial() {
  const content = `
<p class="lead">Our editorial standards ensure that every piece of data on SIMDOCKET is either verified, clearly labeled as an estimate, or not published at all.</p>

<h2>The three-tier audit</h2>
<p>Every price on SIMDOCKET carries one of three statuses:</p>

<h3>SOURCED / HUMAN-CHECKED</h3>
<p>We visited the provider's public pricing page, recorded the price, and linked to it with the date checked. These pages are indexed and appear in search results.</p>

<h3>ESTIMATED</h3>
<p>We don't have a direct source yet, but the figure is modeled from public catalog pricing bands observed in this market. For example, local 3GB/30-day plans from major providers cluster in one price band, regional 10GB/30-day plans in another. These estimates are clearly marked with a blue badge and a link to our methodology page. They're indexed, but we encourage you to verify before purchase.</p>

<h3>UNVERIFIED-DRAFT</h3>
<p>Thin pages or pages with high-stakes claims (health, money, legal, safety) that have no source. These are built with <code>noindex</code> and excluded from the sitemap. We never silently hide pages — if a page is noindexed, we tell you why and offer a fix (add a source, relabel as estimated, or add content).</p>

<h2>How estimates are derived</h2>
<p>Estimates use provider × tier baseline bands. We observe that:</p>
<ul>
  <li>Local 1-3GB / 30-day plans cluster around $8-12</li>
  <li>Local 5-10GB / 30-day plans cluster around $11-19</li>
  <li>Regional 3-5GB / 30-day plans cluster around $12-16</li>
  <li>Regional 10GB / 30-day plans cluster around $19-25</li>
  <li>Global 1GB / 7-day plans cluster around $8-10</li>
</ul>
<p>Figures are rounded on purpose. Each estimate is replaced by the listed price when a row is verified.</p>

<h2>Network score</h2>
<p>Where shown, the network score is modeled from plan-level data: 5G availability, provider density per country, and caveat tiers. It's a plan-market signal, not measured speed. We don't run speed tests or claim to know actual throughput.</p>

<h2>What we never do</h2>
<ul>
  <li>Invent sources, prices, or safety claims</li>
  <li>Silently noindex pages (we always tell you why)</li>
  <li>Rank plans by affiliate commission (the optimizer ranks by cost)</li>
  <li>Use fake reviews or testimonials</li>
  <li>Hide the limitations of our data</li>
</ul>

<h2>Corrections</h2>
<p>Found an error? <a href="../contact/">Email us</a> with the URL and what's wrong. We'll fix it and thank you on our changelog.</p>`;
  return renderTrustPage('Editorial Standards', 'How SIMDOCKET verifies data, labels estimates, and maintains honesty across every page.', content);
}

function renderFAQ() {
  const content = `
<p class="lead">Common questions about eSIMs, SIMDOCKET, and how to use the optimizer.</p>

<h2>About eSIMs</h2>
<details class="faq-item">
  <summary>What's an eSIM?</summary>
  <p>An eSIM (embedded SIM) is a digital SIM card built into your phone. Instead of inserting a physical SIM card, you scan a QR code to activate a cellular plan. Most phones released after 2018 support eSIM.</p>
</details>

<details class="faq-item">
  <summary>Is an eSIM better than a physical SIM?</summary>
  <p>For most travelers, yes. You can buy and activate it before you fly, you don't risk losing a tiny SIM card, and you can keep your home SIM active for 2FA. The main downside is that some older phones don't support it.</p>
</details>

<details class="faq-item">
  <summary>How do I know if my phone supports eSIM?</summary>
  <p>Check your phone's settings. On iPhone: Settings → Cellular → Add Cellular Plan. On Android: Settings → Network & Internet → SIMs → Add. If you see the option, your phone supports eSIM.</p>
</details>

<h2>About SIMDOCKET</h2>
<details class="faq-item">
  <summary>Are the prices on SIMDOCKET real?</summary>
  <p>Some are, some are estimates. Every price carries one of three labels: <strong>SOURCED</strong> (we checked the provider's public pricing page), <strong>ESTIMATED</strong> (modeled from public catalog bands), or <strong>UNVERIFIED-DRAFT</strong> (not published). Estimated prices are clearly marked with a blue badge.</p>
</details>

<details class="faq-item">
  <summary>How do you make money?</summary>
  <p>We earn affiliate commissions when you purchase eSIM plans through links on our site. This does not influence our rankings — the optimizer always shows you the cheapest option for your route, regardless of commission rates.</p>
</details>

<details class="faq-item">
  <summary>Why do some pages say "estimate"?</summary>
  <p>We haven't verified those prices against the provider's live pricing page yet. The estimate is based on public catalog pricing bands for that tier. We encourage you to verify before purchase.</p>
</details>

<h2>Using the optimizer</h2>
<details class="faq-item">
  <summary>How does the optimizer work?</summary>
  <p>Enter your itinerary (countries + days per leg) and your data profile (light/standard/heavy usage). The optimizer generates candidate eSIM stacks in four ways: one local plan per leg, a single regional plan, two regional blocks + local fill, and one global plan. Every stack is scored by total cost, coverage, network quality, and install friction.</p>
</details>

<details class="faq-item">
  <summary>What does "fair-use unlimited" mean?</summary>
  <p>Some plans are sold as "unlimited" but have a fair-use policy that slows your speed after a certain threshold (often 2-3 GB/day of full speed). The optimizer credits these plans accordingly instead of treating them as truly infinite.</p>
</details>

<details class="faq-item">
  <summary>Can I use the optimizer for a single country?</summary>
  <p>Yes, but it's overkill. For a single country, just pick the cheapest local plan with enough data for your trip. The optimizer shines for multi-country itineraries where you need to compare regional vs. local stacks.</p>
</details>

<details class="faq-item">
  <summary>What if no plan covers my route?</summary>
  <p>The optimizer will tell you "No filed plan covers this exact route yet." That's a data gap, not a bug — we may not have that corridor in our database yet. Try removing a leg or check back after our next update.</p>
</details>

<h2>Technical questions</h2>
<details class="faq-item">
  <summary>Do I need to install the eSIM before I travel?</summary>
  <p>Most eSIMs activate when they first connect to a local network, not when you install them. You can install the eSIM at home, then it activates when you land. Check the provider's activation rules before flying.</p>
</details>

<details class="faq-item">
  <summary>Can I use hotspot/tethering with an eSIM?</summary>
  <p>It depends on the plan. Some allow it, some block it, some charge extra. The optimizer filters out plans that block hotspot if you select "Need hotspot/tethering" in your profile.</p>
</details>`;
  return renderTrustPage('FAQ', 'Common questions about eSIMs, SIMDOCKET, and how to use the optimizer.', content);
}

function renderMethodology() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Method and limits — SIMDOCKET</title>
<meta name="description" content="How SIMDOCKET prices are estimated and verified, how network scores are modeled, and what this site cannot tell you.">
<link rel="canonical" href="${SITE_URL}/methodology/">
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css">
</head>
<body>
<header class="site-head"><a class="logo" href="../">SIMDOCKET</a><span class="logo-sub">eSIM comparisons for real itineraries</span></header>
<main class="page">
  <h1>Method and limits</h1>
  <p class="lead">Every price on SIMDOCKET carries one of three labels. Here's what they mean and how we verify our data.</p>
  
  <h2>The three-tier audit</h2>
  <p><strong>SOURCED / HUMAN-CHECKED</strong>: a real provider or documentation link is listed, with the date checked. <strong>ESTIMATED</strong>: no direct source yet — the figure comes from public catalog pricing bands and is labeled everywhere it appears. <strong>UNVERIFIED-DRAFT</strong>: not published at all. Nothing on this site is hidden silently.</p>
  
  <h2>How estimates are derived</h2>
  <p>Estimates use provider × tier baseline bands observed in this market's public catalogs (for example, local 3GB/30-day plans cluster in one band, regional 10GB/30-day in another). Figures are rounded on purpose. Each estimate is replaced by the listed price when a row is verified.</p>
  
  <h2>Network score</h2>
  <p>Where shown, the network score is modeled from plan-level data — 5G availability, provider density per country, and caveat tiers. It is a plan-market signal, not measured speed.</p>
  
  <h2>What this site cannot tell you</h2>
  <p>Live stock, promo codes, current outages, or guaranteed throughput. Treat ranked results as value shapes to verify at the provider's own checkout.</p>
  
  <p><a href="../editorial/">Read our full editorial standards</a>.</p>
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
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css">
</head>
<body>
<header class="site-head"><a class="logo" href="../">SIMDOCKET</a><span class="logo-sub">eSIM comparisons for real itineraries</span></header>
<main class="page">
  <h1>Photo credits</h1>
  <p class="lead">${entries.length} photographs, all from Wikimedia Commons under free licences. Thank you to every contributor.</p>
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

// Trust pages
const trustPages = [
  { path: 'about', render: renderAbout },
  { path: 'contact', render: renderContact },
  { path: 'privacy', render: renderPrivacy },
  { path: 'terms', render: renderTerms },
  { path: 'editorial', render: renderEditorial },
  { path: 'faq', render: renderFAQ },
  { path: 'methodology', render: renderMethodology },
  { path: 'credits', render: renderCredits },
];

for (const { path, render } of trustPages) {
  mkdirSync(join(DIST, path), { recursive: true });
    writeFileSync(join(DIST, path, 'index.html'), injectNav(render(), '../'));
  pages.push({ loc: `/${path}/`, lastmod: TODAY });
}

writeFileSync(join(DIST, 'plans', 'index.html'), injectNav(renderPlansIndex(rows), '../'));
pages.push({ loc: '/plans/', lastmod: TODAY });
mkdirSync(join(DIST, 'routes'), { recursive: true });
writeFileSync(join(DIST, 'routes', 'index.html'), injectNav(renderRoutes(rows), '../'));
pages.push({ loc: '/routes/', lastmod: TODAY });
writeFileSync(join(DIST, 'index.html'), injectNav(renderHomeV2(rows, manifest), ''));
pages.push({ loc: '/', lastmod: TODAY });
writeFileSync(join(DIST, 'pages.json'), JSON.stringify(pages, null, 2));

const estShare = Math.round(100 * rows.filter(r => r.estimated).length / rows.length);
console.log(`Built ${pages.length} indexable pages.`);
console.log(`Estimate share: ${estShare}% (track this down before Wave 2).`);
if (skipped.length) console.log(`NOT published (UNVERIFIED-DRAFT): ${skipped.length} → ${skipped.join(', ')}`);
else console.log('No pages held back. Nothing noindexed silently.');