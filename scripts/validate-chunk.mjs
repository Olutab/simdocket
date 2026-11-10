// scripts/validate-chunk.mjs
// Usage: node scripts/validate-chunk.mjs data/matrix.txt
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/validate-chunk.mjs data/matrix.txt');
  process.exit(1);
}

const raw = readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); // strip BOM if present
const lines = raw.trim().split(/\r?\n/).filter(l => l.trim() !== ''); // Windows + Mac safe
const header = lines[0].split('|');
const N = header.length;
const idx = (k) => header.indexOf(k);

const enums = {
  category: ['local', 'regional', 'global'],
  provider: ['airalo', 'holafly', 'nomad', 'saily', 'ubigi', 'maya', 'gigsky', 'alosim', 'yesim', 'firsty', 'simify'],
  network_tech: ['4G', '5G'],
  hotspot_policy: ['allowed', 'blocked', 'paid', 'unknown'],
  best_for: ['LIGHT', 'STANDARD', 'HEAVY', 'LONGSTAY', 'BACKUP'],
  caveat_tier: ['CLEAN', 'WATCH', 'CAUTION'],
  auditing_status: ['SOURCED', 'HUMAN-CHECKED', 'ESTIMATED', 'UNVERIFIED-DRAFT'],
};

const seen = { id: new Set(), slug: new Set(), name: new Set() };
const errors = [];

lines.slice(1).forEach((l, i) => {
  const c = l.split('|').map(v => v.trim());
  const row = i + 2;
  const get = (k) => c[idx(k)];

  if (c.length !== N) errors.push(`row ${row}: has ${c.length} columns, expected ${N}`);
  if (!get('id') || !get('slug') || !get('entity_name')) errors.push(`row ${row}: missing id/slug/entity_name`);

  if (seen.id.has(get('id'))) errors.push(`row ${row}: duplicate id "${get('id')}"`);
  seen.id.add(get('id'));
  if (seen.slug.has(get('slug'))) errors.push(`row ${row}: duplicate slug "${get('slug')}"`);
  seen.slug.add(get('slug'));
  if (seen.name.has(get('entity_name'))) errors.push(`row ${row}: duplicate entity_name "${get('entity_name')}"`);
  seen.name.add(get('entity_name'));

  for (const [k, vals] of Object.entries(enums)) {
    const v = get(k);
    if (v !== undefined && !vals.includes(v)) errors.push(`row ${row}: ${k}="${v}" is not one of: ${vals.join(', ')}`);
  }

  if (!(parseFloat(get('price_usd')) >= 0)) errors.push(`row ${row}: price_usd must be a number >= 0`);
  if (!(parseInt(get('validity_days')) > 0)) errors.push(`row ${row}: validity_days must be > 0`);
  const cap = parseInt(get('data_cap_gb'));
  if (!(cap === -1 || cap > 0)) errors.push(`row ${row}: data_cap_gb must be > 0, or -1 for unlimited`);
  if (cap !== -1 && get('fup_threshold_gb') !== '' && get('fup_threshold_gb') !== undefined)
    errors.push(`row ${row}: fup_threshold_gb should be empty for capped plans`);

  const status = get('auditing_status');
  if (status !== 'ESTIMATED' && status !== 'UNVERIFIED-DRAFT' && !get('source_url'))
    errors.push(`row ${row}: status "${status}" requires a source_url`);
  if (status === 'ESTIMATED' && (get('source_url') || get('last_checked')))
    errors.push(`row ${row}: ESTIMATED rows must leave source_url/last_checked empty`);

  const lc = get('last_checked');
  if (lc && !/^\d{4}-\d{2}-\d{2}$/.test(lc)) errors.push(`row ${row}: last_checked must be YYYY-MM-DD`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(get('slug') ?? '')) errors.push(`row ${row}: slug must be lowercase-hyphenated`);
});

if (errors.length) {
  console.log(`FAIL — ${errors.length} problem(s) found:\n`);
  for (const e of errors) console.log('  ✗ ' + e);
  process.exit(1);
} else {
  console.log(`PASS — ${lines.length - 1} rows, ${N} columns, no violations.`);
}