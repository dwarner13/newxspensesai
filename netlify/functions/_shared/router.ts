import { resolveSlug, getEmployeeSystemPrompt } from '../../../src/employees/registry';

type Msg = { role: 'system'|'user'|'assistant'; content: string }

// Cache for personas (loaded from database via registry)
// Key: canonical slug, Value: system prompt text
const personaCache: Record<string, string> = {};

/**
 * Get persona (system prompt) for an employee slug
 * Uses registry to resolve slug and load from database
 */
async function getPersona(slug: string): Promise<string | null> {
  if (!slug) return null;
  
  // Resolve to canonical slug
  const canonicalSlug = await resolveSlug(slug);
  
  // Check cache first
  if (personaCache[canonicalSlug]) {
    return personaCache[canonicalSlug];
  }
  
  // Load from registry
  const prompt = await getEmployeeSystemPrompt(canonicalSlug);
  if (prompt) {
    personaCache[canonicalSlug] = prompt;
    return prompt;
  }
  
  return null;
}

/**
 * Check if a message looks like a notification/reminder intent
 * Returns true if the message contains patterns that suggest the user wants
 * reminders, alerts, or notifications about upcoming payments or bills.
 */
function looksLikeNotificationIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('remind me') ||
    lower.includes('send me a reminder') ||
    lower.includes('notification') ||
    lower.includes('alert me') ||
    lower.includes('ping me') ||
    lower.includes('nudge me') ||
    lower.includes('due in') ||
    lower.includes('payment coming up') ||
    lower.includes('credit card is due') ||
    lower.includes('upcoming bill') ||
    lower.includes('car payment coming up') ||
    lower.includes('mortgage payment coming up') ||
    lower.includes('bill is due') ||
    lower.includes('when is my payment due') ||
    lower.includes('what payments are coming') ||
    lower.includes('upcoming payments') ||
    lower.includes('remind me about') ||
    lower.includes('set a reminder') ||
    lower.includes('set reminder')
  );
}

