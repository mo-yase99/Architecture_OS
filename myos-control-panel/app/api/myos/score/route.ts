import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tasksTotal = Math.max(Number(body.tasksTotal ?? 0), 1);
    const tasksCompleted = Math.min(Number(body.tasksCompleted ?? 0), tasksTotal);
    const habitsTotal = Math.max(Number(body.habitsTotal ?? 10), 1);
    const habitsCompleted = Math.min(Number(body.habitsCompleted ?? 0), habitsTotal);
    const taskScore = (tasksCompleted / tasksTotal) * 60;
    const habitScore = (habitsCompleted / habitsTotal) * 40;
    return NextResponse.json({ ok: true, score: Math.round(taskScore + habitScore), breakdown: { taskScore: Math.round(taskScore), habitScore: Math.round(habitScore) } });
  } catch {
    return NextResponse.json({ ok: false, detail: 'Invalid score payload' }, { status: 400 });
  }
}
