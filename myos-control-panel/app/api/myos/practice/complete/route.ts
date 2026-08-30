import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rating = Math.max(1, Math.min(5, Number(body.rating ?? 3)));
    const minutes = Math.max(1, Number(body.actualMinutes ?? body.estimatedMinutes ?? 30));
    const difficulty = body.difficulty ?? 'medium';
    const xp = Math.round(20 + rating * 10 + (difficulty === 'hard' ? 15 : difficulty === 'easy' ? 0 : 8));
    const confidenceDelta = rating >= 4 ? 0.08 : rating <= 2 ? -0.04 : 0.02;
    return NextResponse.json({ ok:true, result:{ xp, rating, actualMinutes:minutes, confidenceDelta, nextAction: rating >= 4 ? 'Increase challenge level or move toward a portfolio challenge.' : rating <= 2 ? 'Repeat with a smaller guided practice before advancing.' : 'Repeat once with a variation, then advance.' } });
  } catch { return NextResponse.json({ error:'Invalid completion payload' }, {status:400}); }
}
