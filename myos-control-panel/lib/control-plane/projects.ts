import type { SupabaseClient } from '@supabase/supabase-js'
import type { CanonicalMyosProject } from './registry-contract'

type MyosProjectRow = {
  id: string
  product_id: string | null
  project_code: string | null
  name: string
  type: string | null
  status: string
  description: string | null
  created_at: string
  updated_at: string
}

type ProjectLinkRow = {
  myos_project_id: string
  engineering_project_id: string
}

/**
 * Returns only MYOS projects that have the explicit fields required by the
 * canonical control-plane contract. Existing operational project consumers
 * continue to use the original myos_projects API and schema shape.
 */
export async function listCanonicalMyosProjects(
  supabase: SupabaseClient,
  userId: string,
): Promise<CanonicalMyosProject[]> {
  const { data, error } = await supabase
    .from('myos_projects')
    .select('id,product_id,project_code,name,type,status,description,created_at,updated_at')
    .eq('user_id', userId)
    .not('product_id', 'is', null)
    .not('project_code', 'is', null)
    .order('updated_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as MyosProjectRow[]
  if (rows.length === 0) return []

  const projectIds = rows.map((row) => row.id)
  const { data: linkData, error: linkError } = await supabase
    .from('myos_project_links')
    .select('myos_project_id,engineering_project_id')
    .eq('user_id', userId)
    .in('myos_project_id', projectIds)

  if (linkError) throw linkError

  const links = (linkData ?? []) as ProjectLinkRow[]
  const domainReferenceByProject = new Map(
    links.map((link) => [link.myos_project_id, link.engineering_project_id]),
  )

  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id as string,
    projectCode: row.project_code as string,
    name: row.name,
    status: row.status,
    projectType: row.type,
    owner: 'MYOS',
    description: row.description,
    domainReference: domainReferenceByProject.get(row.id) ?? null,
    isActive: row.status === 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}
