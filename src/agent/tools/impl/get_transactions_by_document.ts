// @wiring:byte-docs
// @area:tools/get_transactions_by_document
// @purpose:Fetches extracted transactions linked to a document (no guessing).

import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'get_transactions_by_document';

export const inputSchema = z.object({
  documentId: z.string().uuid('documentId must be a valid UUID'),
  limit: z.number().min(1).max(500).optional().default(100),
});

export const outputSchema = z.object({
  transactions: z.array(z.object({
    id: z.string(),
    date: z.string().nullable(),
    description: z.string().nullable(),
    merchant: z.string().nullable(),
    amount: z.number(),
    category: z.string().nullable(),
    type: z.string().nullable(),
  })),
  total: z.number(),
  summary: z.object({
    totalAmount: z.number(),
    totalExpenses: z.number(),
    totalIncome: z.number(),
    uncategorizedCount: z.number(),
  }),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Get transactions linked to a specific document
 * 
 * Use this when Tag needs to categorize transactions from a specific upload,
 * or when Prime needs to show transaction details for a document.
 * Only returns transactions owned by the user (RLS-safe).
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();

    // First verify the document exists and belongs to the user
    const { data: document, error: docError } = await supabase
      .from('user_documents')
      .select('id')
      .eq('id', input.documentId)
      .eq('user_id', userId) // RLS-safe: filter by user_id
      .maybeSingle();

    if (docError) {
      console.error('[get_transactions_by_document] Document lookup error:', {
        error: docError.message,
        code: docError.code,
        userId,
        documentId: input.documentId,
      });
      throw docError;
    }

    if (!document) {
      return Err(new Error(`Document ${input.documentId} not found or not accessible`));
    }

    // Find imports linked to this document
    const { data: imports, error: importsError } = await supabase
      .from('imports')
      .select('id')
      .eq('document_id', input.documentId)
      .eq('user_id', userId); // RLS-safe: filter by user_id

    if (importsError) {
      console.error('[get_transactions_by_document] Imports lookup error:', {
        error: importsError.message,
        code: importsError.code,
        userId,
        documentId: input.documentId,
      });
      throw importsError;
    }

    const importIds = (imports || []).map(imp => imp.id);

    if (importIds.length === 0) {
      // No imports found - return empty result
      return Ok({
        transactions: [],
        total: 0,
        summary: {
          totalAmount: 0,
          totalExpenses: 0,
          totalIncome: 0,
          uncategorizedCount: 0,
        },
      });
    }

    // Query transactions linked to this document
    // Check both document_id and import_id paths
    // First try document_id
    let query = supabase
      .from('transactions')
      .select('id, date, description, merchant, amount, category, type')
      .eq('user_id', userId) // RLS-safe: filter by user_id
      .eq('document_id', input.documentId);

    const { data: transactionsByDoc, error: docTxError } = await query;

    // If no transactions found by document_id, try import_id
    let transactions = transactionsByDoc || [];
    if (transactions.length === 0 && importIds.length > 0) {
      const { data: transactionsByImport, error: importTxError } = await supabase
        .from('transactions')
        .select('id, date, description, merchant, amount, category, type')
        .eq('user_id', userId)
        .in('import_id', importIds);

      if (importTxError) {
        console.error('[get_transactions_by_document] Import transactions query error:', {
          error: importTxError.message,
          code: importTxError.code,
        });
        // Continue with empty array if this fails
      } else {
        transactions = transactionsByImport || [];
      }
    }

    const txError = docTxError;

    if (txError) {
      console.error('[get_transactions_by_document] Transactions query error:', {
        error: txError.message,
        code: txError.code,
        userId,
        documentId: input.documentId,
      });
      throw txError;
    }

    // Sort by date descending and apply limit
    const txns = transactions
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, input.limit);

    // Calculate summary
    const totalAmount = txns.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const totalExpenses = txns
      .filter(t => t.type === 'expense' || (t.type === null && (t.amount || 0) < 0))
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const totalIncome = txns
      .filter(t => t.type === 'income' || (t.type === null && (t.amount || 0) > 0))
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const uncategorizedCount = txns.filter(t => !t.category).length;

    // Dev mode: Log tool execution
    if (process.env.NETLIFY_DEV === 'true') {
      console.log('[get_transactions_by_document] Tool executed:', {
        userId,
        documentId: input.documentId,
        importIds,
        transactionsFound: txns.length,
        totalAmount,
        uncategorizedCount,
      });
    }

    return Ok({
      transactions: txns.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        merchant: t.merchant,
        amount: t.amount || 0,
        category: t.category,
        type: t.type,
      })),
      total: txns.length,
      summary: {
        totalAmount,
        totalExpenses,
        totalIncome,
        uncategorizedCount,
      },
    });
  } catch (error) {
    console.error('[get_transactions_by_document] Error:', error);
    return Err(error as Error);
  }
}

