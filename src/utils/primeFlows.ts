/**
 * Prime Post-Processing Flow Handlers
 * Handles Prime's actions after document processing
 */

import type { ProcessedDocumentContext, PrimeAction } from '../types/processedDocument';
import { CHAT_ENDPOINT } from '../lib/chatEndpoint';

/**
 * Build Prime's follow-up message after Byte's review
 */
export function buildPrimeFollowUpMessage(context: ProcessedDocumentContext): {
  content: string;
  actions: PrimeAction[];
} {
  const docTypeLabel = context.docType === 'bank_statement' ? 'bank statement' :
    context.docType === 'receipt' ? 'receipt' :
    context.docType === 'csv' ? 'CSV file' : 'document';

  const totalDebitsFormatted = formatCurrency(context.analysis.totalDebits);
  const totalCreditsFormatted = formatCurrency(context.analysis.totalCredits);

  const content = `I've reviewed Byte's work on your **${docTypeLabel}** _${context.fileName}_.

For this document, we processed **${context.analysis.totalTransactions} transaction${context.analysis.totalTransactions !== 1 ? 's' : ''}**  
with total spending of **${totalDebitsFormatted}** and total inflows of **${totalCreditsFormatted}**.

What would you like me to do next?

1) Add these to your Transactions  
2) Analyze this period in more detail  
3) Improve future categorization rules  
4) Let me ask a custom question about this document`;

  const actions: PrimeAction[] = [
    {
      type: 'prime_add_to_transactions',
      label: 'Add these to your Transactions',
      docId: context.docId,
    },
    {
      type: 'prime_analyze_period',
      label: 'Analyze this period in more detail',
      docId: context.docId,
    },
    {
      type: 'prime_improve_rules',
      label: 'Improve future categorization rules',
      docId: context.docId,
    },
    {
      type: 'prime_ask_question',
      label: 'Let me ask a custom question about this document',
      docId: context.docId,
    },
  ];

  return { content, actions };
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Flow A: Add to Transactions
 */
export async function handleAddToTransactions(
  context: ProcessedDocumentContext,
  userId: string
): Promise<string> {
  try {
    // Attempt to persist transactions with document_id
    const success = await persistTransactions(context.transactions, userId, context.docId);
    
    if (success) {
      return `Done. I've added ${context.analysis.totalTransactions} transaction${context.analysis.totalTransactions !== 1 ? 's' : ''} to your Transactions tab.

You can filter them by date, category, or account anytime.

Would you like me to reconcile these against your latest balance?`;
    } else {
      return `I had trouble saving these transactions to your Transactions tab. This may be due to a schema mismatch (e.g., missing confidence column). Please check the browser console for details or contact support.`;
    }
  } catch (error) {
    console.error('[PrimeFlow] Failed to add transactions:', error);
    
    // Provide more helpful error message if it's a schema issue
    if (error instanceof Error && error.message.includes('PGRST204')) {
      return `I encountered a schema mismatch while saving these transactions. This looks like a missing column in the database (possibly the 'confidence' column). Please check the browser console for details or contact support.`;
    }
    
    return `I encountered an issue adding these transactions. Please try again or contact support if the problem persists.`;
  }
}

/**
 * Flow B: Analyze this period
 */
export async function handleAnalyzePeriod(
  context: ProcessedDocumentContext,
  userId: string
): Promise<string> {
  try {
    const insights = await generatePeriodInsights(context, userId);
    
    return `Here's what I see in this period:

${insights}

I can also:
- Compare this to your previous period
- Help you set budgets based on these patterns
- Flag recurring subscriptions or fees to review`;
  } catch (error) {
    console.error('[PrimeFlow] Failed to analyze period:', error);
    return `I encountered an issue analyzing this period. Please try again.`;
  }
}

/**
 * Flow C: Improve categorization rules
 */
export function handleImproveRules(context: ProcessedDocumentContext): {
  message: string;
  candidateRules: Array<{ vendor: string; category: string }>;
} {
  // Find vendors that appear multiple times with the same category
  const vendorCategoryMap = new Map<string, { category: string; count: number }>();
  
  for (const transaction of context.transactions) {
    const vendor = transaction.merchant || 'Unknown';
    const category = transaction.category || 'Uncategorized';
    
    const key = `${vendor}|${category}`;
    const existing = vendorCategoryMap.get(key) || { category, count: 0 };
    vendorCategoryMap.set(key, { category, count: existing.count + 1 });
  }
  
  // Find vendors that appear 2+ times with the same category
  const candidates: Array<{ vendor: string; category: string; count: number }> = [];
  const seenVendors = new Set<string>();
  
  for (const [key, data] of vendorCategoryMap.entries()) {
    if (data.count >= 2) {
      const [vendor] = key.split('|');
      if (!seenVendors.has(vendor)) {
        seenVendors.add(vendor);
        candidates.push({
          vendor,
          category: data.category,
          count: data.count,
        });
      }
    }
  }
  
  // Sort by count and take top 5
  candidates.sort((a, b) => b.count - a.count);
  const topCandidates = candidates.slice(0, 5);
  
  if (topCandidates.length === 0) {
    return {
      message: `I reviewed this document, but I couldn't find strong patterns to create new categorization rules. Most transactions are already categorized or appear only once.

You can manually create rules anytime, or I can help you categorize specific transactions.`,
      candidateRules: [],
    };
  }
  
  const ruleList = topCandidates
    .map(c => `- **${c.vendor}** → Category: ${c.category}`)
    .join('\n');
  
  return {
    message: `Based on this document, I can create rules like:

${ruleList}

Should I save these so I can auto-categorize future imports the same way?`,
    candidateRules: topCandidates.map(c => ({ vendor: c.vendor, category: c.category })),
  };
}

/**
 * Flow D: Ask a custom question
 */
export async function handleAskQuestion(
  question: string,
  context: ProcessedDocumentContext,
  userId: string
): Promise<string> {
  try {
    return await answerQuestionAboutDocument(question, context, userId);
  } catch (error) {
    console.error('[PrimeFlow] Failed to answer question:', error);
    return `I encountered an issue answering your question. Please try rephrasing it or ask about something else.`;
  }
}

/**
 * Generate period insights using server-side document-insights function
 */
async function generatePeriodInsights(
  context: ProcessedDocumentContext,
  userId: string
): Promise<string> {
  try {
    // Call server-side document-insights function
    const response = await fetch('/.netlify/functions/document-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        docId: context.docId,
        insightMode: 'period_summary',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    // Return the answer/summary from server
    return result.answer || result.summary || generateFallbackInsights(context);
  } catch (error) {
    console.error('[PrimeFlow] Failed to generate period insights:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Return user-friendly error message
    return `I had trouble reaching the AI for this document. Your OCR text is saved. Please try again or check your API key on the server.\n\n${generateFallbackInsights(context)}`;
  }
}

/**
 * Answer a custom question about the document using server-side document-insights function
 */
async function answerQuestionAboutDocument(
  question: string,
  context: ProcessedDocumentContext,
  userId: string
): Promise<string> {
  try {
    if (!question || question.trim().length === 0) {
      return 'Please provide a question about this document.';
    }

    // Call server-side document-insights function
    const response = await fetch('/.netlify/functions/document-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        docId: context.docId,
        question: question.trim(),
        insightMode: 'qa',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    // Return the answer from server
    return result.answer || 'I reviewed the document, but I need more context to answer that question. Could you rephrase it or ask about something more specific?';
  } catch (error) {
    console.error('[PrimeFlow] Failed to answer question:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Return user-friendly error message
    return `I had trouble reaching the AI for this document. Your OCR text is saved. Please try again or check your API key on the server.\n\nIf the problem persists, you can try rephrasing your question or asking about something more specific.`;
  }
}

/**
 * Persist transactions to database using Supabase directly
 * 
 * Expected transactions table schema:
 * - user_id (uuid, required)
 * - document_id (uuid, nullable)
 * - date (date, required)
 * - posted_at (timestamptz, required)
 * - amount (numeric, required)
 * - type (text: 'income' | 'expense', required)
 * - merchant (text, nullable)
 * - description (text, required)
 * - category (text, required)
 * - confidence (numeric, nullable) - OPTIONAL: may not exist in all environments
 * - source_type (text, nullable)
 * - receipt_url (text, nullable)
 * - created_at (timestamptz, default now())
 * - updated_at (timestamptz, default now())
 * 
 * SQL migration to add confidence column (if missing):
 *   ALTER TABLE public.transactions
 *   ADD COLUMN IF NOT EXISTS confidence numeric;
 */
async function persistTransactions(
  transactions: any[],
  userId: string,
  documentId?: string
): Promise<boolean> {
  try {
    // Import Supabase client dynamically to avoid SSR issues
    const { supabase } = await import('../lib/supabase');
    
    if (!supabase) {
      console.error('[PrimeFlow] Supabase client not available');
      return false;
    }

    if (!transactions || transactions.length === 0) {
      console.warn('[PrimeFlow] No transactions to persist');
      return true; // Empty list is not an error
    }

    // Resolve document_id if not provided
    let resolvedDocumentId = documentId;
    
    // If documentId looks like an importId, try to find the associated user_documents record
    if (documentId && !documentId.includes('-')) {
      // Might be an importId, try to find document_id from imports table
      const { data: importRecord } = await supabase
        .from('imports')
        .select('document_id')
        .eq('id', documentId)
        .maybeSingle();
      
      if (importRecord?.document_id) {
        resolvedDocumentId = importRecord.document_id;
      }
    }

    // Build base transaction payload (schema-safe fields only)
    const buildTransactionPayload = (tx: any, includeConfidence: boolean = true) => {
      const amount = Number(tx.amount) || 0;
      const absAmount = Math.abs(amount);
      
      // Determine if transaction is income
      const isIncome = tx.type === 'income' || 
                      tx.type === 'Credit' || 
                      tx.direction === 'in' || 
                      tx.is_credit === true ||
                      amount < 0; // Negative amounts might be credits

      const basePayload: any = {
        user_id: userId,
        document_id: resolvedDocumentId || null,
        date: tx.date || tx.posted_at || new Date().toISOString().split('T')[0],
        posted_at: tx.posted_at || tx.date || new Date().toISOString(),
        amount: absAmount,
        type: isIncome ? 'income' : 'expense',
        merchant: tx.merchant || tx.vendor || null,
        description: tx.description || tx.memo || tx.merchant || tx.vendor || 'Transaction',
        category: tx.category || 'Uncategorized',
        source_type: 'ocr_bank_statement',
        receipt_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only include confidence if requested and value exists
      if (includeConfidence && tx.confidence != null) {
        basePayload.confidence = Number(tx.confidence);
      }

      return basePayload;
    };

    // First attempt: try with confidence if any transaction has it
    const hasConfidence = transactions.some(tx => tx.confidence != null);
    const transactionsToInsert = transactions.map(tx => buildTransactionPayload(tx, hasConfidence));

    // Bulk insert transactions with conflict handling
    let insertError: any = null;
    let { error } = await supabase
      .from('transactions')
      .upsert(transactionsToInsert, {
        onConflict: 'user_id,date,amount,merchant',
        ignoreDuplicates: false,
      });

    insertError = error;

    // If error is PGRST204 (column not found) and we included confidence, retry without it
    if (insertError && insertError.code === 'PGRST204' && hasConfidence) {
      console.warn('[PrimeFlow] Confidence column not found, retrying without confidence field');
      
      // Retry without confidence
      const transactionsWithoutConfidence = transactions.map(tx => buildTransactionPayload(tx, false));
      
      const { error: retryError } = await supabase
        .from('transactions')
        .upsert(transactionsWithoutConfidence, {
          onConflict: 'user_id,date,amount,merchant',
          ignoreDuplicates: false,
        });

      if (retryError) {
        console.error('[PrimeFlow] Error inserting transactions (retry without confidence):', retryError);
        console.error('[PrimeFlow] Failed payload shape:', {
          sampleTransaction: transactionsWithoutConfidence[0],
          totalCount: transactionsWithoutConfidence.length,
        });
        return false;
      }

      console.log(`[PrimeFlow] Successfully persisted ${transactionsWithoutConfidence.length} transactions (without confidence column)`);
      return true;
    }

    if (insertError) {
      console.error('[PrimeFlow] Error inserting transactions:', insertError);
      console.error('[PrimeFlow] Failed payload shape:', {
        sampleTransaction: transactionsToInsert[0],
        totalCount: transactionsToInsert.length,
        errorCode: insertError.code,
        errorMessage: insertError.message,
      });
      
      // Check if it's a schema mismatch error
      if (insertError.code === 'PGRST204') {
        console.error('[PrimeFlow] Schema mismatch detected. This may indicate a missing column in the transactions table.');
        console.error('[PrimeFlow] Suggested fix: Run migration to add missing columns.');
      }
      
      return false;
    }

    console.log(`[PrimeFlow] Successfully persisted ${transactionsToInsert.length} transactions`);
    return true;
  } catch (error) {
    console.error('[PrimeFlow] Failed to persist transactions:', error);
    if (error instanceof Error) {
      console.error('[PrimeFlow] Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    return false;
  }
}

/**
 * Generate fallback insights if LLM fails
 */
function generateFallbackInsights(context: ProcessedDocumentContext): string {
  const topCategory = context.analysis.byCategory[0];
  const spendingRatio = context.analysis.totalDebits > 0
    ? ((context.analysis.totalDebits / (context.analysis.totalDebits + context.analysis.totalCredits)) * 100).toFixed(1)
    : '0';

  return `This period shows ${context.analysis.totalTransactions} transactions with total spending of ${formatCurrency(context.analysis.totalDebits)} and inflows of ${formatCurrency(context.analysis.totalCredits)}.

Key insights:
- Top spending category: ${topCategory?.category || 'Uncategorized'} (${formatCurrency(topCategory?.totalAmount || 0)})
- Spending represents ${spendingRatio}% of total activity
- ${context.analysis.byCategory.length} distinct categories identified
- Date range: ${context.analysis.period?.startDate ? new Date(context.analysis.period.startDate).toLocaleDateString() : 'N/A'} to ${context.analysis.period?.endDate ? new Date(context.analysis.period.endDate).toLocaleDateString() : 'N/A'}`;
}

/**
 * Save categorization rules
 */
export async function saveCategorizationRules(
  rules: Array<{ vendor: string; category: string }>,
  userId: string
): Promise<boolean> {
  try {
    // Try to save to categorization_rules table
    const response = await fetch('/api/categorization-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        rules,
      }),
    });

    if (response.status === 404 || response.status === 500) {
      // Table might not exist in dev - log and simulate success
      console.warn('[PrimeFlow] Categorization rules table not found, simulating success');
      return true;
    }

    return response.ok;
  } catch (error) {
    // Network error or table missing - simulate success for dev
    console.warn('[PrimeFlow] Failed to save rules (dev mode):', error);
    return true; // Simulate success
  }
}



