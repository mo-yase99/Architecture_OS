import { NextResponse } from 'next/server';

const NOTION_VERSION = '2022-06-28';

type NotionPage = {
  id: string;
  properties: Record<string, any>;
};

function textFromProperty(property: any): string {
  if (!property) return '';
  if (property.title?.length) return property.title.map((x: any) => x.plain_text).join('');
  if (property.rich_text?.length) return property.rich_text.map((x: any) => x.plain_text).join('');
  if (property.select?.name) return property.select.name;
  if (property.status?.name) return property.status.name;
  return '';
}

function numberFromProperty(property: any): number | null {
  return typeof property?.number === 'number' ? property.number : null;
}

export async function GET() {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_TASKS_DATABASE_ID;

  if (!token || !databaseId) {
    return NextResponse.json({ mode: 'demo', tasks: [], message: 'Notion is not configured yet.' });
  }

  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 100 }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ mode: 'error', tasks: [], detail }, { status: response.status });
  }

  const data = await response.json();
  const tasks = (data.results as NotionPage[]).map((page) => {
    const p = page.properties;
    const titleProperty = Object.values(p).find((x: any) => x.type === 'title');
    const area = Object.values(p).find((x: any) => x.type === 'select' && ['Engineering Work', 'Shop Drawing', 'Learning', 'Portfolio', 'Content', 'Personal Brand', 'Studio', 'Personal'].includes(x.select?.name));
    const priority = Object.values(p).find((x: any) => x.type === 'select' && /^P[0-3]$/.test(x.select?.name ?? ''));
    const minutes = Object.values(p).find((x: any) => x.type === 'number' && x.number != null);
    const status = Object.values(p).find((x: any) => ['status', 'select'].includes(x.type) && ['Not started', 'In progress', 'Done'].includes(x.status?.name ?? x.select?.name));

    return {
      id: page.id,
      title: textFromProperty(titleProperty),
      area: textFromProperty(area),
      priority: textFromProperty(priority),
      minutes: numberFromProperty(minutes),
      status: textFromProperty(status),
    };
  });

  return NextResponse.json({ mode: 'notion', tasks });
}
