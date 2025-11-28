/**
 * Canonical Document and Transaction Types
 * Single source of truth for Smart Import data across chat, Transactions page, and Document Review
 */

export type SmartDocType = "bank_statement" | "receipt" | "csv" | "generic_document";

export interface StoredTransaction {
  id: string;
  documentId: string;
  date: string | null;
  vendor: string | null;
  description: string | null;
  amount: number;
  category: string | null;
  subcategory?: string | null;
  source: "parsed" | "regex_fallback" | "ai_inferred";
  direction?: "debit" | "credit";
  // Additional fields for compatibility
  merchant?: string | null;
  txn_date?: string | null;
}

export interface StoredDocument {
  id: string;                 // docId, primary key
  userId: string;
  fileName: string;
  docType: SmartDocType;
  uploadedAt: string;
  summary: string | null;     // short generated summary
  transactionCount: number;
  totalDebits: number;
  totalCredits: number;
  periodStart: string | null;
  periodEnd: string | null;
  // Additional fields for compatibility
  redactedUrl?: string | null;
  status?: "processing" | "completed" | "failed";
}

/**
 * Process Document Result - canonical result from worker
 */
export interface ProcessDocumentResult {
  state: "completed" | "failed";
  document: StoredDocument | null;
  transactions: StoredTransaction[];
  redactedText?: string;          // for chat/AI summaries
  error?: string;
  // Legacy fields for backward compatibility
  documentId?: string;
  transactionCount?: number;
  processingTime?: number;
  redactedUrl?: string;
  analysis?: any;
  summary?: string;
  // Duplicate detection
  isDuplicate?: boolean;
  existingDocumentId?: string;
}





