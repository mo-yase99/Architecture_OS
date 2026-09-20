import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ControlStateValidationError,
  getCrossProjectControlContext,
} from '@/lib/control-plane/control-state'
import { MYOS_CONTROL_CONTEXT_SCOPES, type MyosControlContextScope } from '@/lib/control-plane/control-state-contract'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const params = new URL(request.url).searchParams
    const scope = (params.get('scope') ?? 'active') as MyosControlContextScope
    if (!(MYOS_CONTROL_CONTEXT_SCOPES as readonly string[]).includes(scope)) {
      return NextResponse.json({ ok: false, error: 'Invalid control-context scope' }, { status: 400 })
    }

    const projectId = params.get('projectId') ?? undefined
    const productId = params.get('productId') ?? undefined

    const context = await getCrossProjectControlContext(supabase, user.id, {
      scope,
      projectId,
      productId,
    })

    return NextResponse.json({ ok: true, context })
  } catch (error) {
    if (error instanceof ControlStateValidationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to load control context' },
      { status: 500 },
    )
  }
}
