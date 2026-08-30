import { NextResponse } from 'next/server';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getRows(path: string) {
  if (!url || !key) return { rows: [], configured: false };
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!r.ok) throw new Error(await r.text());
  return { rows: await r.json(), configured: true };
}

export async function GET(req: Request) {
  try {
    const days = Math.min(30, Math.max(1, Number(new URL(req.url).searchParams.get('days') ?? 7)));
    const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
    const [daily, habits, activities] = await Promise.all([
      getRows(`myos_daily_logs?select=*&log_date=gte.${from}&order=log_date.asc`),
      getRows(`myos_habit_logs?select=*&log_date=gte.${from}&order=log_date.asc`),
      getRows(`myos_learning_activities?select=*&activity_date=gte.${from}&order=activity_date.asc`),
    ]);
    if (!daily.configured) return NextResponse.json({ ok: false, mode: 'not_configured', days: [] });
    return NextResponse.json({ ok: true, days, data: { daily: daily.rows, habits: habits.rows, activities: activities.rows } });
  } catch (e) {
    return NextResponse.json({ ok: false, mode: 'error', detail: e instanceof Error ? e.message : 'Analytics data unavailable' }, { status: 500 });
  }
}
