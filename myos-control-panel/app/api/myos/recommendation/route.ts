import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const minutes = Number(body.minutes ?? 120);
  const energy = String(body.energy ?? 'Medium');
  const tasks = Array.isArray(body.tasks) ? body.tasks : [];

  const energyScore: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
  const score = (task: any) => {
    const priority = task.priority === 'P0' ? 40 : task.priority === 'P1' ? 30 : task.priority === 'P2' ? 20 : 10;
    const timeFit = task.minutes ? Math.max(0, 20 - Math.abs(minutes - task.minutes) / 5) : 0;
    const energyFit = task.energy ? Math.max(0, 10 - Math.abs((energyScore[task.energy] ?? 2) - (energyScore[energy] ?? 2)) * 5) : 5;
    return priority + timeFit + energyFit;
  };

  const candidates = tasks.filter((task: any) => !['Done', 'Completed'].includes(task.status));
  const recommendation = [...candidates].sort((a, b) => score(b) - score(a))[0] ?? null;

  return NextResponse.json({ recommendation, score: recommendation ? score(recommendation) : 0, criteria: { minutes, energy } });
}
