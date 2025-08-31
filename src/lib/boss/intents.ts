export type BossIntent =
  | 'import_document'
  | 'financial_assistant_qna'
  | 'financial_therapy'
  | 'goal_concierge'
  | 'spending_predictions'
  | 'help_nav';

export const INTENT_TO_ROUTE: Record<BossIntent, { route: string; cta: string }> = {
  import_document: { route: '/dashboard/smart-import-ai', cta: 'Open Smart Import AI' },
  financial_assistant_qna: { route: '/dashboard/ai-financial-assistant', cta: 'Open Financial Assistant' },
  financial_therapy: { route: '/dashboard/financial-therapist', cta: 'Start Therapy Session' },
  goal_concierge: { route: '/dashboard/goal-concierge', cta: 'Open Goal Concierge' },
  spending_predictions: { route: '/dashboard/spending-predictions', cta: 'View Predictions' },
  help_nav: { route: '/dashboard', cta: 'Back to Dashboard' },
};
