/**
 * Prime Greeting Builder
 * 
 * Generates structured, premium greetings for Prime that feel cinematic and CEO-like.
 * Uses profile metadata to personalize: expense_mode, currency, display_name.
 * 
 * Structured Greeting Model:
 * - titleLine: Main headline (short, punchy)
 * - subLine: Status/context line (mode, currency, guardrails)
 * - bullets: Key capabilities (2-3 max)
 * - vibeTag: Status indicator ("Ready" | "Locked in" | "All set")
 * - chips: Action chips with intents
 */

export type PrimeTone = 'ceo' | 'friendly' | 'direct';
export type ExpenseMode = 'business' | 'personal' | undefined;
export type ChipIntent = 'spending' | 'upload' | 'question' | 'goals' | 'debts' | 'snapshot';

export interface PrimeGreetingChip {
  label: string;
  intent: ChipIntent;
  message: string; // Message to send when clicked
}

export interface PrimeGreetingData {
  titleLine: string;
  subLine: string;
  bullets: string[];
  vibeTag: 'Ready' | 'Locked in' | 'All set';
  chips: PrimeGreetingChip[];
}

export interface PrimeGreetingOptions {
  profile?: {
    display_name?: string | null;
    full_name?: string | null;
    first_name?: string | null;
    metadata?: Record<string, any> | null;
    currency?: string | null;
  } | null;
  firstName?: string | null;
  userEmail?: string | null;
  expenseMode?: ExpenseMode;
  currency?: string;
  isFirstRun?: boolean;
  hasUploads?: boolean;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  tone?: PrimeTone;
  primeState?: { // Optional PrimeState for name resolution priority and context
    userProfileSummary?: {
      displayName?: string | null;
      currency?: string | null;
      onboardingCompleted?: boolean;
    };
    financialSnapshot?: {
      hasTransactions?: boolean;
      transactionCount?: number;
      uncategorizedCount?: number;
      monthlySpend?: number;
    };
    currentStage?: 'novice' | 'guided' | 'power';
  } | null;
}

/**
 * Get time of day from current time
 */
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Get display name with fallbacks
 * Priority: PrimeState.displayName → display_name → first_name → full_name → firstName prop → 'there'
 * NEVER returns email local-part as name
 */
function getDisplayName(options: PrimeGreetingOptions): string {
  const { profile, firstName, primeState } = options;
  
  // Highest priority: PrimeState (if available)
  if (primeState?.userProfileSummary?.displayName) {
    return primeState.userProfileSummary.displayName.trim();
  }
  
  // Fallback chain
  return (
    profile?.display_name?.trim() ||
    profile?.first_name?.trim() ||
    profile?.full_name?.trim() ||
    firstName ||
    'there'
  );
}

/**
 * Build CEO-style greeting
 * Updated: Short, conversational, CEO-like greeting without bullet points
 */
function buildCEOGreeting(options: PrimeGreetingOptions): PrimeGreetingData {
  const displayName = getDisplayName(options);
  const timeOfDay = options.timeOfDay || getTimeOfDay();
  
  // Get financial context
  const hasTransactions = options.primeState?.financialSnapshot?.hasTransactions ?? false;
  const transactionCount = options.primeState?.financialSnapshot?.transactionCount ?? 0;
  const uncategorizedCount = options.primeState?.financialSnapshot?.uncategorizedCount ?? 0;
  const onboardingCompleted = options.primeState?.userProfileSummary?.onboardingCompleted ?? true;

  // Time greeting
  const timeGreeting = timeOfDay === 'morning' ? 'Good morning' : 
                       timeOfDay === 'afternoon' ? 'Good afternoon' : 
                       timeOfDay === 'evening' ? 'Good evening' : 
                       'Welcome back';

  let titleLine = '';
  let subLine = '';
  
  // NEW USER (never initialized or no name)
  if (!onboardingCompleted || displayName === 'there') {
    titleLine = `Hey! I'm Prime, your AI financial CEO.`;
    subLine = `Ready to get your finances organized?`;
  }
  // RETURNING USER - No transactions yet
  else if (!hasTransactions || transactionCount === 0) {
    titleLine = `${timeGreeting}, ${displayName}!`;
    subLine = `Upload a receipt or bank statement and I'll extract everything automatically.`;
  }
  // RETURNING USER - Has uncategorized transactions
  else if (uncategorizedCount > 0) {
    titleLine = `${timeGreeting}, ${displayName}!`;
    subLine = `You've got ${uncategorizedCount} uncategorized transaction${uncategorizedCount === 1 ? '' : 's'}. Want me to handle ${uncategorizedCount === 1 ? 'it' : 'them'}?`;
  }
  // RETURNING USER - Normal state
  else {
    titleLine = `${timeGreeting}, ${displayName}!`;
    subLine = `What do you want to work on today?`;
  }

  // Vibe tag
  const vibeTag: 'Ready' | 'Locked in' | 'All set' = 'Ready';

  // Action chips - contextual
  const chips: PrimeGreetingChip[] = [];
  
  if (!hasTransactions || transactionCount === 0) {
    chips.push(
      { label: 'Upload receipt', intent: 'upload', message: 'I want to upload a receipt or bank statement' },
      { label: 'How does this work?', intent: 'question', message: 'How does Prime work?' }
    );
  } else if (uncategorizedCount > 0) {
    chips.push(
      { label: `Fix ${uncategorizedCount} transactions`, intent: 'spending', message: `Help me categorize my ${uncategorizedCount} uncategorized transactions` },
      { label: 'Show insights', intent: 'snapshot', message: 'Show me my spending insights' }
    );
  } else {
    chips.push(
      { label: 'Show insights', intent: 'snapshot', message: 'Show me my spending insights' },
      { label: 'Upload more', intent: 'upload', message: 'I want to upload more documents' }
    );
  }

  return {
    titleLine,
    subLine,
    bullets: [], // NO BULLETS - conversational only
    vibeTag,
    chips: chips.slice(0, 2), // Max 2 chips for cleaner UI
  };
}

/**
 * Build friendly-style greeting
 * Updated: Premium, contextual, AI-feeling greeting (friendly tone variant)
 */
function buildFriendlyGreeting(options: PrimeGreetingOptions): PrimeGreetingData {
  // Use same logic as CEO greeting but with friendlier tone
  return buildCEOGreeting(options);
}

/**
 * Build direct-style greeting
 * Updated: Premium, contextual, AI-feeling greeting (direct tone variant)
 */
function buildDirectGreeting(options: PrimeGreetingOptions): PrimeGreetingData {
  // Use same logic as CEO greeting but with more direct tone
  return buildCEOGreeting(options);
}

/**
 * Build Prime greeting based on options
 * 
 * @param options - Greeting options including profile, metadata, tone
 * @returns Structured greeting data
 */
export function buildPrimeGreeting(options: PrimeGreetingOptions): PrimeGreetingData {
  const tone = options.tone || options.profile?.metadata?.prime_tone || 'ceo';

  switch (tone) {
    case 'friendly':
      return buildFriendlyGreeting(options);
    case 'direct':
      return buildDirectGreeting(options);
    case 'ceo':
    default:
      return buildCEOGreeting(options);
  }
}


