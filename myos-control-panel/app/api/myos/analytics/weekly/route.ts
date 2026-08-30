import { NextResponse } from 'next/server';
export async function POST(req:Request){try{const b=await req.json();const r=await fetch(new URL('/api/myos/analytics',req.url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});return NextResponse.json(await r.json(),{status:r.status})}catch{return NextResponse.json({error:'Analytics unavailable'},{status:500})}}
