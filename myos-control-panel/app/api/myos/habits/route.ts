import { NextResponse } from 'next/server';

const NOTION_VERSION = '2025-09-03';

function getTitle(p: any) { return p?.title?.map((x: any) => x.plain_text).join('') || p?.rich_text?.map((x: any) => x.plain_text).join('') || ''; }

export async function GET() {
  const token = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_HABITS_DATA_SOURCE_ID;
  if (!token || !dataSourceId) return NextResponse.json({ mode: 'demo', habits: ['Sleep','Wake Up','Reading','Study','Deep Work','Exercise','Water','Worship','Planning','Screen Time'] });
  try {
    const r = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, { method:'POST', headers:{Authorization:`Bearer ${token}`,'Notion-Version':NOTION_VERSION,'Content-Type':'application/json'}, body:JSON.stringify({page_size:100}), cache:'no-store' });
    const raw = await r.text(); if (!r.ok) return NextResponse.json({mode:'error',habits:[],detail:raw},{status:r.status});
    const data=JSON.parse(raw); const habits=data.results.map((x:any)=>({id:x.id,title:getTitle(Object.values(x.properties).find((p:any)=>p.type==='title')),properties:x.properties}));
    return NextResponse.json({mode:'notion',habits});
  } catch(e) { return NextResponse.json({mode:'error',habits:[],detail:e instanceof Error?e.message:'Unknown error'},{status:500}); }
}
