import type { SupabaseClient } from '@supabase/supabase-js'
import type { CanonicalProduct, MyosProductCode, RegistryOwnership } from './registry-contract'

export type ProductRegistryRow = {
  id: string
  code: MyosProductCode
  name: string
  type: string
  status: string
  description: string | null
  owner: RegistryOwnership
  primary_domain: string | null
  repository_reference: string | null
  database_reference: string | null
  deployment_reference: string | null
  created_at: string
  updated_at: string
}

export async function listCanonicalProducts(supabase: SupabaseClient): Promise<CanonicalProduct[]> {
  const { data, error } = await supabase
    .from('myos_products')
    .select('id,code,name,type,status,description,owner,primary_domain,repository_reference,database_reference,deployment_reference,created_at,updated_at')
    .order('code', { ascending: true })

  if (error) throw error

  return ((data ?? []) as ProductRegistryRow[]).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    status: row.status,
    description: row.description,
    owner: row.owner,
    primaryDomain: row.primary_domain,
    repositoryReference: row.repository_reference,
    databaseReference: row.database_reference,
    deploymentReference: row.deployment_reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}
