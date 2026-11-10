// tool/src/lib/optimizer.ts
export interface Leg { country: string; days: number }
export interface Profile { gbPerDay: number; needHotspot: boolean; maxInstalls: number; }
export interface Plan { id: string; slug: string; name: string; provider: string; category: string; coverage: string[]; capGb: number; validityDays: number; priceUsd: number; tech: string; hotspot: string; fupGb: number | null; caveat: string; estimated: boolean; }

export interface Combo {
  strategy: string; plans: { plan: Plan; qty: number }[];
  totalUsd: number; installs: number; capGb: number; 
  score: number; why: string; flags: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function optimize(legs: Leg[], plans: Plan[], profile: Profile): Combo[] {
  if (!legs.length) return [];
  const totalDays = legs.reduce((s, l) => s + l.days, 0);
  const needGb = Math.ceil(totalDays * profile.gbPerDay);
  
    const covers = (p: Plan, c: string) => p.coverage.includes('GLB') || p.coverage.includes(c);
  const pool = plans.filter(p => !(profile.needHotspot && p.hotspot === 'blocked'));
  const combos: Combo[] = [];

  // Strategy 1: One local plan per leg
  const locals = legs.map(leg => {
        const localPlans = pool.filter(p => p.category === 'local' && covers(p, leg.country));
    if (!localPlans.length) return null;
    localPlans.sort((a, b) => (a.priceUsd / Math.min(a.capGb === -1 ? needGb : a.capGb, needGb)) - (b.priceUsd / Math.min(b.capGb === -1 ? needGb : b.capGb, needGb)));
    const best = localPlans[0];
    return { plan: best, qty: Math.ceil(leg.days / best.validityDays) };
  });
  
  if (locals.every(x => x !== null)) {
    const plansList = locals as { plan: Plan; qty: number }[];
    combos.push(buildCombo('Local plan per leg', plansList, totalDays));
  }

  // Strategy 2: Single regional/global plan
  const allCountries = legs.map(l => l.country);
  const windowPlans = pool.filter(p => p.category !== 'local' && allCountries.every(c => covers(p, c)) && p.validityDays >= totalDays);
  windowPlans.sort((a, b) => a.priceUsd - b.priceUsd);
  
  for (const wp of windowPlans.slice(0, 2)) {
       combos.push(buildCombo(`Single ${wp.category} plan`, [{ plan: wp, qty: 1 }], totalDays));
  }

  // Score and sort
  const costs = combos.map(c => c.totalUsd);
  const [cMin, cMax] = [Math.min(...costs), Math.max(...costs)];
  
  for (const c of combos) {
    const costScore = cMax === cMin ? 1 : 1 - (c.totalUsd - cMin) / (cMax - cMin);
    const fricScore = c.installs <= profile.maxInstalls ? 1 : 0.5;
    const dataPenalty = c.capGb < needGb ? 0.7 : 1;
    c.score = Math.round(100 * (0.7 * costScore + 0.3 * fricScore) * dataPenalty);
  }

  return combos.sort((a, b) => b.score - a.score);
}

   function buildCombo(strategy: string, plans: { plan: Plan; qty: number }[], totalDays: number): Combo {
  const totalUsd = round2(plans.reduce((s, e) => s + e.plan.priceUsd * e.qty, 0));
  const installs = plans.reduce((s, e) => s + e.qty, 0);
  let capGb = 0;
  for (const e of plans) {
    if (e.plan.capGb === -1) capGb += (e.plan.fupGb ?? 2) * e.plan.validityDays * e.qty;
    else capGb += e.plan.capGb * e.qty;
  }
  capGb = Math.round(capGb);
  const flags: string[] = [];
  if (plans.some(e => e.plan.estimated)) flags.push('Includes estimated prices.');
  if (plans.some(e => e.plan.capGb === -1)) flags.push('Includes fair-use unlimited plan.');
  return { strategy, plans, totalUsd, installs, capGb, score: 0, why: `${totalDays} days, $${round2(totalUsd/totalDays)}/day.`, flags };
}