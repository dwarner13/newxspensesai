/**
 * Smart Import AI Types
 * Canonical document types for Smart Import upload sources
 */

export type SmartDocType = "bank_statement" | "receipt" | "csv" | "generic_document";

/**
 * Normalized transaction structure from worker
 */
export interface NormalizedTransaction {
  id?: string;
  date: string;
  merchant: string;
  description: string;
  amount: number;
  direction: 'debit' | 'credit';
  category?: string;
  subcategory?: string;
}

/**
 * Processed document tracked in Smart Import AI page
 */
export interface ProcessedDocument {
  id: string;                  // jobId or a new identifier
  fileName: string;
  docType: SmartDocType;
  uploadedAt: string;          // ISO string
  transactionCount: number;
  transactions: NormalizedTransaction[];
  summary: string;             // short text for display
  jobId?: string;              // Worker job ID
  documentId?: string;         // Database document ID
  // Duplicate detection
  isDuplicate?: boolean;
  existingDocumentId?: string;
  // Debug data
  redactedText?: string;       // Raw OCR/parse text for debug view
}

/**
 * Map tile names to docTypes
 */
export const TILE_TO_DOCTYPE: Record<string, SmartDocType> = {
  'Document Upload': 'generic_document',
  'Scan Receipt': 'receipt',
  'Bank Statement': 'bank_statement',
  'CSV Import': 'csv',
};

/**
 * Build professional summary for a processed document
 */
export function buildDocumentSummary(
  docType: SmartDocType,
  transactionCount: number,
  fileName: string
): string {
  switch (docType) {
    case 'bank_statement':
      return `Bank statement • ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''} extracted`;
    case 'receipt':
      return `Receipt • ${transactionCount} line item${transactionCount !== 1 ? 's' : ''} detected`;
    case 'csv':
      return `CSV import • ${transactionCount} row${transactionCount !== 1 ? 's' : ''} processed`;
    case 'generic_document':
      return `Document • ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''} extracted`;
    default:
      return `${fileName} • ${transactionCount} item${transactionCount !== 1 ? 's' : ''} processed`;
  }
}

/**
 * Get section name for a docType
 */
export function getSectionName(docType: SmartDocType): string {
  switch (docType) {
    case 'bank_statement':
      return 'Bank Statements';
    case 'receipt':
      return 'Receipts';
    case 'csv':
      return 'CSV Imports';
    case 'generic_document':
      return 'Other Documents';
    default:
      return 'Documents';
  }
}

/**
 * Build AI chat completion message based on docType
 */
export function buildCompletionMessage(
  docType: SmartDocType,
  fileName: string,
  transactionCount: number
): string {
  const sectionName = getSectionName(docType);
  
  switch (docType) {
    case 'bank_statement':
      return `I've finished processing your bank statement **${fileName}**.\n\n• ${transactionCount} transaction${transactionCount !== 1 ? 's were' : ' was'} extracted and normalized.\n• You can review this statement in the **Bank Statements** section of Smart Import AI.`;
    case 'receipt':
      return `Your receipt **${fileName}** has been scanned and processed.\n\n• ${transactionCount} line item${transactionCount !== 1 ? 's were' : ' was'} detected.\n• You'll find it in the **Receipts** section of Smart Import AI.`;
    case 'csv':
      return `Your CSV file **${fileName}** has been imported.\n\n• ${transactionCount} row${transactionCount !== 1 ? 's were' : ' was'} processed.\n• It's now listed under the **CSV Imports** section of Smart Import AI.`;
    case 'generic_document':
      return `Your document **${fileName}** has been processed.\n\n• ${transactionCount} transaction${transactionCount !== 1 ? 's were' : ' was'} extracted.\n• You can review it in the **Other Documents** section of Smart Import AI.`;
    default:
      return `Processing complete for **${fileName}**. ${transactionCount} item${transactionCount !== 1 ? 's' : ''} extracted.`;
  }
}

/**
 * Commit Import Response Types
 */
export interface ImportSummary {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  uncategorizedCount: number;
  topCategories: Array<{
    category: string;
    total: number;
    count: number;
  }>;
  dateRange?: {
    startDate: string;
    endDate: string;
  } | null;
}

export interface UnassignedCategory {
  transactionId: string;
  merchant: string;
  amount: number;
  date: string;
}

export interface PossibleDuplicate {
  transactionIds: string[];
  date: string;
  amount: number;
  description: string;
  similarity: number;
}

export interface FixableIssues {
  unassignedCategories: UnassignedCategory[];
  possibleDuplicates: PossibleDuplicate[];
}

export interface CommitImportResponse {
  success: boolean;
  ok: boolean; // Backward compatibility
  importId: string;
  committed: number; // Backward compatibility
  insertedCount: number;
  documentId: string | null;
  message: string;
  summary?: ImportSummary;
  issues?: FixableIssues;
  error?: string;
}





