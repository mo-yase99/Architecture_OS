import { NextResponse } from 'next/server';
import { getEligibleSkills, learningRoadmap } from '@/lib/learning-roadmap';

const priorityWeight: Record<string, number> = { P0: 100, P1: 70, P2: 40, P3: 20 };

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const minutes = Number(body.minutes ?? 60);
    const energy = body.energy ?? 'Medium';
    const completedTaskTitles: string[] = Array.isArray(body.completedTaskTitles) ? body.completedTaskTitles : [];
    const learnedSkillIds: string[] = Array.isArray(body.learnedSkillIds) ? body.learnedSkillIds : [];
    const recentTaskAreas: string[] = Array.isArray(body.recentTaskAreas) ? body.recentTaskAreas : [];

    const eligible = getEligibleSkills().filter(s => !learnedSkillIds.includes(s.id));
    const scored = eligible.map(skill => {
      let score = Math.max(0, 100 - skill.stage * 3);
      if (skill.status === 'in-progress') score += 45;
      if (recentTaskAreas.some(a => a.toLowerCase().includes(skill.name.toLowerCase()) || skill.name.toLowerCase().includes(a.toLowerCase()))) score += 35;
      if (skill.id === 'shop-drawing' && recentTaskAreas.some(a => a.toLowerCase().includes('portfolio') || a.toLowerCase().includes('work'))) score += 20;
      if (minutes < 35) score += skill.practice.some(p => p.length < 55) ? 10 : -10;
      if (energy === 'Low' && skill.role === 'primary') score -= 8;
      return { skill, score };
    }).sort((a,b)=>b.score-a.score);
    const chosen = scored[0]?.skill ?? learningRoadmap[0];
    const candidates = chosen.practice.map((task, index) => ({
      id: `${chosen.id}-${index + 1}`,
      title: task,
      skill: chosen.name,
      roadmapStage: chosen.stage,
      estimatedMinutes: index === 0 ? Math.min(minutes, 30) : Math.min(minutes, 45),
      reason: index === 0 ? 'Highest-value practice for your current roadmap stage.' : 'Reinforces the skill through a practical deliverable.'
    }));
    const selected = candidates[(completedTaskTitles.length + learnedSkillIds.length) % candidates.length];
    return NextResponse.json({ mode:'rule-based-v1', recommendation:selected, skill:chosen, analysis:{minutes,energy,consideredSkills:scored.slice(0,5).map(x=>({id:x.skill.id,name:x.skill.name,score:x.score})), learnedSkillIds, recentTaskAreas} });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request' }, { status:400 });
  }
}
