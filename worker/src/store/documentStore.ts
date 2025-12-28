/**
 * Document Store Service
 * Handles persistence of documents and transactions (real or simulated)
 */

import { supabase } from '../supabase.js';
import type { StoredDocument, StoredTransaction, SmartDocType } from './document.js';
import { config } from '../config.js';
import { createHash } from 'crypto';

// Demo user UUID for consistent use
const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

// Helper to ensure userId is UUID
function ensureUserId(userId: string): string {
  // If userId is 'default-user' or similar, use demo UUID
  if (!userId || userId === 'default-user' || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return DEMO_USER_ID;
  }
  return userId;
}

// In-memory store for dev when tables are missing
const inMemoryDocuments = new Map<string, StoredDocument>();
const inMemoryTransactions = new Map<string, StoredTransaction[]>();

/**
 * Check if error indicates missing table
 */
function isMissingTableError(error: any): boolean {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    (errorMessage.includes('user_documents') || errorMessage.includes('transactions')) &&
    (errorMessage.includes('schema cache') ||
     errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
     errorMessage.includes('table') && errorMessage.includes('not found') ||
     errorMessage.includes('pgrst204') ||
     errorMessage.includes('42p01'))
  );
}

/**
 * Compute SHA-256 hash of document content
 * @param content - File buffer or normalized OCR text string
 * @returns Hex-encoded SHA-256 hash
 */
function computeContentHash(content: Buffer | Uint8Array | string): string {
  const hash = createHash('sha256');
  if (typeof content === 'string') {
    hash.update(content, 'utf8');
  } else {
    hash.update(content);
  }
  return hash.digest('hex');
}

export interface StoreDocumentResult {
  document: StoredDocument;
  transactions: StoredTransaction[];
  isDuplicate: boolean;
  existingDocumentId?: string;
}

/**
 * Store document and transactions with duplicate detection
 */
