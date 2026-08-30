import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { completedTasks = 0, totalTasks = 0, completedHabits = 0, totalHabits = 0 } = await request.json();
    const taskScore = totalTasks ? (completedTasks / totalTasks) * 60 : 0;
    const habitScore = totalHabits ? (completedHabits / totalHabits) * 40 : 0;
    return NextResponse.json({ score: Math.round(taskScore + habitScore), breakdown: { tasks: Math.round(taskScore), habits: Math.round(habitScore) } });
  } catch { return NextResponse.json({ error: 'Invalid payload' }, { status: 400 }); }
}
