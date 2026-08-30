import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const roadmap=['3ds Max','Corona','V-Ray','Shop Drawing','Photoshop','Illustrator','Revit / BIM']

export async function POST(req:Request){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser()
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
 const body=await req.json(); const project=body.project??{}
 const text=`${project.name??''} ${project.type??''} ${project.stage??''} ${project.description??''}`.toLowerCase()
 const skills=roadmap.filter(s=>text.includes(s.toLowerCase().split(' ')[0]))
 const inferred=skills.length?skills:[project.type==='Shop Drawing'?'Shop Drawing':project.type==='Interior'?'3ds Max':'3ds Max','Corona','V-Ray']
 const portfolio=[
  'Select 5–10 strongest visuals/drawings from the project',
  'Create a before → process → final case-study sequence',
  'Document one technical detail or lesson learned'
 ]
 const content=[
  `Project breakdown: ${project.name??'current project'}`,
  'Behind the scenes: design / shop drawing / execution decision',
  'One educational architecture tip extracted from the project'
 ]
 const tasks=[
  `Define scope and next deliverable for ${project.name??'the project'}`,
  `Produce one reviewable output using ${inferred[0]}`,
  'Capture evidence for portfolio and content while working'
 ]
 return NextResponse.json({ok:true,projectId:project.id??null,recommendations:{skills:[...new Set(inferred)],tasks,portfolio,content},principle:'One real project should create execution, learning, portfolio and content outputs.'})
}
