import { NextResponse } from 'next/server';

const weights = { practice: 1, project: 2, portfolio: 3 } as const;
const skills = ['3ds Max','Corona','V-Ray','Shop Drawing','Photoshop','Illustrator','Revit / BIM'];

export async function POST(request: Request) {
  try {
    const { skill, xp = 0, activityType = 'practice', rating = 3, previousXp = 0 } = await request.json();
    if (!skills.includes(skill)) return NextResponse.json({ error: 'Unknown skill' }, { status: 400 });
    const multiplier = weights[activityType as keyof typeof weights] ?? 1;
    const earned = Math.max(0, Math.round(Number(xp) * multiplier * (Number(rating) >= 4 ? 1.15 : Number(rating) <= 2 ? 0.85 : 1)));
    const totalXp = Math.max(0, Number(previousXp) + earned);
    const level = Math.min(10, Math.floor(totalXp / 100) + 1);
    const progress = Math.min(100, totalXp % 100);
    const nextActivity = rating >= 4 ? (activityType === 'practice' ? 'project' : activityType === 'project' ? 'portfolio' : 'advanced portfolio') : 'guided practice variation';
    return NextResponse.json({ ok:true, skill, earnedXp:earned, totalXp, level, progress, nextActivity });
  } catch { return NextResponse.json({ error:'Invalid payload' }, { status:400}); }
}
