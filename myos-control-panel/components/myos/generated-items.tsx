'use client'
import { useEffect, useState } from 'react'

export default function GeneratedItems({ type, title, icon }: { type: string; title: string; icon: string }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  async function load() { setLoading(true); const r = await fetch(`/api/myos/generated-items?type=${type}`); const d = await r.json(); setItems(d.items ?? []); setLoading(false) }
  useEffect(() => { load() }, [type])
  async function update(id: string, status: string) { await fetch('/api/myos/generated-items', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); load() }
  return <section className="card"><div className="card-head"><div><span className="label">{icon} {title.toUpperCase()}</span><h2>Project-linked queue</h2></div><span>{items.length}</span></div>{loading ? <p className="muted">Loading…</p> : items.length === 0 ? <p className="muted">No generated items yet. Analyze a project and add recommendations.</p> : items.map(x => <div className="task" key={x.id}><span className={x.status === 'done' ? 'check checked' : 'check'}>✓</span><div><b>{x.title}</b><small>{x.myos_projects?.name ?? 'Project'} · {x.status}</small></div><button className="mini" onClick={() => update(x.id, x.status === 'done' ? 'suggested' : 'done')}>{x.status === 'done' ? 'Reopen' : 'Complete'}</button></div>)}</section>
}
