/**
 * Transaction Types
 * 
 * Type definitions for transaction management system
 */

export interface NormalizedTransaction {
  userId: string;
  kind: 'invoice' | 'receipt' | 'bank';
  date?: string;             // ISO date string (YYYY-MM-DD)
  merchant?: string;
  amount?: number;            // Positive = credit, negative = debit
  currency?: string;          // Default: 'CAD'
  items?: Array<{
    name: string;
    qty?: number;
    unit?: string;
    price?: number;
  }>;
  docId?: string;            // Links to user_documents.id
  description?: string;       // Full description (from Vision parser)
}

export interface ConfidenceScores {
  overall: number;      // 0.0 - 1.0
  merchant: number;
  amount: number;
  date: number;
}

export interface PendingTransaction {
  id: string;
  data_json: NormalizedTransaction;
  import_id: string;
  parsed_at: string;
  confidence: ConfidenceScores;
  needsReview: boolean;   // true if overall < 0.75
  possibleDuplicate?: {
    transactionId: string;
    similarity: number;
  };
}

export interface CommittedTransaction {
  id: string;
  user_id: string;
  posted_at: string;
  merchant_name: string;
  amount: number;
  category?: string;
  subcategory?: string;
  import_id?: string;
  document_id?: string;
  hash?: string;
  created_at: string;
  updated_at: string;
  import?: {
    id: string;
    status: string;
    document?: {
      id: string;
      original_name: string;
      storage_path: string;
    };
  };
}

export interface TransactionFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  categories?: string[];
  minAmount?: number;
  maxAmount?: number;
  status?: 'all' | 'reviewed' | 'pending' | 'needs-review';
  source?: 'all' | 'ocr' | 'manual' | 'import';
  merchant?: string;
}

export interface PossibleDuplicate {
  transactionId: string;
  similarity: number;
  transaction: CommittedTransaction;
}

export interface Suggestions {
  category?: {
    suggested: string;
    confidence: number;
    reason: string;
  };
  paymentMethod?: {
    suggested: string;
    confidence: number;
    reason: string;
  };
  tags?: string[];
  relatedTransactions?: CommittedTransaction[];
}

export interface SplitSuggestion {
  shouldSplit: boolean;
  suggested: Array<{
    category: string;
    items: NormalizedTransaction['items'];
    amount: number;
  }>;
}

export interface RecurringPattern {
  isRecurring: boolean;
  frequency: 'monthly' | 'weekly' | 'biweekly' | 'yearly';
  averageAmount: number;
  nextExpected: string;
  suggestion: string;
}

export interface GroupedTransactions {
  highConfidence: PendingTransaction[];
  lowConfidence: PendingTransaction[];
  byMerchant: Record<string, PendingTransaction[]>;
  duplicates: PendingTransaction[];
}

export interface SearchFilters {
  dateRange?: { start: string; end: string };
  minAmount?: number;
  maxAmount?: number;
  categories?: string[];
  merchant?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
}

export interface UserStats {
  transactions_reviewed_count: number;
  current_streak_days: number;
  last_review_date: string | null;
  badges_earned: string[];
}
