import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient(); const { data:{user} } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ok:false,error:'Unauthorized'},{status:401})
  const [myos, engineering, links] = await Promise.all([
    supabase.from('myos_projects').select('id,name,type,status,stage,description,updated_at').eq('user_id',user.id).order('updated_at',{ascending:false}),
    supabase.from('projects').select('id,name,project_code,client_name,project_type,status,location,description,start_date,target_end_date,created_at,updated_at').eq('owner_id',user.id).order('updated_at',{ascending:false}),
    supabase.from('myos_project_links').select('*').eq('user_id',user.id),
  ])
  if(myos.error||engineering.error||links.error)return NextResponse.json({ok:false,error:[myos.error,engineering.error,links.error].filter(Boolean).map((e:any)=>e.message).join('; ')},{status:400})
  return NextResponse.json({ok:true,myos_projects:myos.data??[],engineering_projects:engineering.data??[],links:links.data??[]})
}

export async function POST(req:Request){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401})
  const body=await req.json().catch(()=>({})); if(!body.myos_project_id||!body.engineering_project_id)return NextResponse.json({ok:false,error:'Both project ids are required'},{status:400})
  const [{data:mp},{data:ep}]=await Promise.all([supabase.from('myos_projects').select('id').eq('id',body.myos_project_id).eq('user_id',user.id).single(),supabase.from('projects').select('id').eq('id',body.engineering_project_id).eq('owner_id',user.id).single()])
  if(!mp||!ep)return NextResponse.json({ok:false,error:'Project ownership check failed'},{status:404})
  const {data,error}=await supabase.from('myos_project_links').upsert({user_id:user.id,myos_project_id:mp.id,engineering_project_id:ep.id,confidence:Number(body.confidence??1),match_method:String(body.match_method??'manual_or_verified')},{onConflict:'user_id,myos_project_id'}).select().single()
  if(error)return NextResponse.json({ok:false,error:error.message},{status:400}); return NextResponse.json({ok:true,link:data})
}
