import type { SupabaseClient } from '@supabase/supabase-js'

const safe = async <T>(query: PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<T> => {
  try {
    const { data, error } = await query
    return error ? fallback : (data ?? fallback)
  } catch {
    return fallback
  }
}

export async function getMyosContext(supabase: SupabaseClient, userId: string) {
  const [daily, learning, skills, projects, content, portfolio, practice, engineeringActions, rfis, procurement, progress, workflow] = await Promise.all([
    safe(supabase.from('myos_daily_logs').select('log_date,available_minutes,energy,completed_tasks,total_tasks,completed_habits,total_habits,execution_score,next_action,notes').eq('user_id', userId).order('log_date', { ascending: false }).limit(30), []),
    safe(supabase.from('myos_learning_activities').select('skill,activity_type,title,actual_minutes,estimated_minutes,xp_earned,xp,deliverable,project_name,activity_date,status').eq('user_id', userId).order('activity_date', { ascending: false }).limit(40), []),
    safe(supabase.from('myos_skill_progress').select('skill,level,xp,activities_completed,portfolio_outputs,last_activity_at').eq('user_id', userId).order('xp', { ascending: false }).limit(20), []),
    safe(supabase.from('myos_projects').select('id,name,type,status,stage,start_date,due_date,description,portfolio_ready,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(20), []),
    safe(supabase.from('myos_content_items').select('id,title,content_type,platform,status,scheduled_for,published_at,performance_score,project_id').eq('user_id', userId).order('updated_at', { ascending: false }).limit(20), []),
    safe(supabase.from('myos_portfolio_items').select('id,title,category,status,platform,published_url,project_id,description').eq('user_id', userId).order('updated_at', { ascending: false }).limit(20), []),
    safe(supabase.from('myos_practice_sessions').select('id,skill,program,task,difficulty,reason,status,completed_at,created_at,project_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(20), []),
    safe(supabase.from('myos_engineering_actions').select('id,project_id,action_type,title,rationale,mode,status,payload,result,created_at,executed_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20), []),
    safe(supabase.from('project_rfis').select('id,project_id,rfi_no,subject,priority,status,due_date').eq('user_id', userId).order('created_at', { ascending: false }).limit(30), []),
    safe(supabase.from('project_procurement').select('id,project_id,item_name,quantity,unit,supplier,required_at,status,notes').eq('user_id', userId).order('created_at', { ascending: false }).limit(30), []),
    safe(supabase.from('project_progress_logs').select('id,project_id,log_date,activity,quantity,unit,percent_complete,notes').eq('user_id', userId).order('log_date', { ascending: false }).limit(30), []),
    safe(supabase.from('project_workflow_summary').select('project_id,name,files_count,open_issues,open_rfis,pending_procurement,tracked_cost').limit(20), []),
  ])
  return { daily, learning, skills, projects, content, portfolio, practice, engineeringActions, rfis, procurement, progress, workflow, generatedAt: new Date().toISOString() }
}
