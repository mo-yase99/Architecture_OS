'use client'

import { useState } from 'react'

const starters = [
  'What should I focus on today based on my MYOS data?',
  'Analyze my current bottleneck and give me the next 3 actions.',
  'Turn my current work into a learning + portfolio + content plan.',
]

export default function AICorePage() {
  const [message, setMessage] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function ask(text = message) {
    const prompt = text.trim()
    if (!prompt || loading) return
    setLoading(true)
    setError('')
    setAnswer('')
    try {
      const res = await fetch('/api/myos/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, context: { roadmap: ['3ds Max', 'Corona', 'V-Ray', 'Shop Drawing', 'Photoshop', 'Illustrator', 'Revit / BIM'] } }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'AI Core request failed')
      setAnswer(data.text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI Core request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="mark">M</span><div><b>MYOS</b><small>Control Panel</small></div></div>
        {['Today','Site OS','Work','Learning','Projects','Portfolio','Content','Habits','Finance','AI Core'].map((item) => (
          <button key={item} className={item === 'AI Core' ? 'nav active' : 'nav'} onClick={() => { if (item === 'Today') window.location.href = '/'; }}>{item}</button>
        ))}
        <div className="side-foot">AI Core · Decision Layer</div>
      </aside>
      <section className="content">
        <header className="top"><div><p className="eyebrow">MYOS INTELLIGENCE</p><h1>AI Core</h1><p className="muted">Think → Decide → Execute → Learn → Prove → Publish.</p></div></header>
        <div className="card hero">
          <span>AI DECISION LAYER</span>
          <h2>What should MYOS help you decide?</h2>
          <p className="muted">AI Core is connected to the authenticated MYOS session. It is designed to turn your context into practical next actions, not generic chat.</p>
          <div className="grid main-grid">
            {starters.map((s) => <button key={s} className="practice-box" onClick={() => { setMessage(s); ask(s) }}>{s}</button>)}
          </div>
        </div>
        <div className="card">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask MYOS anything about your work, learning, projects, execution or next decision..." rows={5} />
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button className="nav active" onClick={() => ask()} disabled={loading}>{loading ? 'Thinking…' : 'Ask AI Core'}</button>
            <button className="nav" onClick={() => { setMessage(''); setAnswer(''); setError('') }}>Clear</button>
          </div>
        </div>
        {error && <div className="card"><h3>AI Core error</h3><p className="muted">{error}</p></div>}
        {answer && <div className="card"><span className="label">🧠 DECISION</span><div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{answer}</div></div>}
      </section>
    </main>
  )
}
