// scripts/lib/images-core.mjs — protocol v2 reference implementations, copied exactly
export const STOP = new Set(['a','an','the','of','and','or','in','on','at','for','with','to','by']);

export const units = (q) => String(q).toLowerCase().replace(/[^a-z0-9\s-]/g,' ')
  .split(/\s+/).filter(w => w && !STOP.has(w));

export function ladder(q, headOverride) {
  const u = units(q); if (!u.length) return { head: '', steps: [] };
  const head = (headOverride || u[u.length - 1]).toLowerCase();
  const hi = u.lastIndexOf(head) >= 0 ? u.lastIndexOf(head) : u.length - 1;
  const steps = [];
  for (let len = u.length; len >= 1; len--)
    for (let s = 0; s + len <= u.length; s++)
      if (s <= hi && hi < s + len) steps.push(u.slice(s, s + len).join(' '));
  return { head: u[hi], steps };
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const re = (term) => new RegExp(
  '(?<![a-z0-9])' + term.toLowerCase().split(/[\s-]+/).map(esc).join('[\\s_-]*') + '(?:s|es)?(?![a-z0-9])', 'i');

export function relevance(c, { step, units: u, head, context = [], avoid = [], min = 5 }) {
  const all = [c.title, c.desc, (c.categories || []).join(' ')].join(' ');
  for (const a of avoid) if (re(a).test(all)) return { ok: false, reason: `avoid word "${a}"` };
  if (!re(head).test(all)) return { ok: false, reason: `head word "${head}" not in title/description/categories` };
  if (!re(step).test(all)) return { ok: false, reason: `search phrase "${step}" not in text` };
  const single = step.split(/\s+/).length === 1;
  const ctx = context.some((w) => re(w).test(all));
  if (single && context.length && !ctx)
    return { ok: false, reason: 'single generic word with no niche context word nearby' };
  let s = re(step).test(c.title) ? 5 : 3;
  for (const w of u) if (w !== head && re(w).test(all)) s += 1;
  if (ctx) s += 2;
  if (c.noAttribution) s += 1;
  return s >= min ? { ok: true, score: s } : { ok: false, reason: `score ${s} < ${min}` };
}

export function hash(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export const VARIANTS = ['hero-wide', 'banner', 'float-right', 'float-left', 'mid-card', 'thumb-side'];
export const pickVariant = (slug) => VARIANTS[hash(slug + '|layout') % VARIANTS.length];