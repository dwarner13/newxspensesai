/**
 * TypeScript types for recurring obligations (recurring payments)
 * 
 * These types mirror the `recurring_obligations` table schema in Supabase.
 * Used by the recurring payment detector and Chime AI for notifications.
 */

export interface RecurringObligation {
  id: string;
  user_id: string;
  merchant_name: string;
  obligation_type: ObligationType;
  avg_amount: number;
  currency: string;
  frequency: PaymentFrequency;
  day_of_month: number | null;
  weekday: number | null; // 0-6 (Sunday=0, Saturday=6)
  interval_days: number | null;
  next_estimated_date: string | null; // ISO date string
  last_seen_date: string; // ISO date string
  first_seen_date: string; // ISO date string
  source: string;
  metadata: RecurringObligationMetadata;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ObligationType =
  | 'mortgage'
  | 'car_loan'
  | 'credit_card'
  | 'subscription'
  | 'utility'
  | 'insurance'
  | 'other';

export type PaymentFrequency =
  | 'monthly'
  | 'biweekly'
  | 'weekly'
  | 'unknown';

export interface RecurringObligationMetadata {
  category?: string;
  subcategory?: string;
  transaction_ids?: string[]; // IDs of transactions that matched this pattern
  confidence_score?: number; // 0-1, how confident we are this is recurring
  pattern_matches?: number; // How many times we've seen this pattern
  amount_variance?: number; // Standard deviation of amounts
  last_amount?: number; // Most recent payment amount
  notes?: string; // User or system notes
  [key: string]: any; // Allow additional metadata
}

/**
 * Input type for creating a new recurring obligation
 */
export type CreateRecurringObligationInput = Omit<
  RecurringObligation,
  'id' | 'created_at' | 'updated_at'
>;

/**
 * Input type for updating an existing recurring obligation
 */
export type UpdateRecurringObligationInput = Partial<
  Omit<RecurringObligation, 'id' | 'user_id' | 'created_at'>
>;



