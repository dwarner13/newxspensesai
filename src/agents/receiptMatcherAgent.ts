import { supabase } from '../lib/supabase';
import { Receipt, Transaction } from '../types/database.types';

// Helper: Calculate string similarity (Jaccard index for simplicity)
function stringSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\W+/));
  const setB = new Set(b.toLowerCase().split(/\W+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Helper: Check if two amounts are within $0.50
function amountsClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.5;
}

// Helper: Check if two dates are within ±3 days
function datesClose(dateA: string, dateB: string): boolean {
  const dA = new Date(dateA);
  const dB = new Date(dateB);
  const diff = Math.abs(dA.getTime() - dB.getTime());
  return diff <= 3 * 24 * 60 * 60 * 1000;
}

// Helper: Extract vendor from description
function extractVendor(description: string): string {
  return description
    .replace(/\b\d{4,}\b/g, '')
    .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, '')
    .replace(/(DEBIT|CREDIT|POS|PURCHASE|PAYMENT|ONLINE)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ').slice(0, 3).join(' ');
}

export async function matchReceiptsToTransactions(userId?: string): Promise<{
  matched: number;
  unmatched: number;
  matches: Array<{ receiptId: string; transactionId: string; score: number }>;
  unmatchedReceipts: Receipt[];
  errors: number;
}> {
  const report = {
    matched: 0,
    unmatched: 0,
    matches: [] as Array<{ receiptId: string; transactionId: string; score: number }> ,
    unmatchedReceipts: [] as Receipt[],
    errors: 0
  };

  try {
    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');
      userId = user.id;
    }

    // Fetch all unmatched receipts
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId)
      .is('transaction_id', null);
    if (receiptsError) throw receiptsError;

    // Fetch all transactions not linked to a receipt
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .or('receipt_url.is.null,receipt_url.eq."")');
    if (txError) throw txError;

    if (!receipts || receipts.length === 0) {
      return report;
    }
    if (!transactions || transactions.length === 0) {
      report.unmatchedReceipts = receipts;
      return report;
    }

    // Try to match each receipt to a transaction
    for (const receipt of receipts) {
      let bestScore = 0;
      let bestTx: Transaction | null = null;
      const receiptAmount = receipt.extracted_data?.amount || receipt.extracted_data?.total || null;
      const receiptDate = receipt.extracted_data?.date || receipt.upload_date;
      const receiptVendor = receipt.extracted_data?.vendor || extractVendor(receipt.original_filename);

      for (const tx of transactions) {
        if (!amountsClose(Number(receiptAmount), Number(tx.amount))) continue;
        if (!datesClose(receiptDate, tx.date)) continue;
        const txVendor = extractVendor(tx.description);
        const sim = stringSimilarity(receiptVendor, txVendor);
        if (sim > bestScore) {
          bestScore = sim;
          bestTx = tx;
        }
      }

      // Consider a match if similarity is at least 0.4
      if (bestTx && bestScore >= 0.4) {
        // Update transaction with receipt_url and update receipt with transaction_id
        try {
          await supabase
            .from('transactions')
            .update({ receipt_url: receipt.image_url })
            .eq('id', bestTx.id);
          await supabase
            .from('receipts')
            .update({ transaction_id: bestTx.id })
            .eq('id', receipt.id);
          report.matched++;
          report.matches.push({ receiptId: receipt.id, transactionId: bestTx.id, score: bestScore});
        } catch (err) {
          report.errors++;
        }
      } else {
        report.unmatched++;
        report.unmatchedReceipts.push(receipt);
      }
    }
    return report;
  } catch (error) {
    report.errors++;
    return report;
  }
} 