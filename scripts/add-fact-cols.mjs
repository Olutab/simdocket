// scripts/add-fact-cols.mjs — one-off: adds verified-fact columns (start empty; facts are never estimated)
import { readFileSync, writeFileSync } from 'node:fs';
const F = './data/matrix.txt';
const raw = readFileSync(F, 'utf8').replace(/^\uFEFF/, '');
const lines = raw.trim().split(/\r?\n/);
if (lines[0].includes('carrier')) { console.log('Already migrated.'); process.exit(0); }
const header = lines[0].split('|');
const at = header.indexOf('hotspot_policy');
const newHeader = [...header.slice(0, at + 1), 'carrier', 'activation', 'ekyc', 'topup', 'phone_included', ...header.slice(at + 1)];
const out = [newHeader.join('|')];
for (const l of lines.slice(1)) {
  const c = l.split('|');
  out.push([...c.slice(0, at + 1), '', '', '', '', '', ...c.slice(at + 1)].join('|'));
}
writeFileSync(F, out.join('\n') + '\n');
console.log(`Migrated ${out.length - 1} rows to ${newHeader.length} columns (fact columns empty).`);