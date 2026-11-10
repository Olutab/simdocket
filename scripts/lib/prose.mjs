// scripts/lib/prose.mjs — sentence-pattern pools with branching on field values
const hash = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) >>> 0; return h; };
const pick = (arr, seedStr) => arr[hash(seedStr) % arr.length];

const BEST_FOR_TEXT = {
  LIGHT: 'travellers who mainly need maps and messaging',
  STANDARD: 'typical holiday use: maps, social media, some video',
  HEAVY: 'video calls and streaming on the road',
  LONGSTAY: 'month-long stays and remote work',
  BACKUP: 'an emergency backup line',
};

export function directAnswer(r) {
  const capTxt = r.unlimited
    ? (r.fup_threshold_gb ? `fair-use unlimited (about ${r.fup_threshold_gb} GB/day full speed)` : 'fair-use unlimited')
    : `${r.cap_gb} GB`;
  const covTxt = r.category === 'local' ? `${r.countries[0]} only`
    : r.category === 'regional' ? `${r.countries.length} countries (${r.countries.join(', ')})`
    : 'a worldwide country set';
  const est = r.estimated ? ' The price shown is an estimate until the provider listing is checked.' : '';
  const patterns = [
    `The ${r.entity_name} is a ${capTxt} eSIM valid ${r.days} days, covering ${covTxt}, priced around $${r.price}. It fits ${BEST_FOR_TEXT[r.best_for]}.${est}`,
    `For ${BEST_FOR_TEXT[r.best_for]}, the ${r.entity_name} offers ${capTxt} over ${r.days} days across ${covTxt} for roughly $${r.price}.${est}`,
    `Priced around $${r.price}, the ${r.entity_name} gives you ${capTxt} for ${r.days} days in ${covTxt} — a match for ${BEST_FOR_TEXT[r.best_for]}.${est}`,
    `The ${r.entity_name} covers ${covTxt} with ${capTxt} of data over ${r.days} days at about $${r.price}, aimed at ${BEST_FOR_TEXT[r.best_for]}.${est}`,
    `Around $${r.price} buys the ${r.entity_name}: ${capTxt}, ${r.days} days of validity, coverage in ${covTxt}. Best suited to ${BEST_FOR_TEXT[r.best_for]}.${est}`,
  ];
  return pick(patterns, r.slug);
}

export function scenario(r) {
  const dailyNeed = { LIGHT: 0.25, STANDARD: 0.5, HEAVY: 1.5, LONGSTAY: 1, BACKUP: 0.1 }[r.best_for];
  if (r.unlimited) {
    return `A ${r.best_for === 'HEAVY' ? 'video-call-heavy' : 'typical'} day uses roughly ${dailyNeed}–1.5 GB. With a fair-use plan you stop counting gigabytes, but assume the provider may slow you after sustained heavy use${r.fup_threshold_gb ? ` — this one is modeled at ~${r.fup_threshold_gb} GB/day of full speed` : ''}. Budget your heaviest days first.`;
  }
  const use = Number((dailyNeed * Math.min(r.days, 30)).toFixed(1));
  const left = Number((r.cap_gb - use).toFixed(1));
  return `Typical ${BEST_FOR_TEXT[r.best_for]} burns about ${dailyNeed} GB/day. Over a ${Math.min(r.days, 30)}-day stretch that's roughly ${use} GB — leaving ${left > 0 ? left + ' GB of headroom' : 'a shortfall, so plan a top-up'} on this ${r.cap_gb} GB plan. Navigation and messaging barely register; video is what eats the cap.`;
}

export function antiPitch(r) {
  const openers = ['Skip this one if: ', 'This is the wrong pick when: ', 'Do not buy this if: ', 'Better options exist if: ', 'Walk away if: '];
  const core = r.avoid_if || `you are staying in a single country under 7 days — a local plan or airport SIM will usually beat it`;
  return pick(openers, r.slug) + core + '.';
}

export function faq(r) {
  const hotspotA = {
    allowed: 'Yes — the provider lists hotspot/tethering as allowed. Sourced pages on this site carry the link.',
    blocked: 'No — hotspot is blocked on this plan. Pick a different plan if you need to tether a laptop.',
    paid: 'Only as a paid add-on according to the provider’s terms.',
    unknown: 'Not verified yet. This is flagged on the page and in the optimizer — confirm with the provider before purchase if tethering matters to you.',
  }[r.hotspot_policy];
  return [
    { q: `Does the ${r.entity_name} allow hotspot/tethering?`, a: hotspotA },
    { q: `How long is the ${r.entity_name} valid?`,
      a: `${r.days} days. Validity for products like this normally starts when the eSIM first connects to a local network — not when you install it — but confirm the provider's activation rules before flying.` },
  ];
}

export function h2(role, slug) {
  const pools = {
    spec: ['Plan specifications', 'The numbers', 'Spec sheet', 'What you get', 'Plan details'],
    answer: ['The short answer', 'In one paragraph', 'Quick verdict', 'Straight answer', 'Summary'],
    coverage: ['Where it works', 'Coverage set', 'Countries included', 'Coverage at a glance', 'Destination list'],
    fairuse: ['Read the fair-use terms', 'Unlimited, with asterisks', 'What unlimited means here', 'Fair-use, explained', 'The small print'],
    scenario: ['Worked scenario', 'Real-usage math', 'What the cap actually covers', 'A realistic trip on this plan', 'Usage, calculated'],
    neighbors: ['Closest alternatives', 'Nearest plans by value', 'Three plans to compare first', 'Nearby options', 'Compare these next'],
    antipitch: ['When this is the wrong choice', 'Who should skip it', 'The anti-pitch', 'When to walk away', 'Wrong-fit check'],
    faq: ['Common questions', 'Quick questions', 'Before you buy', 'FAQ', 'Traveler questions'],
  };
  return pick(pools[role], slug + role);
}