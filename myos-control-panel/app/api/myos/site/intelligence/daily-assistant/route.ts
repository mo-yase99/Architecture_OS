import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const s = await createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json()
  if (!b.project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  const projectId = String(b.project_id)
  const day = new Date().toISOString().slice(0, 10)

  const [{ data: tasks }, { data: issues }, { data: rfis }, { data: procurement }, { data: jobs }, { data: progress }] = await Promise.all([
    s.from('tasks').select('id,title,status,priority,due_date').eq('project_id', projectId).in('status', ['todo', 'in_progress']).limit(50),
    s.from('site_issues').select('id,title,severity,status').eq('project_id', projectId).eq('status', 'open').limit(30),
    s.from('project_rfis').select('id,rfi_no,subject,priority,status,due_date').eq('project_id', projectId).in('status', ['open', 'pending']).limit(30),
    s.from('project_procurement').select('id,item_name,quantity,unit,required_at,status').eq('project_id', projectId).in('status', ['requested', 'pending', 'ordered']).limit(30),
    s.from('file_processing_jobs').select('id,file_name,status,progress').eq('project_id', projectId).in('status', ['queued', 'processing']).limit(10),
    s.from('project_progress_logs').select('id,activity,percent_complete,log_date').eq('project_id', projectId).order('log_date', { ascending: false }).limit(10),
  ])

  const checklist = [
    'Review today’s planned activities and highest-priority task',
    'Check overdue and due-today tasks',
    'Review drawing/revision changes before execution',
    'Check open site issues and RFIs',
    'Check material availability and procurement due dates',
    'Record quantities executed today with evidence',
    'Update progress and cost-related records',
    'Finish any active file-intelligence jobs',
    'Prepare tomorrow lookahead and blockers',
  ]

  const urgent = [
    ...(tasks || []).filter((x: any) => x.priority === 'critical' || x.priority === 'high').map((x: any) => `Task: ${x.title}`),
    ...(issues || []).filter((x: any) => x.severity === 'critical' || x.severity === 'high').map((x: any) => `Issue: ${x.title}`),
    ...(rfis || []).filter((x: any) => x.priority === 'critical' || x.priority === 'high').map((x: any) => `RFI: ${x.subject}`),
  ].slice(0, 8)

  const nextAction = jobs?.length ? `Finish file processing: ${jobs[0].file_name}` : urgent[0] || tasks?.[0]?.title || 'Review project plan and define the next executable task'
  const recommendation = `Daily engineering control for ${day}. Prioritize blockers, then execution, then documentation.`

  const { data, error } = await s.from('ai_recommendations').insert({
    user_id: user.id,
    project_id: projectId,
    recommendation_type: 'daily_site_assistant',
    title: `Daily engineering assistant — ${day}`,
    recommendation,
    priority: urgent.length ? 'high' : 'medium',
    confidence: .9,
    action: nextAction,
    source_refs: { date: day, checklist, urgent, context: { tasks: tasks?.length || 0, issues: issues?.length || 0, rfis: rfis?.length || 0, procurement: procurement?.length || 0, active_jobs: jobs?.length || 0, recent_progress: progress?.length || 0 } },
    status: 'new',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ id: data.id, date: day, next_action: nextAction, checklist, urgent, context: { open_tasks: tasks?.length || 0, open_issues: issues?.length || 0, open_rfis: rfis?.length || 0, pending_procurement: procurement?.length || 0, active_jobs: jobs?.length || 0 } })
}
