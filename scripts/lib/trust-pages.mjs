// scripts/lib/trust-pages.mjs — trust & legal pages
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TODAY = new Date().toISOString().slice(0, 10);
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`;

function shell(title, desc, content) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — SIMDOCKET</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="https://simdocket.example/${title.toLowerCase().replace(/[^a-z]+/g, '-')}/">
${FONTS}
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

export function renderAbout() {
  return shell('About Us', 'Who we are, why we built SIMDOCKET, and how we verify our data.', `
<p class="lead">We built SIMDOCKET because every "best eSIM" list we found was either affiliate spam or a single-provider pitch. We wanted a tool that actually compares the options for real itineraries — not just Thailand, but Thailand → Vietnam → Malaysia in 65 days.</p>
<h2>What makes us different</h2>
<p>Most eSIM review sites are built to maximize affiliate commissions from a single provider. SIMDOCKET compares every major provider — Airalo, Holafly, Nomad, Saily, Ubigi, Maya and more — by real cost per GB, network quality and coverage overlap. The optimizer shows you the cheapest honest stack for your route, not the one that pays us most.</p>
<h2>Our data honesty system</h2>
<ul>
  <li><strong>SOURCED:</strong> we checked the provider's public pricing page and linked to it with the date checked.</li>
  <li><strong>ESTIMATED:</strong> modeled from public catalog pricing bands, clearly badged on every page.</li>
  <li><strong>UNVERIFIED-DRAFT:</strong> not published at all, excluded from the sitemap, never hidden silently.</li>
</ul>
<h2>Who we are</h2>
<p>A small team of developers and travelers who got tired of affiliate spam. The site is funded by affiliate links, but commissions never touch the rankings. Questions? <a href="../contact/">Get in touch</a>.</p>`);
}

export function renderContact() {
  return shell('Contact', 'How to reach the SIMDOCKET team with questions, data errors, or partnership inquiries.', `
<p class="lead">We read everything. Data errors get fixed and credited in the changelog.</p>
<h2>Email</h2>
<p><a href="mailto:hello@simdocket.example">hello@simdocket.example</a></p>
<h2>Report a data error</h2>
<p>Send the page URL, what's wrong, and the correct information if you have it. Wrong photo? Wrong price? Dead plan? We want to know.</p>
<h2>Partnerships</h2>
<p>Travel blogs, OTAs and nomad communities can embed the optimizer or commission custom corridor data. Email us and we'll send the embed snippet and a demo.</p>`);
}

export function renderPrivacy() {
  return shell('Privacy Policy', 'What data SIMDOCKET collects (almost nothing) and how we use it.', `
<p class="lead">The optimizer runs entirely in your browser. Your itinerary never leaves your device.</p>
<h2>What we collect</h2>
<ul>
  <li>Basic server logs (IP, path, timestamp) for debugging and abuse prevention.</li>
  <li>Aggregate, non-identifying traffic metrics from our host.</li>
</ul>
<h2>What we don't collect</h2>
<p>No cookies, no tracking pixels, no analytics scripts on content pages, no accounts, no emails unless you write to us first.</p>
<h2>Third parties</h2>
<ul>
  <li><strong>Netlify</strong> hosts the site.</li>
  <li><strong>Google Fonts</strong> serves typography (they may see your IP when fonts load).</li>
  <li>Photos are downloaded from Wikimedia Commons at build time and served from our own server — your browser never contacts Wikimedia.</li>
</ul>
<h2>Affiliate links</h2>
<p>Outbound provider links may carry a tracking parameter so the provider knows the sale came from us. We share nothing about you with them.</p>`);
}

