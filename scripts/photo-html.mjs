// scripts/photo-html.mjs — protocol §7/§8: one helper, five slots, no captions
import { pickVariant } from './lib/images-core.mjs';

const SIZES = {
  'hero-wide': '(min-width: 900px) 800px, 100vw',
  'banner': '(min-width: 900px) 800px, 100vw',
  'float-right': '(min-width: 900px) 340px, 100vw',
  'float-left': '(min-width: 900px) 340px, 100vw',
  'mid-card': '(min-width: 900px) 620px, 100vw',
  'thumb-side': '180px',
};
const SLOT = { 'hero-wide': 'hero', 'banner': 'hero', 'float-right': 'afterIntro', 'float-left': 'afterIntro', 'mid-card': 'mid', 'thumb-side': 'titleSide' };
const TOP = new Set(['hero-wide', 'banner', 'thumb-side']);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function licenseUrlFor(lic) {
  const l = (lic || '').toLowerCase();
  const v = (l.match(/(\d\.\d)/) || [])[1] || '4.0';
  if (l.startsWith('cc0')) return 'https://creativecommons.org/publicdomain/zero/1.0/';
  if (l.includes('by-sa')) return `https://creativecommons.org/licenses/by-sa/${v}/`;
  if (l.startsWith('cc by')) return `https://creativecommons.org/licenses/by/${v}/`;
  if (l.includes('public domain')) return 'https://creativecommons.org/publicdomain/mark/1.0/';
  return '';
}

export function figureHtml(m, slug, variant, alt) {
  const src = variant === 'thumb-side' ? `/images/${slug}-480.webp` : `/images/${slug}-800.webp`;
  const srcset = [480, 800, 1280].map(w => `/images/${slug}-${w}.webp ${w}w`).join(', ');
  const load = TOP.has(variant) ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<figure class="ph ph--${variant}" data-photo-variant="${variant}"><img src="${src}" srcset="${srcset}" sizes="${SIZES[variant]}" width="${m.width}" height="${m.height}" alt="${esc(alt || m.alt)}" style="object-position: ${m.focus || 'center'}" ${load}></figure>`;
}

// returns { variant, hero, afterIntro, mid, titleSide, credit } — exactly one slot non-empty
export function placePhoto(manifest, slug, opts = {}) {
  const empty = { variant: 'none', hero: '', afterIntro: '', mid: '', titleSide: '', credit: '' };
  const m = manifest[slug];
  if (!m || !m.files || !m.files.length) return empty;
  const variant = m.variant || pickVariant(slug);
  const out = { ...empty, variant };
  out[SLOT[variant]] = figureHtml(m, slug, variant, opts.alt);
  out.credit = m.needsAttribution ? `<a class="pc" href="/credits#${slug}">Photo credit</a>` : '';
  return out;
}