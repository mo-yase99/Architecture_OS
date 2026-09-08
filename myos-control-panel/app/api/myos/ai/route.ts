import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getMyosContext } from '@/lib/myos-context'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } }
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const message = String(body.message ?? '').trim()
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
    if (!message) return NextResponse.json({ ok: false, error: 'Message is required' }, { status: 400 })
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ ok: false, error: 'OPENAI_API_KEY is not configured' }, { status: 503 })

    let activeSessionId = sessionId
    if (!activeSessionId) {
      const { data: session, error } = await supabase.from('myos_ai_sessions').insert({ user_id: user.id, title: message.slice(0, 80) }).select('id').single()
      if (error) throw error
      activeSessionId = session.id
    }
    await supabase.from('myos_ai_messages').insert({ session_id: activeSessionId, user_id: user.id, role: 'user', content: message })

    const context = await getMyosContext(supabase, user.id)
    const system = `You are MYOS AI Core, the decision and execution layer of Mohamed Yasser's personal and professional operating system. Be practical, concise, action-oriented, and grounded in the supplied data. Connect projects, execution, learning, habits, engineering work, portfolio and content when relevant. Never invent data. When the user asks what to do next, prioritize a small number of executable actions. Current MYOS data: ${JSON.stringify(context)}`
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: process.env.MYOS_AI_MODEL || 'gpt-5.6-luna', input: [{ role: 'system', content: system }, { role: 'user', content: message }] })
    })
    const data = await response.json()
    if (!response.ok) return NextResponse.json({ ok: false, error: data?.error?.message || 'OpenAI request failed' }, { status: response.status })
    const text = data.output_text || 'No response text returned.'
    const model = data.model || process.env.MYOS_AI_MODEL || 'gpt-5.6-luna'
    await supabase.from('myos_ai_messages').insert({ session_id: activeSessionId, user_id: user.id, role: 'assistant', content: text, model })
    await supabase.from('myos_ai_sessions').update({ updated_at: new Date().toISOString() }).eq('id', activeSessionId).eq('user_id', user.id)
    return NextResponse.json({ ok: true, text, model, sessionId: activeSessionId })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'AI request failed' }, { status: 500 })
  }
}
