type Msg = { role: 'system'|'user'|'assistant'; content: string }

const PROMPTS: Record<string, string> = {
  'prime-boss': 'You are Prime, the boss. Decide if you can answer or delegate. Be concise and give next steps. Max 2-3 sentences.',
  'crystal-analytics': 'You analyze spending patterns, produce simple charts (describe them), trends, and clear actions. 2-3 sentences.',
  'ledger-tax': 'You focus on Canadian taxes/deductions/CRA compliance. Explain simply and give safe guidance. 2-3 sentences.',
  'byte-docs': 'You process documents and receipts. Help with uploads and OCR. 1-2 sentences.',
  'tag-categorize': 'You categorize expenses. Help organize transactions. 1-2 sentences.',
  'goalie-goals': 'You help with financial goals. Be encouraging and practical. 2-3 sentences.'
}

const FEWSHOTS = [
  { q: 'What can I write off for my side business and how to track GST?', route: 'ledger-tax' },
  { q: 'Can you show my top categories last month and what changed?', route: 'crystal-analytics' },
  { q: 'Set up weekly check-ins and keep my tone friendly.', route: 'prime-boss' },
  { q: 'Help me scan these receipts from my phone', route: 'byte-docs' },
  { q: 'How should I categorize this Uber ride to a client meeting?', route: 'tag-categorize' },
  { q: 'I want to save $10k this year for a vacation', route: 'goalie-goals' }
]

export function routeToEmployee(
  requested: string | null,
  messages: Msg[],
  mem: { text: string }[]
) {
  if (requested && PROMPTS[requested]) return { slug: requested, systemPrompt: PROMPTS[requested] }

  const last = (messages.at(-1)?.content || '').toLowerCase()

  // Keyword quick wins (most specific first)
  // ✅ NEW: Gmail search queries (statements, invoices, receipts)
  if (/(pull|get|find|fetch|show|retrieve).*(statement|invoice|receipt|email)|(statement|invoice|receipt).*(visa|stripe|bank|gmail)/i.test(last)) {
    return { slug:'byte-docs', systemPrompt: PROMPTS['byte-docs'] + ' You can search Gmail for statements/invoices using the email_search tool.' }
  }
  if (/(tax|deduction|cra|gst|hst|pst|t4|t5|1099|write[- ]?off|tax return)/i.test(last)) {
    return { slug:'ledger-tax', systemPrompt: PROMPTS['ledger-tax'] }
  }
  if (/(trend|report|analytics|chart|graph|insight|spending|pattern|forecast)/i.test(last)) {
    return { slug:'crystal-analytics', systemPrompt: PROMPTS['crystal-analytics'] }
  }
  if (/(receipt|invoice|upload|scan|document|ocr|pdf|extract)/i.test(last)) {
    return { slug:'byte-docs', systemPrompt: PROMPTS['byte-docs'] }
  }
  if (/(categor|tag|classify|organize expense|sort expense)/i.test(last)) {
    return { slug:'tag-categorize', systemPrompt: PROMPTS['tag-categorize'] }
  }
  if (/(goal|save|saving|budget|target|financial plan|retirement)/i.test(last)) {
    return { slug:'goalie-goals', systemPrompt: PROMPTS['goalie-goals'] }
  }

  // Soft match against few-shots
  const hit = FEWSHOTS.find(f => similarityScore(last, f.q) > 0.55)
  if (hit) return { slug: hit.route, systemPrompt: PROMPTS[hit.route] }

  return { slug:'prime-boss', systemPrompt: PROMPTS['prime-boss'] }
}

// Naive similarity: Jaccard over words (fast and dependency-free)
function similarityScore(a: string, b: string) {
  const A = new Set(a.split(/\W+/).filter(Boolean))
  const B = new Set(b.toLowerCase().split(/\W+/).filter(Boolean))
  const inter = [...A].filter(x => B.has(x)).length
  const union = new Set([...A, ...B]).size || 1
  return inter / union
}
