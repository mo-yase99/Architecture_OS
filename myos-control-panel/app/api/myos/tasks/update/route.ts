import { NextResponse } from 'next/server';

const NOTION_VERSION = '2025-09-03';

export async function POST(request: Request) {
  const token = process.env.NOTION_TOKEN;
  if (!token) return NextResponse.json({ ok: false, mode: 'demo', message: 'NOTION_TOKEN is not configured.' }, { status: 503 });

  try {
    const body = await request.json();
    const { pageId, status, actualMinutes } = body;
    if (!pageId) return NextResponse.json({ ok: false, message: 'pageId is required.' }, { status: 400 });

    const properties: Record<string, any> = {};
    if (status) properties.Status = { status: { name: status } };
    if (typeof actualMinutes === 'number') properties['Actual Minutes'] = { number: actualMinutes };

    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties }),
      cache: 'no-store'
    });
    const raw = await response.text();
    if (!response.ok) return NextResponse.json({ ok: false, detail: raw }, { status: response.status });
    return NextResponse.json({ ok: true, updated: JSON.parse(raw).id });
  } catch (error) {
    return NextResponse.json({ ok: false, detail: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
