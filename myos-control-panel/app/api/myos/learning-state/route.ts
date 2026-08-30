import { NextResponse } from 'next/server';

const gates = [
  { skill:'3ds Max', minLevel:1, status:'active' },
  { skill:'Corona', minLevel:2, requires:['3ds Max'] },
  { skill:'V-Ray', minLevel:3, requires:['3ds Max'] },
  { skill:'Shop Drawing', minLevel:1, requires:['AutoCAD'] },
  { skill:'Photoshop', minLevel:1, requires:['3ds Max'] },
  { skill:'Illustrator', minLevel:1 },
  { skill:'Revit / BIM', minLevel:4, requires:['3ds Max','Shop Drawing'] },
];

export async function POST(request: Request) {
  try {
    const { skillLevels = {}, activities = [] } = await request.json();
    const result = gates.map(g => {
      const level = Number(skillLevels[g.skill] ?? 0);
      const requirementsMet = (g.requires ?? []).every((r:string) => Number(skillLevels[r] ?? 0) >= 1);
      const unlocked = level >= g.minLevel || (level === 0 && requirementsMet && g.skill === '3ds Max');
      const activityCount = activities.filter((a:any)=>a.skill===g.skill).length;
      return { ...g, level, unlocked, activityCount, progress: Math.min(100, Math.round((level / 5) * 100)) };
    });
    const current = result.find(x=>x.unlocked && x.progress < 100) ?? result.find(x=>x.unlocked) ?? result[0];
    return NextResponse.json({ ok:true, currentSkill:current.skill, roadmap:result, gatePolicy:'3D-first: Revit/BIM remains a support skill until the required 3D + Shop Drawing foundation is established.' });
  } catch { return NextResponse.json({error:'Invalid learning state payload'},{status:400}); }
}