const FEWSHOTS = [
  { q: 'What can I write off for my side business and how to track GST?', route: 'ledger-tax' },
  { q: 'Can you show my top categories last month and what changed?', route: 'crystal-ai' },
  { q: 'Set up weekly check-ins and keep my tone friendly.', route: 'prime-boss' },
  { q: 'Help me scan these receipts from my phone', route: 'byte-docs' },
  { q: 'How should I categorize this Uber ride to a client meeting?', route: 'tag-ai' },
  { q: 'I want to save $10k this year for a vacation', route: 'goalie-ai' },
  // Liberty debt/freedom examples
  { q: 'How do I pay off my credit card debt faster?', route: 'liberty-ai' },
  // Chime reminder/notification examples
  { q: 'Can you remind me about my car payment?', route: 'chime-ai' },
  { q: 'My credit card is due soon, can you remind me?', route: 'chime-ai' },
  { q: 'Set a reminder for my mortgage payment', route: 'chime-ai' },
  { q: 'What payments are coming up in the next week?', route: 'chime-ai' },
  { q: 'Nudge me if I forget to pay my bills', route: 'chime-ai' },
  { q: 'I\'m getting hit with overdraft fees — how do I stop this?', route: 'liberty-ai' },
  { q: 'What\'s the smartest way to get financial freedom in 3 years?', route: 'liberty-ai' },
  { q: 'Am I getting killed by fees anywhere?', route: 'liberty-ai' },
  { q: 'How do I reduce my interest payments?', route: 'liberty-ai' },
  { q: 'My minimum payment is $200/month but I can pay $300 — what does that do?', route: 'liberty-ai' },
  // Blitz rapid actions examples
  { q: 'Give me an action plan', route: 'blitz-ai' },
  { q: 'What should I do next?', route: 'blitz-ai' },
  { q: 'Turn this into a checklist', route: 'blitz-ai' },
  { q: 'What are my next steps?', route: 'blitz-ai' },
  { q: 'Make this a todo list', route: 'blitz-ai' },
  // Chime notification/reminder examples
  { q: 'Set up a reminder to check my restaurant expenses every Friday', route: 'chime-ai' },
  { q: 'Remind me to review my spending every week', route: 'chime-ai' },
  { q: 'Send me an alert if I go over $500 on dining', route: 'chime-ai' },
  { q: 'Nudge me if my savings goal is behind', route: 'chime-ai' },
  { q: 'Can you help me turn my savings goal into 3 reminders for the month?', route: 'chime-ai' },
  // Finley forecasting examples
  { q: 'How long will it take me to pay off this card?', route: 'finley-ai' },
  { q: 'What will I save in 6 months?', route: 'finley-ai' },
  { q: 'How much money will I have in 2028?', route: 'finley-ai' },
  { q: 'When will this be paid off?', route: 'finley-ai' },
  { q: 'How long to pay off my $2,000 credit card if I pay $200/month?', route: 'finley-ai' },
  { q: 'How much can I save by December if I keep spending like this?', route: 'finley-ai' },
  { q: 'Forecast my savings for next year', route: 'finley-ai' },
  { q: 'Plan my debt payoff timeline', route: 'finley-ai' },
  { q: 'How much did I make', route: 'crystal-ai' },
  { q: 'How much did I spend', route: 'crystal-ai' },
  { q: 'Income summary', route: 'crystal-ai' },
  { q: 'Expense summary', route: 'crystal-ai' },
  { q: 'Summary of my spending', route: 'crystal-ai' },
  { q: 'Summary', route: 'crystal-ai' },
  { q: 'Breakdown', route: 'crystal-ai' },
  { q: 'Totals', route: 'crystal-ai' },
  { q: 'Top merchants', route: 'crystal-ai' },
  { q: 'Income this month', route: 'crystal-ai' },
  { q: 'Expenses this month', route: 'crystal-ai' },
  { q: 'What did I spend at Costco', route: 'crystal-ai' },
  { q: 'How much did I make this month?', route: 'crystal-ai' },
  { q: 'How much did I spend on restaurants?', route: 'crystal-ai' },
  { q: 'Give me an income summary for October.', route: 'crystal-ai' },
  { q: 'Show me my top merchants for expenses.', route: 'crystal-ai' },
  { q: 'Breakdown of my spending by category', route: 'crystal-ai' },
  { q: 'What are my top spending categories?', route: 'crystal-ai' }
]

