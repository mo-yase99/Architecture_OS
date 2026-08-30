'use client';

import { useMemo, useState } from 'react';

const actions = [
  { title: '3ds Max Practice', area: 'Learning', mins: 90, priority: 'P0', energy: 'High', done: false },
  { title: 'Shop Drawing — Real Project', area: 'Shop Drawing', mins: 60, priority: 'P0', energy: 'High', done: false },
  { title: 'Advance Current Portfolio Project', area: 'Portfolio', mins: 60, priority: 'P1', energy: 'Medium', done: false },
  { title: 'Create / Finish One Content Asset', area: 'Content', mins: 45, priority: 'P1', energy: 'Medium', done: false },
  { title: 'Personal Brand Authority Asset', area: 'Personal Brand', mins: 30, priority: 'P2', energy: 'Low', done: false },
];

const habits = ['Sleep', 'Wake Up', 'Reading', 'Study', 'Deep Work', 'Exercise', 'Water', 'Worship', 'Planning', 'Screen Time'];

export default function Home() {
  const [tab, setTab] = useState('Today');
  const [completed, setCompleted] = useState<string[]>([]);
  const [energy, setEnergy] = useState('Medium');
  const [minutes, setMinutes] = useState(120);
  const [habitDone, setHabitDone] = useState<string[]>([]);

  const nextAction = useMemo(() => actions.find(a => !completed.includes(a.title) && a.mins <= minutes) ?? actions.find(a => !completed.includes(a.title)), [completed, minutes]);
  const score = Math.round(((completed.length / actions.length) * 60) + ((habitDone.length / habits.length) * 40));

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="mark">M</span><div><b>MYOS</b><small>Control Panel</small></div></div>
        {['Today','Work','Learning','Portfolio','Content','Habits','Finance','AI Core'].map(x => <button key={x} className={tab===x?'nav active':'nav'} onClick={()=>setTab(x)}>{x}</button>)}
        <div className="side-foot">3D First · v1.0</div>
      </aside>

      <section className="content">
        <header className="top"><div><p className="eyebrow">SUNDAY · AUGUST 30, 2026</p><h1>{tab === 'Today' ? 'Good morning, Mohamed.' : tab}</h1><p className="muted">Your personal operating system. One day, one clear next action.</p></div><div className="controls"><label>Energy<select value={energy} onChange={e=>setEnergy(e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label><label>Time<select value={minutes} onChange={e=>setMinutes(Number(e.target.value))}><option value={60}>60m</option><option value={120}>2h</option><option value={180}>3h</option><option value={240}>4h</option></select></label></div></header>

        <div className="grid metrics"><div className="card hero"><span>EXECUTION SCORE</span><strong>{score}%</strong><p>Updates from tasks + habits.</p></div><div className="card"><span>TODAY'S TIME</span><strong>{minutes}m</strong><p>Available focus window</p></div><div className="card"><span>LEARNING</span><strong>3D FIRST</strong><p>3ds Max → Corona → V-Ray</p></div><div className="card"><span>ACTIVE WORK</span><strong>3</strong><p>Work · Portfolio · Content</p></div></div>

        <div className="grid main-grid">
          <div className="card next"><div className="card-head"><div><span className="label">⚡ NEXT BEST ACTION</span><h2>{nextAction?.title}</h2></div><span className="pill">{nextAction?.mins} min</span></div><p>{nextAction?.area} · {nextAction?.energy} energy · {nextAction?.priority}</p><button className="primary" onClick={()=>nextAction && !completed.includes(nextAction.title) && setCompleted([...completed,nextAction.title])}>{nextAction && completed.includes(nextAction.title) ? 'Completed ✓' : 'Start / Complete'}</button></div>
          <div className="card"><div className="card-head"><span className="label">🎯 TODAY</span><span>{completed.length}/{actions.length}</span></div>{actions.map(a=><button className="task" key={a.title} onClick={()=>setCompleted(completed.includes(a.title)?completed.filter(x=>x!==a.title):[...completed,a.title])}><span className={completed.includes(a.title)?'check checked':'check'}>✓</span><div><b>{a.title}</b><small>{a.area} · {a.mins}m</small></div><em>{a.priority}</em></button>)}</div>
          <div className="card"><div className="card-head"><span className="label">🔁 HABITS</span><span>{habitDone.length}/{habits.length}</span></div>{habits.map(h=><button className="habit" key={h} onClick={()=>setHabitDone(habitDone.includes(h)?habitDone.filter(x=>x!==h):[...habitDone,h])}><span className={habitDone.includes(h)?'check checked':'check'}>✓</span>{h}</button>)}</div>
          <div className="card roadmap"><span className="label">🎓 LEARNING ROADMAP</span><div className="road"><b>01</b><div><strong>3ds Max</strong><small>Primary · In Progress</small></div><span>→</span></div><div className="road"><b>02</b><div><strong>Corona</strong><small>Next · Rendering</small></div><span>→</span></div><div className="road"><b>03</b><div><strong>V-Ray</strong><small>Next · Rendering</small></div><span>→</span></div><div className="locked"><b>🔒 Revit / BIM</b><span>Unlock after 3D Gate</span></div></div>
        </div>
      </section>
    </main>
  );
}
