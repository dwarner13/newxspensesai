type Msg = { role:'system'|'user'|'assistant'; content:string }

// rough tokens ≈ chars/4
const TOKENS = (s:string) => Math.ceil((s?.length || 0) / 4)

export type BuiltContext = {
  system: Msg[]
  history: Msg[]
  overLimit: boolean
}

export function buildContext({
  systemPrompts,
  recalls,
  messages,
  maxTokens = 6000,       // total budget (gpt-4o-mini supports 128k, but we keep it reasonable)
  reserveForAnswer = 1500  // leave room for model output
}: {
  systemPrompts: string[]
  recalls: string[]
  messages: Msg[]
  maxTokens?: number
  reserveForAnswer?: number
}): BuiltContext {
  const system: Msg[] = systemPrompts.map(p => ({ role:'system', content:p }))
  const recallMsgs: Msg[] = recalls.map(t => ({ role:'system', content:`Relevant memory: ${t}` }))

  // Start from the end (most recent first), add until budget is nearly full
  const budget = maxTokens - TOKENS(JSON.stringify(system)) - TOKENS(JSON.stringify(recallMsgs)) - reserveForAnswer
  const reversed = [...messages].reverse()
  const kept: Msg[] = []
  let used = 0

  for (const m of reversed) {
    const t = TOKENS(m.content)
    if (used + t > budget) break
    kept.push(m)
    used += t
  }

  return {
    system,
    history: [...recallMsgs, ...kept.reverse()],
    overLimit: kept.length < messages.length
  }
}




