import { useEffect, useState } from 'react'
import type { Leg, Profile, Plan, Combo } from './lib/optimizer'
import { optimize } from './lib/optimizer'
import './App.css'

const DEFAULT_PROFILE: Profile = { gbPerDay: 0.5, needHotspot: false, maxInstalls: 3 }
const round2 = (n: number) => Math.round(n * 100) / 100

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
      const allC = [...new Set(d.plans.flatMap((p: Plan) => p.coverage) as string[])].filter(c => c !== 'GLB').sort()
      setCountries(allC)
    })
  }, [])

  useEffect(() => {
    const i = new URLSearchParams(location.search).get('i')
    if (!i) return
    const parsed = i.split(',').map(s => { const [c, d] = s.split('.'); return { country: c, days: Math.max(1, Math.min(90, Number(d) || 7)) } }).filter(l => /^[A-Z]{2,5}$/.test(l.country))
    if (parsed.length) setLegs(parsed)
  }, [])

  const run = () => {
    setResults(optimize(legs, plans, profile))
    setRan(true)
    history.replaceState(null, '', `?i=${legs.map(l => `${l.country}.${l.days}`).join(',')}`)
  }

  const updateLeg = (i: number, field: 'country' | 'days', val: string | number) => {
    setLegs(ls => ls.map((l, k) => (k === i ? { ...l, [field]: val } : l)))
  }

  return (
    <div className="tool">
      <header className="tool-head">
        <a href="../">← SIMDOCKET</a><a href="../plans/">All plans</a><a href="../routes/">Routes</a>
      </header>
      <h1>eSIM Itinerary Optimizer</h1>
      <p className="sub">Enter your route. We rank every viable eSIM stack by cost, install friction and usable data — estimates labeled, caveats listed.</p>

      <div className="tool-grid">
        <section className="panel" aria-label="Itinerary and profile">
          <h2>1 · Your itinerary</h2>
          {legs.map((l, i) => (
            <div className="leg-card" key={i}>
              <span className="leg-no">{i + 1}</span>
              <select value={l.country} onChange={e => updateLeg(i, 'country', e.target.value)} aria-label={`Country, leg ${i + 1}`}>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="stepper">
                <button onClick={() => updateLeg(i, 'days', Math.max(1, l.days - 1))} aria-label={`Fewer days, leg ${i + 1}`}>−</button>
                <input type="number" min={1} max={90} value={l.days} onChange={e => updateLeg(i, 'days', Math.max(1, Math.min(90, Number(e.target.value) || 1)))} aria-label={`Days, leg ${i + 1}`} />
                <button onClick={() => updateLeg(i, 'days', Math.min(90, l.days + 1))} aria-label={`More days, leg ${i + 1}`}>+</button>
              </div>
              <button className="remove" onClick={() => setLegs(ls => ls.filter((_, k) => k !== i))} aria-label={`Remove leg ${i + 1}`}>✕</button>
            </div>
          ))}
          <button className="btn ghost" onClick={() => setLegs(ls => [...ls, { country: countries[0] || 'TH', days: 7 }])}>+ Add leg</button>

          <h2>2 · Data profile</h2>
          <div className="seg" role="group" aria-label="Daily data usage">
            {[0.25, 0.5, 1.5].map(v => (
              <button key={v} className={profile.gbPerDay === v ? 'on' : ''} onClick={() => setProfile(p => ({ ...p, gbPerDay: v }))}>
                {v === 0.25 ? 'Light' : v === 0.5 ? 'Standard' : 'Heavy'}
              </button>
            ))}
          </div>
          <p className="seg-hint">≈ {profile.gbPerDay} GB/day — {profile.gbPerDay === 0.25 ? 'maps & messaging' : profile.gbPerDay === 0.5 ? 'maps, social, some video' : 'video calls & streaming'}</p>
          <label className="check"><input type="checkbox" checked={profile.needHotspot} onChange={e => setProfile(p => ({ ...p, needHotspot: e.target.checked }))} /> I need hotspot / tethering</label>

          <button className="btn primary" onClick={run}>Rank my options</button>
        </section>

        <section className="panel results-panel" aria-live="polite" aria-label="Ranked results">
          <h2>Ranked stacks</h2>
          {!ran && <p className="empty">Your ranked eSIM stacks will appear here.</p>}
          {ran && results.length === 0 && <p className="empty">No filed plan covers this exact route yet. That is a data gap, not a bug — remove a leg or check back after the next matrix update.</p>}
          {results.map((c, i) => (
            <article key={i} className={`card ${i === 0 ? 'pick' : ''}`}>
              <div className="card-head">
                <span className="rank">№{i + 1}</span>
                <span className="scorebar" aria-hidden="true"><span style={{ width: `${c.score}%` }} /></span>
                <span className="price">${c.totalUsd}</span>
              </div>
              <h3>{c.strategy}</h3>
              <table>
                <thead><tr><th>Plan</th><th>Data</th><th>Qty</th><th>Price</th></tr></thead>
                <tbody>
                  {c.plans.map((p, k) => (
                    <tr key={k}>
                      <td>{p.plan.name}{p.plan.estimated && <span className="badge">est.</span>}</td>
                      <td>{p.plan.capGb === -1 ? 'Fair-use' : `${p.plan.capGb}GB`}</td>
                      <td>×{p.qty}</td>
                      <td>${round2(p.plan.priceUsd * p.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="why">{c.why} Installs: {c.installs}. Usable data ≈ {c.capGb} GB.</p>
              {c.flags.length > 0 && <ul className="flags">{c.flags.map(f => <li key={f}>⚠ {f}</li>)}</ul>}
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}

export default App