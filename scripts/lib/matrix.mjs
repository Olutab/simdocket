// scripts/lib/matrix.mjs — load, validate, and enrich data/matrix.txt
import { readFileSync } from 'node:fs';

const ENUMS = {
  category: ['local', 'regional', 'global'],
  provider: ['airalo', 'holafly', 'nomad', 'saily', 'ubigi', 'maya', 'gigsky', 'alosim', 'yesim', 'firsty', 'simify'],
  network_tech: ['4G', '5G'],
  hotspot_policy: ['allowed', 'blocked', 'paid', 'unknown'],
  best_for: ['LIGHT', 'STANDARD', 'HEAVY', 'LONGSTAY', 'BACKUP'],
  caveat_tier: ['CLEAN', 'WATCH', 'CAUTION'],
  auditing_status: ['SOURCED', 'HUMAN-CHECKED', 'ESTIMATED', 'UNVERIFIED-DRAFT'],
};

export function loadMatrix(file = './data/matrix.txt') {
  const raw = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim() !== '');
  const header = lines[0].split('|');
  const rows = lines.slice(1).map((l, i) => {
    const cells = l.split('|').map(v => v.trim());
    const r = {};
    header.forEach((k, j) => { r[k] = cells[j] ?? ''; });
    r._row = i + 2;
    return r;
  });

  const errors = [];
  const slugs = new Set();
  for (const r of rows) {
    if (slugs.has(r.slug)) errors.push(`row ${r._row}: duplicate slug ${r.slug}`);
    slugs.add(r.slug);
    for (const [k, vals] of Object.entries(ENUMS))
      if (!vals.includes(r[k])) errors.push(`row ${r._row}: ${k}="${r[k]}" invalid`);
    if (!(Number(r.price_usd) >= 0)) errors.push(`row ${r._row}: bad price`);
    if (!(Number(r.validity_days) > 0)) errors.push(`row ${r._row}: bad validity`);
    const cap = Number(r.data_cap_gb);
    if (!(cap === -1 || cap > 0)) errors.push(`row ${r._row}: bad data cap`);
    if (r.auditing_status !== 'ESTIMATED' && r.auditing_status !== 'UNVERIFIED-DRAFT' && !r.source_url)
      errors.push(`row ${r._row}: sourced status without a source_url`);
  }
  if (errors.length) {
    console.log('DATA FAIL:'); errors.forEach(e => console.log('  ✗ ' + e)); process.exit(1);
  }
  return rows.map(withComputed);
}

function withComputed(r) {
  r.cap_gb = Number(r.data_cap_gb);
  r.price = Number(r.price_usd);
  r.days = Number(r.validity_days);
  r.unlimited = r.cap_gb === -1;
  r.countries = r.coverage_codes.split(' ').filter(Boolean);
  r.estimated = r.auditing_status === 'ESTIMATED';
  r.price_per_gb = r.unlimited ? null : Number((r.price / r.cap_gb).toFixed(2));
  r.daily_cost = Number((r.price / r.days).toFixed(2));
  return r;
}

export function attachNeighbors(rows) {
  for (const r of rows) {
    r.neighbors = rows
      .filter(o => o.id !== r.id && o.category === r.category)
      .map(o => ({
        o,
        dist: Math.abs(o.daily_cost - r.daily_cost)
            + (o.countries.some(c => r.countries.includes(c)) ? 0 : 0.5),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map(x => x.o);
  }
}