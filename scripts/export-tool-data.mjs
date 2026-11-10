// scripts/export-tool-data.mjs — exports matrix.json for the React tool (zone tokens expanded)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// Zone shorthand → real ISO codes. Membership is an ESTIMATE until provider
// coverage lists are checked; same honesty tier as the prices.
const ZONES = {
  'EU-39': ['AL','AD','AM','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','GE','DE','GR','HU','IS','IE','IT','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','TR','UA','GB'],
};
// 'GLB' is NOT expanded: the optimizer treats it as "covers every country".

const lines = readFileSync('./data/matrix.txt', 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
const header = lines[0].split('|');
const rows = lines.slice(1).map(l => {
  const c = l.split('|');
  return Object.fromEntries(header.map((h, i) => [h, (c[i] ?? '').trim()]));
});

const plans = rows
  .filter(r => r.auditing_status !== 'UNVERIFIED-DRAFT')
  .map(r => ({
    id: r.id, slug: r.slug, name: r.entity_name, provider: r.provider,
    category: r.category,
    coverage: r.coverage_codes.split(' ').flatMap(code => ZONES[code] ?? [code]),
    capGb: Number(r.data_cap_gb), validityDays: Number(r.validity_days),
    priceUsd: Number(r.price_usd), tech: r.network_tech, hotspot: r.hotspot_policy,
    fupGb: r.fup_threshold_gb === '' ? null : Number(r.fup_threshold_gb),
    caveat: r.caveat_tier, estimated: r.auditing_status === 'ESTIMATED',
  }));

mkdirSync('./tool/public', { recursive: true });
writeFileSync('./tool/public/matrix.json', JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), plans }, null, 2));
console.log(`Exported ${plans.length} plans to tool/public/matrix.json (zones expanded)`);