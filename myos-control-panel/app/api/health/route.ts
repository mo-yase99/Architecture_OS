import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'MYOS Control Panel',
    mode: process.env.NOTION_TOKEN ? 'configured' : 'demo',
    timestamp: new Date().toISOString(),
  });
}