export async function storeDocumentAndTransactions(
  document: StoredDocument,
  transactions: StoredTransaction[],
  contentHash?: string,
  extractedText?: string
): Promise<StoreDocumentResult> {
  let useInMemory = false;
  const finalUserId = ensureUserId(document.userId);
  
  // Compute content hash if not provided
  let finalHash: string | null = null;
  if (contentHash) {
    finalHash = contentHash;
  } else if (extractedText) {
    // Use normalized OCR text for hash (more stable than raw bytes)
    finalHash = computeContentHash(extractedText);
  }
  
  // Check for duplicate if we have a hash
  let existingDocId: string | undefined = undefined;
  if (finalHash && !useInMemory) {
    try {
      const { data: existingDoc, error: checkError } = await supabase
        .from('user_documents')
        .select('id')
        .eq('user_id', finalUserId)
        .eq('content_hash', finalHash)
        .maybeSingle();
      
      if (checkError) {
        // Log but don't block - continue with insert
        console.warn('[DocumentStore] Error checking for duplicates:', checkError);
      } else if (existingDoc) {
        // Duplicate found - return existing document info
        return {
          document: { ...document, id: existingDoc.id },
          transactions: [],
          isDuplicate: true,
          existingDocumentId: existingDoc.id,
        };
      }
    } catch (checkErr) {
      // If check fails, continue with insert (don't block upload)
      console.warn('[DocumentStore] Duplicate check failed, continuing:', checkErr);
    }
  }
  
  try {
      // Try to persist document to user_documents table
      try {
        const { data: docData, error: docError } = await supabase
          .from('user_documents')
          .upsert({
            id: document.id,
            user_id: finalUserId,
            original_name: document.fileName,
            doc_type: document.docType,
            transaction_count: document.transactionCount,
            summary: document.summary,
            total_debits: document.totalDebits,
            total_credits: document.totalCredits,
            period_start: document.periodStart,
            period_end: document.periodEnd,
            status: document.status || 'completed',
            content_hash: finalHash,
            // Map other fields
            source: 'upload',
            mime_type: document.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 
                      document.fileName.toLowerCase().match(/\.(png|jpg|jpeg)$/i) ? 'image/png' : 'application/octet-stream',
            storage_path: document.redactedUrl || `documents/${document.id}`,
            created_at: document.uploadedAt,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          })
          .select()
          .single();
      
      if (docError) {
        if (isMissingTableError(docError)) {
          console.warn('[DocumentStore] user_documents table not found; using in-memory storage');
          useInMemory = true;
        } else {
          throw docError;
        }
      }
    } catch (docError: any) {
      if (isMissingTableError(docError)) {
        console.warn('[DocumentStore] user_documents table not found; using in-memory storage');
        useInMemory = true;
      } else {
        throw docError;
      }
    }
    
    // Try to persist transactions
    if (!useInMemory && transactions.length > 0) {
      try {
        const transactionData = transactions.map(txn => ({
          id: txn.id,
          document_id: txn.documentId,
          user_id: finalUserId,
          txn_date: txn.date || txn.txn_date || null,
          merchant: txn.vendor || txn.merchant || null,
          description: txn.description || null,
          amount: txn.amount,
          direction: txn.direction || (txn.amount < 0 ? 'debit' : 'credit'),
          category: txn.category || null,
          subcategory: txn.subcategory || null,
          source: txn.source,
        }));
        
        const { error: txnError } = await supabase
          .from('transactions')
          .upsert(transactionData, {
            onConflict: 'id'
          });
        
        if (txnError) {
          if (isMissingTableError(txnError)) {
            console.warn('[DocumentStore] transactions table not found; using in-memory storage');
            useInMemory = true;
          } else {
            throw txnError;
          }
        }
      } catch (txnError: any) {
        if (isMissingTableError(txnError)) {
          console.warn('[DocumentStore] transactions table not found; using in-memory storage');
          useInMemory = true;
        } else {
          throw txnError;
        }
      }
    }
    
    // If tables are missing, use in-memory storage
    if (useInMemory) {
      inMemoryDocuments.set(document.id, document);
      inMemoryTransactions.set(document.id, transactions);
      console.log(`[DocumentStore] Stored document ${document.id} and ${transactions.length} transactions in memory (tables not available)`);
    }
    
    return { 
      document, 
      transactions,
      isDuplicate: false,
    };
  } catch (error) {
    // For other errors, still use in-memory as fallback
    console.warn('[DocumentStore] Persistence failed, using in-memory storage:', error);
    inMemoryDocuments.set(document.id, document);
    inMemoryTransactions.set(document.id, transactions);
    return { 
      document, 
      transactions,
      isDuplicate: false,
    };
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(documentId: string, userId: string): Promise<StoredDocument | null> {
  try {
    const finalUserId = ensureUserId(userId);
    
    const { data, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', finalUserId)
      .single();
    
    if (error) {
      if (isMissingTableError(error)) {
        // Fall back to in-memory
        return inMemoryDocuments.get(documentId) || null;
      }
      throw error;
    }
    
    if (data) {
      return mapDbDocumentToStored(data);
    }
    
    // Check in-memory as fallback
    return inMemoryDocuments.get(documentId) || null;
  } catch (error) {
    // Check in-memory as fallback
    return inMemoryDocuments.get(documentId) || null;
  }
}

/**
 * Get transactions by document ID
 */
export async function getTransactionsByDocumentId(documentId: string, userId: string): Promise<StoredTransaction[]> {
  try {
    const finalUserId = ensureUserId(userId);
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', finalUserId)
      .order('txn_date', { ascending: false });
    
    if (error) {
      if (isMissingTableError(error)) {
        // Fall back to in-memory
        return inMemoryTransactions.get(documentId) || [];
      }
      throw error;
    }
    
    if (data && data.length > 0) {
      return data.map(mapDbTransactionToStored);
    }
    
    // Check in-memory as fallback
    return inMemoryTransactions.get(documentId) || [];
  } catch (error) {
    // Check in-memory as fallback
    return inMemoryTransactions.get(documentId) || [];
  }
}

/**
 * Get all documents for a user
 */
export async function getUserDocuments(userId: string): Promise<StoredDocument[]> {
  try {
    const finalUserId = ensureUserId(userId);
    
    const { data, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', finalUserId)
      .order('created_at', { ascending: false });
    
    if (error) {
      if (isMissingTableError(error)) {
        // Fall back to in-memory
        return Array.from(inMemoryDocuments.values()).filter(doc => doc.userId === finalUserId);
      }
      throw error;
    }
    
    if (data && data.length > 0) {
      return data.map(mapDbDocumentToStored);
    }
    
    // Check in-memory as fallback
    return Array.from(inMemoryDocuments.values()).filter(doc => doc.userId === finalUserId);
  } catch (error) {
    // Check in-memory as fallback
    return Array.from(inMemoryDocuments.values()).filter(doc => doc.userId === finalUserId);
  }
}

/**
 * Map database document to StoredDocument
 */
function mapDbDocumentToStored(dbDoc: any): StoredDocument {
  return {
    id: dbDoc.id,
    userId: dbDoc.user_id,
    fileName: dbDoc.original_name || dbDoc.file_name || 'Unknown',
    docType: dbDoc.doc_type as SmartDocType,
    uploadedAt: dbDoc.created_at || dbDoc.uploaded_at,
    summary: dbDoc.summary,
    transactionCount: dbDoc.transaction_count || 0,
    totalDebits: dbDoc.total_debits || 0,
    totalCredits: dbDoc.total_credits || 0,
    periodStart: dbDoc.period_start,
    periodEnd: dbDoc.period_end,
    redactedUrl: dbDoc.redacted_url || dbDoc.storage_path,
    status: dbDoc.status,
  };
}

/**
 * Map database transaction to StoredTransaction
 */
function mapDbTransactionToStored(dbTxn: any): StoredTransaction {
  return {
    id: dbTxn.id,
    documentId: dbTxn.document_id,
    date: dbTxn.txn_date || dbTxn.date,
    vendor: dbTxn.merchant || dbTxn.vendor,
    description: dbTxn.description,
    amount: dbTxn.amount,
    category: dbTxn.category,
    subcategory: dbTxn.subcategory,
    source: dbTxn.source || 'parsed',
    direction: dbTxn.direction,
    merchant: dbTxn.merchant,
    txn_date: dbTxn.txn_date,
  };
}

/**
 * Clear in-memory storage (for testing)
 */
export function clearInMemoryStorage(): void {
  inMemoryDocuments.clear();
  inMemoryTransactions.clear();
}

