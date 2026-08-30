'use client';

import { useEffect, useMemo, useState } from 'react';

const demoActions = [
  { id: 'demo-1', title: '3ds Max Practice', area: 'Learning', mins: 90, priority: 'P0', energy: 'High', status: 'Not started' },
  { id: 'demo-2', title: 'Shop Drawing — Real Project', area: 'Shop Drawing', mins: 60, priority: 'P0', energy: 'High', status: 'Not started' },
  { id: 'demo-3', title: 'Advance Current Portfolio Project', area: 'Portfolio', mins: 60, priority: 'P1', energy: 'Medium', status: 'Not started' },
  { id: 'demo-4', title: 'Create / Finish One Content Asset', area: 'Content', mins: 45, priority: 'P1', energy: 'Medium', status: 'Not started' },
  { id: 'demo-5', title: 'Personal Brand Authority Asset', area: 'Personal Brand', mins: 30, priority: 'P2', energy: 'Low', status: 'Not started' },
];
const habits = ['Sleep', 'Wake Up', 'Reading', 'Study', 'Deep Work', 'Exercise', 'Water', 'Worship', 'Planning', 'Screen Time'];

export default function Home() {
  const [tab, setTab] = useState('Today');
  const [tasks, setTasks] = useState<any[]>(demoActions);
  const [energy, setEnergy] = useState('Medium');
  const [minutes, setMinutes] = useState(120);
  const [habitDone, setHabitDone] = useState<string[]>([]);
  const [mode, setMode] = useState<'demo' | 'notion' | 'error'>('demo');
  const [recommendation, setRecommendation] = useState<any>(null);

  useEffect(() => {
    fetch('/api/myos/tasks').then(r => r.json()).then(data => {
      if (data.mode === 'notion' && Array.isArray(data.tasks)) { setTasks(data.tasks.map((t: any) => ({ ...t, mins: t.minutes ?? 30, energy: 'Medium' }))); setMode('notion'); }
    }).catch(() => setMode('error'));
  }, []);

  useEffect(() => {
    fetch('/api/myos/recommendation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes, energy, tasks }) })
      .then(r => r.json()).then(data => setRecommendation(data.recommendation ?? null)).catch(() => setRecommendation(null));
  }, [minutes, energy, tasks]);

  const completed = tasks.filter(t => ['Done', 'Completed'].includes(t.status)).length;
  const nextAction = recommendation ?? tasks.find(t => !['Done', 'Completed'].includes(t.status) && (t.mins ?? t.minutes ?? 0) <= minutes) ?? tasks.find(t => !['Done', 'Completed'].includes(t.status));
  const score = Math.round(((completed / Math.max(tasks.length, 1)) * 60) + ((habitDone.length / habits.length) * 40));

  const toggleTask = (task: any) => setTasks(current => current.map(t => t.id === task.id ? { ...t, status: ['Done', 'Completed'].includes(t.status) ? 'Not started' : 'Done' } : t));

  return (
    <main className="shell">
      <aside className="sidebar"><div className="brand"><span className="mark">M</span><div><b>MYOS</b><small>Control Panel</small></div></div>{['Today','Work','Learning','Portfolio','Content','Habits','Finance','AI Core'].map(x => <button key={x} className={tab===x?'nav active':'nav'} onClick={()=>setTab(x)}>{x}</button>)}<div className="side-foot">3D First · v1.1</div></aside>
      <section className="content">
        <header className="top"><div><p className="eyebrow">SUNDAY · AUGUST 30, 2026</p><h1>{tab === 'Today' ? 'Good morning, Mohamed.' : tab}</h1><p className="muted">Your personal operating system. One day, one clear next action.</p></div><div className="controls"><label>Energy<select value={energy} onChange={e=>setEnergy(e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label><label>Time<select value={minutes} onChange={e=>setMinutes(Number(e.target.value))}><option value={60}>60m</option><option value={120}>2h</option><option value={180}>3h</option><option value={240}>4h</option></select></label></div></header>
        <div className="grid metrics"><div className="card hero"><span>EXECUTION SCORE</span><strong>{score}%</strong><p>{mode === 'notion' ? 'Live from Notion tasks.' : mode === 'error' ? 'Integration check needed.' : 'Demo mode — connect Notion for live data.'}</p></div><div className="card"><span>TODAY'S TIME</span><strong>{minutes}m</strong><p>Available focus window</p></div><div className="card"><span>LEARNING</span><strong>3D FIRST</strong><p>3ds Max → Corona → V-Ray</p></div><div className="card"><span>ACTIVE WORK</span><strong>{tasks.filter(t => t.area !== 'Learning').length}</strong><p>Work · Portfolio · Content</p></div></div>
        <div className="grid main-grid">
          <div className="card next"><div className="card-head"><div><span className="label">⚡ NEXT BEST ACTION</span><h2>{nextAction?.title ?? 'No action available'}</h2></div><span className="pill">{nextAction?.mins ?? nextAction?.minutes ?? 0} min</span></div><p>{nextAction?.area ?? '—'} · {nextAction?.energy ?? energy} energy · {nextAction?.priority ?? '—'}</p><button className="primary" onClick={()=>nextAction && toggleTask(nextAction)}>{nextAction && ['Done','Completed'].includes(nextAction.status) ? 'Completed ✓' : 'Start / Complete'}</button></div>
          <div className="card"><div className="card-head"><span className="label">🎯 TODAY</span><span>{completed}/{tasks.length}</span></div>{tasks.map(a=><button className="task" key={a.id} onClick={()=>toggleTask(a)}><span className={['Done','Completed'].includes(a.status)?'check checked':'check'}>✓</span><div><b>{a.title}</b><small>{a.area} · {a.mins ?? a.minutes ?? 0}m</small></div><em>{a.priority}</em></button>)}</div>
          <div className="card"><div className="card-head"><span className="label">🔁 HABITS</span><span>{habitDone.length}/{habits.length}</span></div>{habits.map(h=><button className="habit" key={h} onClick={()=>setHabitDone(habitDone.includes(h)?habitDone.filter(x=>x!==h):[...habitDone,h])}><span className={habitDone.includes(h)?'check checked':'check'}>✓</span>{h}</button>)}</div>
          <div className="card roadmap"><span className="label">🎓 LEARNING ROADMAP</span><div className="road"><b>01</b><div><strong>3ds Max</strong><small>Primary · In Progress</small></div><span>→</span></div><div className="road"><b>02</b><div><strong>Corona</strong><small>Next · Rendering</small></div><span>→</span></div><div className="road"><b>03</b><div><strong>V-Ray</strong><small>Next · Rendering</small></div><span>→</span></div><div className="locked"><b>🔒 Revit / BIM</b><span>Unlock after 3D Gate</span></div></div>
        </div>
      </section>
    </main>
  );
}
