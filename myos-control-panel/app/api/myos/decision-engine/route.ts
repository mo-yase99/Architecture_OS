import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getMyosContext } from '@/lib/myos-context'

function parseJson(text: string) {
  try { return JSON.parse(text) } catch {}
  const match = text.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  return null
}

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } }
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ ok: false, error: 'OPENAI_API_KEY is not configured' }, { status: 503 })

    const context = await getMyosContext(supabase, user.id)
    const prompt = `You are MYOS Decision Engine. Analyze the user's current operating system data and produce one practical decision for today. Connect execution, learning, engineering work, portfolio and content. Do not invent facts. If data is missing, say so. Return ONLY valid JSON with this exact shape: {"title":"","summary":"","bottleneck":"","focus":"","actions":[{"title":"","why":"","minutes":30,"priority":"P0"}],"learning_action":{"skill":"","task":"","minutes":30},"portfolio_action":{"title":"","proof":""},"content_action":{"title":"","platform":"","angle":""},"risks":[]}. Keep actions to 3-5. Context: ${JSON.stringify(context)}`

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.MYOS_AI_MODEL || 'gpt-5.6-luna', input: prompt })
    })
    const data = await response.json()
    if (!response.ok) return NextResponse.json({ ok: false, error: data?.error?.message || 'OpenAI request failed' }, { status: response.status })
    const decision = parseJson(data.output_text || '')
    if (!decision) return NextResponse.json({ ok: false, error: 'Decision engine returned invalid JSON' }, { status: 502 })

    const row = {
      user_id: user.id, title: String(decision.title || 'Today’s MYOS Decision'), summary: String(decision.summary || ''),
      bottleneck: String(decision.bottleneck || ''), focus: String(decision.focus || ''), actions: decision.actions || [],
      learning_action: decision.learning_action || {}, portfolio_action: decision.portfolio_action || {},
      content_action: decision.content_action || {}, risks: decision.risks || [],
      context_snapshot: context, model: data.model || process.env.MYOS_AI_MODEL || 'gpt-5.6-luna'
    }
    const { data: saved, error } = await supabase.from('myos_ai_decisions').insert(row).select('*').single()
    if (error) throw error
    return NextResponse.json({ ok: true, decision: saved })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Decision engine failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } }
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const { data, error } = await supabase.from('myos_ai_decisions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
    if (error) throw error
    return NextResponse.json({ ok: true, decisions: data || [] })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to load decisions' }, { status: 500 })
  }
}