export function renderTerms() {
  return shell('Terms of Service', 'Legal disclaimer, affiliate disclosure, and warranty information.', `
<p class="lead">By using SIMDOCKET you agree to these terms.</p>
<h2>Disclaimer</h2>
<p>SIMDOCKET provides eSIM comparisons for information only. We are not affiliated with any provider. Prices, coverage and policies change — verify current terms at the provider's checkout before paying.</p>
<h2>Estimates</h2>
<p>Prices badged "est." are modeled from public catalog bands. Treat them as ballpark, not quotes.</p>
<h2>Affiliate disclosure</h2>
<p>We may earn commissions on purchases made through our links. Commissions never influence rankings.</p>
<h2>No warranty & limitation of liability</h2>
<p>Data is provided as-is. We strive for accuracy but guarantee nothing; you are responsible for verifying plan terms before purchase.</p>`);
}

export function renderEditorial() {
  return shell('Editorial Standards', 'How SIMDOCKET verifies data, labels estimates, and keeps every page honest.', `
<p class="lead">Three statuses, one rule: never publish a claim the page can't stand behind.</p>
<h2>The three-tier audit</h2>
<p><strong>SOURCED / HUMAN-CHECKED</strong> — a real provider or documentation link with the date checked. <strong>ESTIMATED</strong> — no direct source yet; modeled from public catalog bands and badged everywhere it appears. <strong>UNVERIFIED-DRAFT</strong> — not published, excluded from the sitemap, and we say so publicly.</p>
<h2>How estimates are derived</h2>
<p>Provider × tier baseline bands observed in public catalogs: local 1–3GB/30d plans cluster in one band, regional 10GB/30d in another, global 1GB/7d in another. Figures are rounded on purpose and replaced by listed prices as rows get verified.</p>
<h2>Network score</h2>
<p>Modeled from plan-level data — 5G availability, provider density per country, caveat tiers. A plan-market signal, not measured throughput.</p>
<h2>What we never do</h2>
<ul>
  <li>Invent sources, prices or safety claims</li>
  <li>Silently noindex a page</li>
  <li>Rank by commission</li>
  <li>Fake reviews or testimonials</li>
  <li>Hide a limitation instead of labeling it</li>
</ul>
<p>Found an error? <a href="../contact/">Tell us</a> — fixes get credited in the changelog.</p>`);
}

export function renderFAQ() {
  return shell('FAQ', 'Common questions about eSIMs, SIMDOCKET, and how to use the optimizer.', `
<p class="lead">The questions we get most, answered plainly.</p>
<h2>About eSIMs</h2>
<details class="faq-item"><summary>What's an eSIM?</summary><p>A digital SIM built into your phone. You scan a QR code to activate a plan instead of swapping a physical card. Most phones since 2018 support it.</p></details>
<details class="faq-item"><summary>Is an eSIM better than a physical SIM?</summary><p>For most travelers yes: buy and install before you fly, keep your home SIM active for 2FA codes, nothing tiny to lose.</p></details>
<details class="faq-item"><summary>How do I check my phone supports eSIM?</summary><p>iPhone: Settings → Cellular → Add Cellular Plan. Android: Settings → Network & Internet → SIMs → Add. If the option exists, you're covered.</p></details>
<h2>About SIMDOCKET</h2>
<details class="faq-item"><summary>Are the prices real?</summary><p>Sourced rows link to the provider's live pricing page. Everything else wears an "est." badge meaning modeled from public catalog bands — verify before paying.</p></details>
<details class="faq-item"><summary>How do you make money?</summary><p>Affiliate commissions on outbound links. They never touch the rankings — the optimizer sorts by your real cost.</p></details>
<h2>Using the optimizer</h2>
<details class="faq-item"><summary>How does it rank stacks?</summary><p>It builds candidates four ways — locals per leg, one regional block, two regional blocks plus locals, one global plan — then scores by total cost, day-coverage, modeled network quality and install friction.</p></details>
<details class="faq-item"><summary>What does "fair-use unlimited" mean?</summary><p>"Unlimited" plans usually throttle after a daily full-speed allowance. The optimizer credits them up to that allowance, never as infinite.</p></details>
<details class="faq-item"><summary>No result for my route?</summary><p>That's a data gap, not a bug. The catalog grows in waves; the page tells you plainly instead of inventing an answer.</p></details>`);
}