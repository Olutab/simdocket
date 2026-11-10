// tool/src/App.tsx
import { useEffect, useState } from 'react'
import type { Leg, Profile, Plan, Combo } from './lib/optimizer'
import { optimize } from './lib/optimizer'
import './App.css'

const DEFAULT_PROFILE: Profile = { gbPerDay: 0.5, needHotspot: false, maxInstalls: 3 }

function App() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [legs, setLegs] = useState<Leg[]>([{ country: 'TH', days: 14 }, { country: 'VN', days: 10 }])
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [results, setResults] = useState<Combo[]>([])
  const [ran, setRan] = useState(false)
  const [countries, setCountries] = useState<string[]>([])

  useEffect(() => {
    fetch('./matrix.json').then(r => r.json()).then(d => {
      setPlans(d.plans)
      const allC = [...new Set(d.plans.flatMap((p: Plan) => p.coverage))].filter(c => c !== 'GLB').sort() as string[]
setCountries(allC)
    })
  }, [])
  
  useEffect(() => {
    const i = new URLSearchParams(location.search).get('i');
    if (!i) return;
    const parsed = i.split(',').map(s => { const [c, d] = s.split('.'); return { country: c, days: Math.max(1, Math.min(90, Number(d) || 7)) }; }).filter(l => /^[A-Z]{2,5}$/.test(l.country));
    if (parsed.length) setLegs(parsed);
  }, []);

    const run = () => {
    setResults(optimize(legs, plans, profile));
    setRan(true);
    history.replaceState(null, '', `?i=${legs.map(l => `${l.country}.${l.days}`).join(',')}`);
  }

  const updateLeg = (i: number, field: 'country' | 'days', val: string | number) => {
    setLegs(ls => ls.map((l, k) => k === i ? { ...l, [field]: val } : l))
  }

  return (
    <div className="tool">
            <header className="tool-head"><a href="../">← SIMDOCKET</a><a href="../plans/">All plans</a><a href="../routes/">Routes</a></header>
      <h1>eSIM Itinerary Optimizer</h1>
      <p className="sub">Rank eSIM stacks for multi-country trips by cost, friction, and data limits.</p>

      <section className="inputs">
        <h2>1. Your Itinerary</h2>
        {legs.map((l, i) => (
          <div key={i} className="leg">
            <span className="leg-num">Leg {i + 1}:</span>
            <select value={l.country} onChange={e => updateLeg(i, 'country', e.target.value)}>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" min="1" max="90" value={l.days} onChange={e => updateLeg(i, 'days', +e.target.value)} /> days
            <button className="remove" onClick={() => setLegs(ls => ls.filter((_, k) => k !== i))}>✕</button>
          </div>
        ))}
        <button className="btn ghost" onClick={() => setLegs(ls => [...ls, { country: countries[0] || 'TH', days: 7 }])}>+ Add leg</button>

        <h2>2. Data Profile</h2>
        <label>Usage: 
          <select value={profile.gbPerDay} onChange={e => setProfile({...profile, gbPerDay: +e.target.value})}>
            <option value={0.25}>Light (~0.25 GB/day)</option>
            <option value={0.5}>Standard (~0.5 GB/day)</option>
            <option value={1.5}>Heavy (~1.5 GB/day)</option>
          </select>
        </label>
        <label><input type="checkbox" checked={profile.needHotspot} onChange={e => setProfile({...profile, needHotspot: e.target.checked})} /> Need hotspot/tethering</label>
      </section>

      <button className="btn primary" onClick={run}>Rank my options</button>

      <section className="results">
        {ran && results.length === 0 && (
          <p className="empty">No filed plan covers this exact route yet. That is a data gap, not a bug — remove a leg or check back after the next matrix update.</p>
        )}
        {results.map((c, i) => (
          <article key={i} className={`card ${i === 0 ? 'pick' : ''}`}>
            <div className="card-head">
              <span className="rank">№{i + 1}</span>
              <span className="score">{c.score}<small>/100</small></span>
              <span className="price">${c.totalUsd}</span>
            </div>
            <h3>{c.strategy}</h3>
            <table>
              <thead><tr><th>Plan</th><th>Data</th><th>Qty</th><th>Price</th></tr></thead>
              <tbody>
                {c.plans.map((p, k) => (
                  <tr key={k}>
                    <td>{p.plan.name} {p.plan.estimated && <span className="badge">est.</span>}</td>
                    <td>{p.plan.capGb === -1 ? 'Fair-use' : `${p.plan.capGb}GB`}</td>
                    <td>×{p.qty}</td>
                    <td>${round2(p.plan.priceUsd * p.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="why">{c.why}</p>
            {c.flags.length > 0 && <ul className="flags">{c.flags.map(f => <li key={f}>⚠ {f}</li>)}</ul>}
          </article>
        ))}
      </section>
    </div>
  )
}

const round2 = (n: number) => Math.round(n * 100) / 100
export default App