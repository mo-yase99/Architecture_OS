import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { projectTitle, skill, activityType = 'project', deliverable = '', status = 'active' } = await request.json();
    if (!projectTitle || !skill) return NextResponse.json({ error:'projectTitle and skill are required' }, {status:400});
    return NextResponse.json({ ok:true, link:{ projectTitle, skill, activityType, deliverable, status, learningValue: activityType === 'portfolio' ? 'High' : 'Medium', recommendation: `Use ${projectTitle} as the practical environment for ${skill}; document the output so the work can improve both skill level and portfolio.` } });
  } catch { return NextResponse.json({error:'Invalid payload'},{status:400}); }
}
