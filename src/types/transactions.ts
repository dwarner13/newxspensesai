/**
 * Shared Transaction type for Transactions dashboard components
 * Used by DashboardTransactionsPage, TransactionCard, and TransactionDetailPanel
 */
export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  merchant?: string;
  location?: string;
  tags?: string[];
  isRecurring?: boolean;
  confidence?: number;
  aiInsights?: string[];
  receipt_url?: string;
  document_id?: string | null;
  source_type?: string | null;
  notes?: string;
}

