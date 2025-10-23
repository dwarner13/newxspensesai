type Msg = { role: 'system'|'user'|'assistant'; content: string }

// Employee personas (optional flavor, added AFTER shared system)
const PERSONAS: Record<string, string> = {
  'prime-boss': 'You are Prime, the CEO. Strategic, decisive, delegates to specialists. Be concise and action-oriented. Max 2-3 sentences.',
  'crystal-analytics': 'You are Crystal, the analytics expert. You analyze spending patterns and trends. Provide clear insights and actionable recommendations. 2-3 sentences.',
  'ledger-tax': 'You are Ledger, the tax specialist. You focus on Canadian taxes, deductions, and CRA compliance. Explain simply and give safe guidance. 2-3 sentences.',
  'byte-docs': 'You are Byte, the document processor. You help with uploads, OCR, and data extraction. Efficient and precise. 1-2 sentences.',
  'tag-categorize': 'You are Tag, the categorization expert. You help organize and categorize transactions. Detail-oriented and systematic. 1-2 sentences.',
  'goalie-goals': 'You are Goalie, the goal-setting coach. You help with financial goals and motivation. Be encouraging and practical. 2-3 sentences.'
}

const FEWSHOTS = [
  { q: 'What can I write off for my side business and how to track GST?', route: 'ledger-tax' },
  { q: 'Can you show my top categories last month and what changed?', route: 'crystal-analytics' },
  { q: 'Set up weekly check-ins and keep my tone friendly.', route: 'prime-boss' },
  { q: 'Help me scan these receipts from my phone', route: 'byte-docs' },
  { q: 'How should I categorize this Uber ride to a client meeting?', route: 'tag-categorize' },
  { q: 'I want to save $10k this year for a vacation', route: 'goalie-goals' }
]

export function routeToEmployee(params: {
  userText: string;
  sharedSystem?: string;  // Optional: shared system with memory context
  requestedEmployee?: string | null;
  conversationHistory?: Msg[];
  mode?: 'strict' | 'balanced' | 'creative';
}) {
  const { userText, sharedSystem, requestedEmployee, conversationHistory = [], mode = 'balanced' } = params;

  // If specific employee requested and valid, use it
  if (requestedEmployee && PERSONAS[requestedEmployee]) {
    return {
      employee: requestedEmployee,
      systemPreamble: sharedSystem || '',
      employeePersona: PERSONAS[requestedEmployee]
    };
  }

  const last = userText.toLowerCase();

  let selectedEmployee = 'prime-boss'; // Default

  // Keyword quick wins (most specific first)
  if (/(pull|get|find|fetch|show|retrieve).*(statement|invoice|receipt|email)|(statement|invoice|receipt).*(visa|stripe|bank|gmail)/i.test(last)) {
    selectedEmployee = 'byte-docs';
  } else if (/(tax|deduction|cra|gst|hst|pst|t4|t5|1099|write[- ]?off|tax return)/i.test(last)) {
    selectedEmployee = 'ledger-tax';
  } else if (/(trend|report|analytics|chart|graph|insight|spending|pattern|forecast)/i.test(last)) {
    selectedEmployee = 'crystal-analytics';
  } else if (/(receipt|invoice|upload|scan|document|ocr|pdf|extract)/i.test(last)) {
    selectedEmployee = 'byte-docs';
  } else if (/(categor|tag|classify|organize expense|sort expense)/i.test(last)) {
    selectedEmployee = 'tag-categorize';
  } else if (/(goal|save|saving|budget|target|financial plan|retirement)/i.test(last)) {
    selectedEmployee = 'goalie-goals';
  } else {
    // Soft match against few-shots
    const hit = FEWSHOTS.find(f => similarityScore(last, f.q) > 0.55);
    if (hit) {
      selectedEmployee = hit.route;
    }
  }

  return {
    employee: selectedEmployee,
    systemPreamble: sharedSystem || '',
    employeePersona: PERSONAS[selectedEmployee]
  };
}

// Naive similarity: Jaccard over words (fast and dependency-free)
function similarityScore(a: string, b: string) {
  const A = new Set(a.split(/\W+/).filter(Boolean))
  const B = new Set(b.toLowerCase().split(/\W+/).filter(Boolean))
  const inter = [...A].filter(x => B.has(x)).length
  const union = new Set([...A, ...B]).size || 1
  return inter / union
}
