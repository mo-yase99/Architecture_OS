import { NextResponse } from 'next/server';

// Phase 2 foundation: accepts a daily execution check-in.
// Persistence is enabled when a dedicated MYOS log data source is configured.
const NOTION_VERSION = '2025-09-03';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const date = body.date || new Date().toISOString().slice(0, 10);
    const score = Number(body.score ?? 0);
    const habitsCompleted = Number(body.habitsCompleted ?? 0);
    const tasksCompleted = Number(body.tasksCompleted ?? 0);
    const actualMinutes = Number(body.actualMinutes ?? 0);

    const token = process.env.NOTION_TOKEN;
    const logDataSourceId = process.env.NOTION_DAILY_LOG_DATA_SOURCE_ID;

    if (!token || !logDataSourceId) {
      return NextResponse.json({ ok: true, mode: 'local', checkin: { date, score, habitsCompleted, tasksCompleted, actualMinutes } });
    }

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent: { data_source_id: logDataSourceId }, properties: {} })
    });

    if (!response.ok) return NextResponse.json({ ok: false, mode: 'notion', detail: await response.text() }, { status: response.status });
    return NextResponse.json({ ok: true, mode: 'notion', checkin: { date, score, habitsCompleted, tasksCompleted, actualMinutes } });
  } catch (error) {
    return NextResponse.json({ ok: false, detail: error instanceof Error ? error.message : 'Invalid request' }, { status: 400 });
  }
}
