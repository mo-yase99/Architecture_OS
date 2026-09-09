import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listCanonicalProducts } from '@/lib/control-plane/products'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const products = await listCanonicalProducts(supabase)
    return NextResponse.json({ ok: true, products })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to load product registry' },
      { status: 500 },
    )
  }
}
