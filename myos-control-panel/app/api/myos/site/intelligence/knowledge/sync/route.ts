import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'

export async function POST(req:Request){
 const s=await createClient(); const {data:{user}}=await s.auth.getUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
 const b=await req.json(); const projectId=b.project_id;
 if(!projectId)return NextResponse.json({error:'project_id required'},{status:400})
 const [{data:files},{data:drawings},{data:tasks},{data:materials},{data:issues},{data:rfis},{data:procurement},{data:progress},{data:reports}]=await Promise.all([
  s.from('project_file_assets').select('id,name,file_type,discipline,document_type,revision,status,extracted_metadata').eq('project_id',projectId).limit(100),
  s.from('drawing_revisions').select('id,drawing_number,title,discipline,revision,status,change_summary').eq('project_id',projectId).limit(100),
  s.from('tasks').select('id,title,status,priority,due_date,notes').eq('project_id',projectId).limit(100),
  s.from('materials').select('id,name,category,unit,default_rate,supplier').limit(100),
  s.from('site_issues').select('id,issue_code,title,issue_type,severity,status,location,drawing_reference,description,proposed_action,rfi_required').eq('project_id',projectId).limit(100),
  s.from('project_rfis').select('id,rfi_no,subject,priority,status,due_date,drawing_refs,response').eq('project_id',projectId).limit(100),
  s.from('project_procurement').select('id,item_name,quantity,unit,supplier,required_at,status').eq('project_id',projectId).limit(100),
  s.from('project_progress_logs').select('id,log_date,activity,quantity,unit,percent_complete,notes').eq('project_id',projectId).limit(100),
  s.from('site_daily_reports').select('id,report_date,activities,materials_received,inspections,issues,ai_summary,notes').eq('project_id',projectId).limit(30)
 ])
 const nodes:any[]=[]; const nodeMap=new Map<string,string>();
 const push=(type:string,title:string,content:any,sourceType:string,sourceId:string,confidence=0.9)=>{nodes.push({user_id:user.id,project_id:projectId,node_type:type,title,content,source_type:sourceType,source_id:sourceId,confidence})}
 for(const x of files||[])push('file',x.name,x,'file',x.id,.95)
 for(const x of drawings||[])push('drawing',`${x.drawing_number||'Drawing'} ${x.revision||''}`.trim(),x,'drawing',x.id,.95)
 for(const x of tasks||[])push('task',x.title,x,'task',x.id,.9)
 for(const x of issues||[])push('issue',x.title,x,'issue',x.id,.9)
 for(const x of rfis||[])push('rfi',x.subject,x,'rfi',x.id,.9)
 for(const x of procurement||[])push('procurement',x.item_name,x,'procurement',x.id,.85)
 for(const x of progress||[])push('progress',x.activity,x,'progress',x.id,.85)
 for(const x of reports||[])push('daily_report',`Daily report ${x.report_date}`,x,'daily_report',x.id,.85)
 const {data:existing,error:readError}=await s.from('knowledge_nodes').select('id,node_type,source_id').eq('project_id',projectId).eq('user_id',user.id).limit(1000)
 if(readError)return NextResponse.json({error:readError.message},{status:400})
 for(const x of existing||[])if(x.source_id)nodeMap.set(`${x.node_type}:${x.source_id}`,x.id)
 const inserted:any[]=[]
 for(const n of nodes){const key=`${n.node_type}:${n.source_id}`; if(nodeMap.has(key))continue; const {data,error}=await s.from('knowledge_nodes').insert(n).select('id,node_type,source_id').single(); if(error)return NextResponse.json({error:error.message},{status:400}); nodeMap.set(key,data.id); inserted.push(data)}
 const edges:any[]=[]
 for(const x of issues||[]){const issue=nodeMap.get(`issue:${x.id}`); if(x.drawing_reference){const drawing=(drawings||[]).find((d:any)=>d.drawing_number===x.drawing_reference); const to=drawing&&nodeMap.get(`drawing:${drawing.id}`); if(issue&&to)edges.push({user_id:user.id,project_id:projectId,from_node_id:issue,to_node_id:to,edge_type:'references_drawing',confidence:.9})}}
 for(const x of rfis||[]){const rfi=nodeMap.get(`rfi:${x.id}`); for(const ref of (Array.isArray(x.drawing_refs)?x.drawing_refs:[])){const drawing=(drawings||[]).find((d:any)=>d.drawing_number===ref); const to=drawing&&nodeMap.get(`drawing:${drawing.id}`); if(rfi&&to)edges.push({user_id:user.id,project_id:projectId,from_node_id:rfi,to_node_id:to,edge_type:'references_drawing',confidence:.9})}}
 if(edges.length){await s.from('knowledge_edges').delete().eq('project_id',projectId).eq('user_id',user.id); const {error}=await s.from('knowledge_edges').insert(edges); if(error)return NextResponse.json({error:error.message},{status:400})}
 const summary={files:files?.length||0,drawings:drawings?.length||0,tasks:tasks?.length||0,issues:issues?.length||0,rfis:rfis?.length||0,procurement:procurement?.length||0,progress:progress?.length||0,reports:reports?.length||0,nodes:nodes.length,inserted_nodes:inserted.length,edges:edges.length,materials:materials?.length||0}
 return NextResponse.json({project_id:projectId,summary,context:{files,drawings,tasks,materials,issues,rfis,procurement,progress,reports}})
}