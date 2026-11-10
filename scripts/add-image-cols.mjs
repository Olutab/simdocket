// scripts/add-image-cols.mjs — one-off: adds image_head/context/avoid/query_alt columns
import { readFileSync, writeFileSync } from 'node:fs';
const F = './data/matrix.txt';
const raw = readFileSync(F, 'utf8').replace(/^\uFEFF/, '');
const lines = raw.trim().split(/\r?\n/);
if (lines[0].includes('image_head')) { console.log('Already migrated — nothing to do.'); process.exit(0); }

// slug -> [image_head, image_context, image_avoid, image_query_alt]
const M = {
  'airalo-thailand-3gb-30d': ['skytrain', 'bangkok railway station transit', '', 'bangkok bts skytrain'],
  'airalo-thailand-10gb-30d': ['ferry', 'river boat bangkok', '', 'chao phraya ferry'],
  'nomad-thailand-5gb-30d': ['temple', 'buddhist wat chiang mai', '', 'chiang mai temple'],
  'saily-vietnam-3gb-30d': ['street', 'hanoi old quarter vietnam', '', 'hanoi old quarter'],
  'airalo-vietnam-5gb-30d': ['bay', 'halong limestone karst vietnam', '', 'ha long bay'],
  'ubigi-vietnam-10gb-30d': ['coast', 'da nang beach vietnam', '', 'da nang beach'],
  'maya-malaysia-5gb-30d': ['monorail', 'kuala lumpur rail station', '', 'kuala lumpur monorail'],
  'airalo-malaysia-3gb-30d': ['shophouse', 'penang george town street', '', 'george town penang street'],
  'nomad-indonesia-10gb-30d': ['terrace', 'rice paddy bali ubud', '', 'ubud rice terraces'],
  'airalo-philippines-5gb-30d': ['cliffs', 'el nido palawan lagoon', '', 'el nido palawan'],
  'airalo-asia-3gb-30d': ['departures', 'airport terminal bangkok', '', 'suvarnabhumi airport'],
  'airalo-asia-10gb-30d': ['gate', 'airport terminal corridor', '', 'airport departure gate'],
  'nomad-asia-5gb-30d': ['ferry', 'mekong river boat', '', 'mekong river boat'],
  'saily-asia-3gb-30d': ['mrt', 'singapore metro station', '', 'singapore mrt station'],
  'ubigi-southeast-asia-5gb-30d': ['checkpoint', 'border crossing control', '', 'border control crossing'],
  'alosim-asia-5gb-30d': ['sleeper', 'night train carriage railway', '', 'night train interior'],
  'maya-southeast-asia-10gb-30d': ['promenade', 'vientiane mekong riverside', '', 'vientiane mekong riverside'],
  'gigsky-asia-pacific-1gb-7d': ['signage', 'airport wayfinding signs', 'logo', 'airport sign'],
  'airalo-europe-3gb-30d': ['station', 'railway train europe', '', 'european railway station'],
  'airalo-europe-10gb-30d': ['train', 'railway intercity europe', '', 'intercity train'],
  'nomad-europe-5gb-30d': ['viaduct', 'alps railway bridge', '', 'alpine railway bridge'],
  'saily-europe-3gb-30d': ['metro', 'subway station platform', 'logo', 'subway station platform'],
  'ubigi-europe-5gb-30d': ['ferry', 'harbor deck ship', '', 'ferry harbor'],
  'yesim-europe-10gb-30d': ['tram', 'tramway stop europe', 'logo', 'tramway stop'],
  'airalo-global-1gb-7d': ['airplane', 'aircraft wing flight clouds', '', 'airplane wing clouds'],
  'airalo-global-3gb-30d': ['terminal', 'airport walkway interior', '', 'airport terminal interior'],
  'nomad-global-5gb-30d': ['passport', 'stamps travel document', '', 'passport pages stamps'],
  'ubigi-global-3gb-30d': ['departures', 'airport hall board', '', 'airport departures board'],
  'gigsky-global-2gb-15d': ['gangway', 'cruise ship port', '', 'cruise ship docked port'],
  'firsty-global-basic-free': ['charging', 'phone charging station airport', '', 'usb charging port airport'],
  'holafly-thailand-unlimited-30d': ['canal', 'bangkok khlong boat pier', '', 'bangkok canal boat'],
  'holafly-vietnam-unlimited-20d': ['lantern', 'hoi an street vietnam', '', 'hoi an lanterns'],
  'maya-malaysia-unlimited-30d': ['waterfront', 'kota kinabalu sabah seaside', '', 'kota kinabalu waterfront'],
  'ubigi-thailand-unlimited-15d': ['longtail', 'phuket boat pier thailand', '', 'phuket longtail boats'],
  'yesim-asia-unlimited-15d': ['market', 'luang prabang laos stalls', '', 'luang prabang market'],
  'holafly-europe-unlimited-30d': ['sleeper', 'night train corridor railway', '', 'night train interior'],
  'nomad-thailand-20gb-30d': ['cafe', 'chiang mai coffee shop', '', 'chiang mai cafe'],
  'maya-malaysia-15gb-30d': ['mural', 'george town penang street art', '', 'george town street art'],
  'ubigi-vietnam-30gb-30d': ['skyline', 'ho chi minh city saigon', '', 'ho chi minh city skyline'],
  'simify-asia-20gb-30d': ['hostel', 'backpacker guesthouse interior', '', 'hostel common room'],
};

const header = lines[0].split('|');
const at = header.indexOf('image_query');
const newHeader = [...header.slice(0, at + 1), 'image_head', 'image_context', 'image_avoid', 'image_query_alt', ...header.slice(at + 1)];
let missing = [];
const out = [newHeader.join('|')];
for (const l of lines.slice(1)) {
  const c = l.split('|');
  const slug = c[header.indexOf('slug')];
  const v = M[slug];
  if (!v) missing.push(slug);
  const vals = v ?? ['', '', '', ''];
  out.push([...c.slice(0, at + 1), ...vals, ...c.slice(at + 1)].join('|'));
}
writeFileSync(F, out.join('\n') + '\n');
console.log(`Migrated ${out.length - 1} rows to ${newHeader.length} columns.`);
if (missing.length) console.log('Rows without authored values (will use derivation):', missing.join(', ') || 'none');