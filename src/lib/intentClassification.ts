/**
 * Intent Classification
 * 
 * Lightweight intent detection based on user messages.
 * Classifies user intent into one of four buckets for Prime routing.
 */

export type UserIntent = 'learn' | 'analyze' | 'import' | 'plan';

/**
 * Classify user intent from message content
 * 
 * @param message - User message text
 * @returns UserIntent classification
 */
export function classifyIntent(message: string): UserIntent {
  const lowerMessage = message.toLowerCase().trim();
  
  // Import intent - uploads, connecting data, documents
  const importKeywords = [
    'upload', 'import', 'connect', 'link', 'sync', 'document', 'receipt',
    'statement', 'file', 'attach', 'add document', 'scan', 'photo', 'picture'
  ];
  if (importKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'import';
  }
  
  // Analyze intent - spending, trends, insights, patterns
  const analyzeKeywords = [
    'spending', 'spend', 'expense', 'expenses', 'cost', 'costs', 'where did',
    'how much', 'how many', 'trend', 'trends', 'pattern', 'patterns',
    'insight', 'insights', 'overview', 'summary', 'breakdown', 'categorize',
    'category', 'categories', 'review', 'analyze', 'analysis', 'report'
  ];
  if (analyzeKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'analyze';
  }
  
  // Plan intent - goals, debt, budgeting, forecasting, planning
  const planKeywords = [
    'plan', 'goal', 'goals', 'budget', 'budgeting', 'forecast', 'forecasting',
    'save', 'saving', 'debt', 'pay off', 'payoff', 'strategy', 'strategies',
    'projection', 'projections', 'future', 'next', 'should i', 'what should',
    'recommend', 'recommendation', 'advice', 'help me plan'
  ];
  if (planKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'plan';
  }
  
  // Learn intent - questions, explanations, curiosity (default)
  // This includes question words and general inquiry patterns
  const learnKeywords = [
    'what', 'why', 'how', 'when', 'where', 'explain', 'tell me', 'show me',
    'understand', 'understand my', 'help me understand', 'what is', 'what are',
    'can you', 'could you', 'question', 'questions', 'curious', 'wondering'
  ];
  if (learnKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'learn';
  }
  
  // Default to 'learn' for any message that doesn't match other intents
  return 'learn';
}

/**
 * Get next best action label based on intent
 * 
 * @param intent - User intent classification
 * @returns Action label string
 */
export function getNextBestAction(intent: UserIntent): string {
  switch (intent) {
    case 'learn':
      return 'Ask a follow-up question';
    case 'analyze':
      return 'Review spending overview';
    case 'import':
      return 'Upload a document with Byte';
    case 'plan':
      return 'Explore a plan with Liberty';
    default:
      return 'Ask a follow-up question';
  }
}

/**
 * Get next best action handler based on intent
 * 
 * @param intent - User intent classification
 * @returns Action handler function or null
 */
export function getNextBestActionHandler(
  intent: UserIntent,
  handlers: {
    onLearn?: () => void;
    onAnalyze?: () => void;
    onImport?: () => void;
    onPlan?: () => void;
  }
): (() => void) | null {
  switch (intent) {
    case 'learn':
      return handlers.onLearn || null;
    case 'analyze':
      return handlers.onAnalyze || null;
    case 'import':
      return handlers.onImport || null;
    case 'plan':
      return handlers.onPlan || null;
    default:
      return handlers.onLearn || null;
  }
}










