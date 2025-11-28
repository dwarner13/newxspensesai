/**
 * Processed Document Context
 * Shared type for representing processed documents that Prime/Byte can use
 */

import type { SmartDocType, NormalizedTransaction } from '../types/smartImport';

export interface DocumentAnalysis {
  totalTransactions: number;
  totalDebits: number;   // negative amounts
  totalCredits: number;  // positive amounts
  byCategory: Array<{
    category: string;
    count: number;
    totalAmount: number;
  }>;
  topVendors: Array<{
    vendor: string;
    count: number;
    totalAmount: number;
  }>;
  period?: {
    startDate: string | null;
    endDate: string | null;
  };
}

export interface ProcessedDocumentContext {
  docId: string;                        // jobId or a new id
  fileName: string;
  docType: SmartDocType;
  uploadedAt: string;                   // ISO string
  transactions: NormalizedTransaction[]; // categories already populated
  analysis: DocumentAnalysis;           // totals, by-category, top vendors, period
}

/**
 * Prime action types for Smart Import post-processing
 */
export type PrimeActionType =
  | 'prime_add_to_transactions'
  | 'prime_analyze_period'
  | 'prime_improve_rules'
  | 'prime_ask_question'
  | 'prime_categorize_vendor'
  | 'prime_save_rules'
  | 'prime_skip_rules'
  | 'prime_compare_previous_period'
  | 'prime_create_budget_from_period';

export interface PrimeAction {
  type: PrimeActionType;
  label: string;
  docId?: string;
  payload?: any; // Additional data for the action (e.g., candidate rules)
}

/**
 * Get friendly label for docType
 */
export function getDocTypeLabel(docType: SmartDocType): string {
  switch (docType) {
    case 'bank_statement':
      return 'bank statement';
    case 'receipt':
      return 'receipt';
    case 'csv':
      return 'CSV file';
    case 'generic_document':
      return 'document';
    default:
      return 'document';
  }
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