export async function routeToEmployee(params: {
  userText: string;
  sharedSystem?: string;  // Optional: shared system with memory context
  requestedEmployee?: string | null;
  conversationHistory?: Msg[];
  mode?: 'strict' | 'balanced' | 'creative';
}) {
  const { userText, sharedSystem, requestedEmployee, conversationHistory = [], mode = 'balanced' } = params;
  const last = userText.toLowerCase(); // Pre-compute lowercase for all routing logic

  // If specific employee requested, resolve slug and get persona
  if (requestedEmployee) {
    const canonicalSlug = await resolveSlug(requestedEmployee);
    
    // Special Prime → Blitz handoff for action-style requests
    // When user explicitly selects Prime but asks for actions/checklists/next steps,
    // automatically route to Blitz instead (Blitz specializes in rapid action plans)
    const isPrime = canonicalSlug === 'prime-boss' || canonicalSlug === 'prime-ai';
    
    const primeWantsActions =
      isPrime &&
      (
        last.includes('action plan') ||
        last.includes('action steps') ||
        last.includes('next steps') ||
        last.includes('what should i do') ||
        last.includes('what do i do now') ||
        last.includes('what do i do next') ||
        last.includes('turn this into a checklist') ||
        last.includes('make this a checklist') ||
        last.includes('make this into a checklist') ||
        last.includes('summarize into actions') ||
        last.includes('summarize this into actions') ||
        last.includes('give me a checklist') ||
        last.includes('turn this into an action plan') ||
        last.includes('turn this into a plan') ||
        last.includes('todo list') ||
        last.includes('to-do list') ||
        last.includes('rapid actions')
      );
    
    if (primeWantsActions) {
      // Override Prime → route to Blitz for action-style requests
      const blitzSlug = 'blitz-ai';
      const blitzPersona = await getPersona(blitzSlug);
      
      console.log(`[Router] Prime → Blitz handoff: User explicitly selected Prime but asked for actions. Routing to Blitz.`);
      
      if (blitzPersona) {
        return {
          employee: blitzSlug,
          systemPreamble: sharedSystem || '',
          employeePersona: blitzPersona
        };
      }
    }
    
    // For all other explicit employee requests, honor the selection
    const persona = await getPersona(canonicalSlug);
    
    if (persona) {
      return {
        employee: canonicalSlug,
        systemPreamble: sharedSystem || '',
        employeePersona: persona
      };
    }
  }

  let selectedEmployee = 'prime-boss'; // Default

  // ============================================================================
  // CRYSTAL ROUTING - Income/Expense Summaries (Priority: High)
  // ============================================================================
  // Crystal handles: income summaries, expense summaries, spending breakdowns,
  // top merchants, merchant-specific queries, and financial summaries.
  //
  // Test cases that SHOULD route to Crystal:
  // - "How much did I make this month?"
  // - "How much did I spend on restaurants?"
  // - "Give me an income summary for October."
  // - "Show me my top merchants for expenses."
  // - "What did I spend at Costco?"
  // - "Breakdown of my spending by category"
  // - "Income this month"
  // - "Expenses this month"
  //
  // Confidence: 0.85-1.0 for clearly financial-summary questions
  // ============================================================================
  if (
    // Income/expense amount queries
    /(how much did i (make|earn|spend|pay)|what did i (make|earn|spend)|how much (did|have) i (made|earned|spent))/i.test(last) ||
    // Summary queries
    /(income summary|expense summary|spending summary|financial summary|summary of (my )?(income|expenses|spending))/i.test(last) ||
    // Time-based summaries
    /(income|expenses|spending) (this|last|for) (month|year|week|quarter|january|february|march|april|may|june|july|august|september|october|november|december)/i.test(last) ||
    // Breakdown queries
    /(breakdown|break down) (of|for) (my )?(spending|expenses|income|transactions)/i.test(last) ||
    /(spending|expense|income) breakdown/i.test(last) ||
    // Top merchants/categories
    /(top (merchants|vendors|stores|categories|spending)|biggest (merchants|vendors|expenses|spending))/i.test(last) ||
    // Merchant-specific queries
    /(what did i spend (at|on)|how much (did|have) i (spent|spend) (at|on)|spending (at|on))/i.test(last) ||
    // Totals and counts
    /^(totals?|summary|breakdown)$/i.test(last.trim()) ||
    // Category/merchant breakdowns
    /(breakdown|break down) (by|of) (merchant|category|vendor|store)/i.test(last)
  ) {
    selectedEmployee = 'crystal-ai';
  // ============================================================================
  // OTHER ROUTING RULES (Priority: Medium)
  // ============================================================================
  } else if (/(pull|get|find|fetch|show|retrieve).*(statement|invoice|receipt|email)|(statement|invoice|receipt).*(visa|stripe|bank|gmail)/i.test(last)) {
    selectedEmployee = 'byte-docs';
  } else if (/(tax|deduction|cra|gst|hst|pst|t4|t5|1099|write[- ]?off|tax return)/i.test(last)) {
    selectedEmployee = 'ledger-tax';
  } else if (/(trend|report|analytics|chart|graph|insight|spending|pattern|forecast|projection|payoff|timeline).*(screenshot|image|statement|photo|picture)/i.test(last) || 
             /(screenshot|image|statement|photo|picture).*(trend|report|analytics|forecast|projection|payoff|timeline)/i.test(last)) {
    // Route screenshot trend questions to Crystal
    selectedEmployee = 'crystal-ai';
  } else if (/(trend|report|analytics|chart|graph|insight|spending|pattern|forecast)/i.test(last)) {
    selectedEmployee = 'crystal-ai';
  } else if (/(receipt|invoice|upload|scan|document|ocr|pdf|extract)/i.test(last)) {
    selectedEmployee = 'byte-docs';
  } else if (/(categor|tag|classify|organize expense|sort expense)/i.test(last)) {
    selectedEmployee = 'tag-ai'; // Use canonical slug
  // ============================================================================
  // LIBERTY ROUTING - Debt Freedom & Protection Coach (Priority: High)
  // ============================================================================
  // Liberty handles: ALL debt types (mortgages, car loans, credit cards, payday,
  // LOC, personal loans), debt payoff strategies, interest optimization, late fees,
  // overdraft fees, loan consolidation, financial freedom, consumer protection.
  //
  // Liberty is the Debt Freedom & Protection Coach.
  // Use Liberty when the user asks about debt payoff, loans (mortgage, car loan,
  // credit cards, payday, LOC), interest rates, or escaping debt to reach financial freedom.
  // Liberty may coordinate with Finley, Blitz, Crystal, Tag, and Goalie to build realistic payoff plans.
  //
  // Test cases that SHOULD route to Liberty:
  // - "How do I pay off my credit card debt faster?"
  // - "I'm drowning in credit card debt, what should I do?"
  // - "How can I pay my car loan faster if I add $50/week?"
  // - "I have payday loans and a line of credit; help me get out of this."
  // - "What happens if I add $50/week to my mortgage?"
  // - "I'm getting hit with overdraft fees — how do I stop this?"
  // - "What's the smartest way to get financial freedom in 3 years?"
  // - "Am I getting killed by fees anywhere?"
  // - "How do I reduce my interest payments?"
  //
  // Confidence: 0.85-1.0 for clearly debt/fees/freedom questions
  // ============================================================================
  } else if (
    // Debt and loan keywords (broad coverage)
    /\b(debt|loan|mortgage|car loan|auto loan|vehicle financing|line of credit|loc|credit card|visa|mastercard|payday|high interest|personal loan|installment loan|student loan)\b/i.test(last) ||
    // Payoff language
    /(pay.*off|payoff|eliminate|get out|kill|escape|free from|drowning in|behind on payments|pay.*faster|pay.*sooner|how long.*pay|when will.*paid)/i.test(last) ||
    // Debt strategies
    /\b(debt[- ]?snowball|debt[- ]?avalanche|minimum payment|extra payment|lump sum|accelerated payment|if i add \$|if i pay \$|pay more|pay extra)\b/i.test(last) ||
    // Interest and rates
    /\b(interest rate|apr|interest payment|reduce interest|save interest|interest saved|how much interest|total interest)\b/i.test(last) ||
    // Fees
    /\b(overdraft|nsf fee|late fee|penalty fee|bank fee|monthly fee|annual fee|getting.*killed.*fee|fee.*anywhere|fees? are killing)\b/i.test(last) ||
    // Financial freedom language & collections
    /\b(financial freedom|debt[- ]?free|free in \d+ (years|yrs)|out of debt|escape debt|debt freedom|debt stress)\b/i.test(last) ||
    // Collections and high-risk debt
    /\b(collections?|garnish(ment)?|payday loan|cash advance|predatory lending)\b/i.test(last) ||
    // Specific loan payoff questions
    /(how can i pay|how should i pay|what happens if i|what if i add|how much sooner|how much will i save|how much interest)/i.test(last) && /\b(loan|debt|mortgage|car|card)\b/i.test(last)
  ) {
    // Route to Liberty for debt freedom, payoff planning, and protection
    selectedEmployee = 'liberty-ai';
    console.log(`[Router] Selected employee: liberty-ai for message: "${last.substring(0, 100)}..."`);
  // ============================================================================
  // BLITZ ROUTING - Rapid Actions & Alerts (Priority: High)
  // ============================================================================
  // Blitz handles: action plans, checklists, next steps, "what should I do",
  // rapid actions, todo lists, and prioritized action items.
  //
  // Blitz is the Rapid Actions & Alerts AI. Use Blitz when the user wants
  // next steps, action plans, checklists, or a quick "what do I do now?" summary
  // based on existing insights. Prime may hand off to Blitz when the user
  // explicitly asks for actions or a checklist (see explicit employee override above).
  //
  // Test cases that SHOULD route to Blitz:
  // - "Give me an action plan"
  // - "What should I do next?"
  // - "Turn this into a checklist"
  // - "What are my next steps?"
  // - "Make this a todo list"
  //
  // Confidence: 0.85-1.0 for clearly action/checklist requests
  // ============================================================================
  } else if (
    // Action plan requests
    /(action plan|action steps|action items|action list)/i.test(last) ||
    // Next steps requests
    /(what should i do|what do i do next|next steps|next actions|what are my next steps)/i.test(last) ||
    // Checklist requests
    /(make this a checklist|turn this into a checklist|turn this into actions|turn this into an action plan|checklist|check list)/i.test(last) ||
    // Todo list requests
    /(todo list|to-do list|to do list|make a todo|create a todo)/i.test(last) ||
    // Rapid actions / Blitz mentions
    /(rapid actions|blitz|quick actions|prioritized actions)/i.test(last)
  ) {
    // Route to Blitz for rapid actions and alerts
    selectedEmployee = 'blitz-ai';
  } else if (
    // Finley routing: Forecasting, planning, and future projections
    // Patterns that indicate forecasting/planning questions
    /(forecast|future|plan|planning|projection|project|timeline|scenario|what if)/i.test(last) ||
    // Savings-related forecasting
    /(save by|save up|how much can i save|how much will i save|savings forecast|savings projection)/i.test(last) ||
    // Debt payoff questions (but only if not already caught by Liberty patterns above)
    /(how long to pay off|how long will it take|when will.*paid off|payoff timeline)/i.test(last) ||
    // Time-based projections
    /(by december|by [a-z]+|next year|in \d+ years|in \d+ months|by \d{4})/i.test(last) ||
    // Specific forecasting patterns
    /(if i pay \$|if i keep paying|if i save|if i continue|how much will i have|what will i have)/i.test(last) ||
    // Retirement and long-term planning
    /(retirement planning|retirement timing|wealth forecast|long.?term strategy|long term plan)/i.test(last)
  ) {
    // Route to Finley for forecasting and planning questions
    // Finley uses Crystal tools to get real income/expense data before forecasting
    selectedEmployee = 'finley-ai';
  // ============================================================================
  // GOALIE ROUTING - Goal Tracking & Achievement (Priority: High)
  // ============================================================================
  // Goalie handles: goal tracking, progress updates, goal-related questions,
  // savings goals, debt payoff goals, milestone tracking, and achievement coaching.
  //
  // Test cases that SHOULD route to Goalie:
  // - "What goals do I have?"
  // - "How close am I to my emergency fund goal?"
  // - "Update my savings goal progress"
  // - "I want to save $10k this year"
  // - "What should I do to reach my goal faster?"
  // - "Track my progress on my goals"
  //
  // Confidence: 0.85-1.0 for clearly goal-related questions
  // ============================================================================
  } else if (
    // Direct goal queries
    /(what (are|is) (my )?goal|show (me )?(my )?goal|list (my )?goal|my goal)/i.test(last) ||
    // Progress tracking
    /(how (close|far) (am i|are you) (to|from)|progress (on|toward|towards)|how much (have i|do i have) (saved|progressed)|goal progress)/i.test(last) ||
    // Goal creation/intent
    /(i want to (save|pay off|reach)|save (for|up)|saving (for|goal)|set (a|up) (goal|target)|create (a|an) goal)/i.test(last) ||
    // Goal types
    /(emergency fund|vacation fund|down payment|debt (payoff|free|elimination)|retirement goal|savings goal|spending goal)/i.test(last) ||
    // Achievement/milestone language
    /(milestone|achievement|reach (my|a) goal|hit (my|a) goal|achieve (my|a) goal)/i.test(last) ||
    // Update progress
    /(update (my|the) goal|mark goal (as|complete)|goal (status|update))/i.test(last) ||
    // Action suggestions
    /(what should i do (to|for)|how can i (reach|achieve)|next step (for|to)|action (for|to reach))/i.test(last) && /goal/i.test(last)
  ) {
    selectedEmployee = 'goalie-ai';
  // ============================================================================
  // CHIME ROUTING - Smart Notifications & Nudges (Priority: Medium)
  // ============================================================================
  // Chime handles: reminders, alerts, notifications, nudges, check-ins.
  // Chime turns complex financial insights into simple reminders and motivational nudges.
  //
  // Test cases that SHOULD route to Chime:
  // - "Set up a reminder to check my restaurant expenses every Friday"
  // - "Remind me to review my spending every week"
  // - "Send me an alert if I go over $500 on dining"
  // - "Nudge me if my savings goal is behind"
  // - "Can you help me turn my savings goal into 3 reminders for the month?"
  //
  // Confidence: 0.75-0.9 for clearly reminder/notification requests
  // ============================================================================
  } else if (
    // Reminder requests
    /(remind me|set (a|up) (a )?reminder|create (a|an) reminder|weekly reminder|monthly reminder|daily reminder)/i.test(last) ||
    // Alert requests
    /(send me (an )?alert|alert me|notify me|ping me|nudge me|give me (a )?heads up)/i.test(last) ||
    // Notification language
    /(notification|notify|ping|nudge|check[- ]?in)/i.test(last) &&
      /(when|if|every|weekly|monthly|daily)/i.test(last) ||
    // Specific reminder patterns
    /(remind.*(every|weekly|monthly|daily|friday|monday)|check.*reminder|review.*reminder)/i.test(last) ||
    // Turn X into reminders
    /(turn.*into.*reminder|make.*reminder|create.*reminder|set.*reminder)/i.test(last) ||
    // Upcoming bills/payments queries
    /(upcoming bills|what payments are coming|what is due soon|due in|credit card due|what bills|payments coming up|what.*due|bills.*coming)/i.test(last) ||
    // Payment coming up patterns
    /(my payment is coming up|payment coming out|mortgage payment coming|car payment coming|credit card.*coming|due in \d+ days|due soon)/i.test(last) ||
    // Nudge/forget patterns
    /(nudge me if i forget|remind me if|alert me when|notify me when)/i.test(last) ||
    // Credit card due date patterns
    /(credit card due date|credit card due|card payment due|bill due date)/i.test(last) ||
    // Car payment reminder patterns
    /(car payment reminder|mortgage reminder|payment reminder)/i.test(last)
  ) {
    // Route to Chime for notifications and reminders
    selectedEmployee = 'chime-ai';
    console.log(`[Router] Selected employee: chime-ai for message: "${last.substring(0, 100)}..."`);
  } else {
    // Check for notification/reminder intent before falling back to Prime
    if (looksLikeNotificationIntent(userText)) {
      selectedEmployee = 'chime-ai';
      console.log(`[Router] Notification intent detected, routing to chime-ai for message: "${last.substring(0, 100)}..."`);
    } else {
      // Soft match against few-shots
      const hit = FEWSHOTS.find(f => similarityScore(last, f.q) > 0.55);
      if (hit) {
        selectedEmployee = hit.route;
      }
    }
  }

  // Resolve to canonical slug and get persona
  const canonicalSlug = await resolveSlug(selectedEmployee);
  const persona = await getPersona(canonicalSlug);
  
  return {
    employee: canonicalSlug,
    systemPreamble: sharedSystem || '',
    employeePersona: persona || '' // Fallback to empty string if persona not found
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
