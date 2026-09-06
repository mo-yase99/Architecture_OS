'use client'
import { useEffect, useState } from 'react'

export default function DecisionCenter() {
  const [project, setProject] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('analyze')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/myos/site/command-center').then(r => r.json()).then(setProject)
  }, [])

  async function run() {
    if (!project?.project?.id) return
    setBusy(true); setMessage('')
    try {
      const r = await fetch('/api/myos/site/intelligence/decision-engine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.project.id, mode })
      })
      const x = await r.json()
      if (!r.ok) throw new Error(x.error || 'Decision engine failed')
      setResult(x)
      setMessage(mode === 'analyze' ? 'Analysis completed.' : mode === 'repair' ? 'Safe repairs completed.' : 'Safe executable actions completed.')
    } catch (e: any) { setMessage(e.message || 'Request failed') }
    finally { setBusy(false) }
  }

  const metrics = result?.decision?.metrics
  return <main style={{maxWidth:1100,margin:'40px auto',padding:24}}>
    <p>MYOS / DECISION CENTER</p>
    <h1>Engineering Decision Center</h1>
    <p>Analyze project state, detect risks, propose the best next actions, then execute only safe reversible actions.</p>
    <div className="card" style={{marginTop:24}}>
      <h2>{project?.project?.name || 'Loading project…'}</h2>
      <select value={mode} onChange={e=>setMode(e.target.value)} disabled={busy}>
        <option value="analyze">Analyze</option>
        <option value="repair">Repair safe data/actions</option>
        <option value="execute">Execute safe actions</option>
      </select>{' '}
      <button onClick={run} disabled={busy || !project?.project?.id}>{busy ? 'Running…' : 'Run Decision Engine'}</button>
      {message && <p>{message}</p>}
    </div>
    {metrics && <div className="grid main-grid" style={{marginTop:16}}>{[
      ['BOQ', metrics.boq_items], ['Missing Rates', metrics.missing_rates], ['Procurement Pending', metrics.pending_procurement], ['Open Issues', metrics.open_issues], ['Open RFIs', metrics.open_rfis], ['Active Jobs', metrics.active_jobs], ['Revised Drawings', metrics.revised_drawings], ['Price Risks', metrics.price_risks]
    ].map(([k,v])=><div className="card" key={String(k)}><h3>{k}</h3><strong>{String(v)}</strong></div>)}</div>}
    {result?.decision?.next_action && <div className="card" style={{marginTop:16}}><h2>Next Best Action</h2><h3>{result.decision.next_action.title}</h3><p>{result.decision.next_action.rationale}</p><p><b>Priority:</b> {result.decision.next_action.priority}</p></div>}
    {result?.decision?.actions?.length > 0 && <div className="card" style={{marginTop:16}}><h2>Decision Queue</h2>{result.decision.actions.slice(0,20).map((a:any,i:number)=><p key={a.id || i}><b>{i+1}. {a.title}</b> — {a.priority}<br/>{a.rationale}</p>)}</div>}
    {result?.execution && <div className="card" style={{marginTop:16}}><h2>Execution Result</h2><p>{result.execution.count} safe task actions executed.</p></div>}
  </main>
}
