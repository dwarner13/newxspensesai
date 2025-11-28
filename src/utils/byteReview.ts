/**
 * Helper functions for building Byte's review messages
 */

import type { SmartDocType } from '../../types/smartImport';
import type { WorkerJobResult } from '../../services/WorkerService';

/**
 * Get friendly label for docType
 */
export function getDocTypeLabel(docType: SmartDocType | string): string {
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

/**
 * Check if there are uncategorized transactions and return info for user assistance
 */
export function getUncategorizedTransactions(result: WorkerJobResult): {
  count: number;
  examples: Array<{ date: string; vendor: string; amount: number; category: string }>;
  vendors: string[];
} | null {
  const uncategorized = result.transactions?.filter(
    (t: any) => !t.category || t.category === 'Uncategorized' || t.category === '(uncategorized)'
  ) || [];
  
  if (uncategorized.length === 0) {
    return null;
  }
  
  // Group by vendor
  const vendorMap = new Map<string, any[]>();
  for (const txn of uncategorized) {
    const vendor = (txn.merchant || txn.vendor || 'Unknown').trim();
    if (!vendorMap.has(vendor)) {
      vendorMap.set(vendor, []);
    }
    vendorMap.get(vendor)!.push(txn);
  }
  
  // Get examples (up to 5)
  const examples = uncategorized.slice(0, 5).map((txn: any) => ({
    date: txn.date || 'N/A',
    vendor: (txn.merchant || txn.vendor || 'Unknown').substring(0, 30),
    amount: txn.amount || 0,
    category: txn.category || 'Uncategorized',
  }));
  
  return {
    count: uncategorized.length,
    examples,
    vendors: Array.from(vendorMap.keys()),
  };
}

/**
 * Build message asking user to help categorize uncategorized transactions
 */
export function buildCategorizationHelpMessage(uncategorized: {
  count: number;
  examples: Array<{ date: string; vendor: string; amount: number; category: string }>;
}): string {
  const tableRows = uncategorized.examples.map(ex => 
    `| ${ex.date} | ${ex.vendor} | ${formatCurrency(ex.amount)} | ${ex.category} |`
  ).join('\n');
  
  return `I've categorized most of your transactions, but I still have **${uncategorized.count}** that need your input.

Here are a few examples:

| Date       | Vendor | Amount  | Current Category |
| ---------- | ------ | ------- | ---------------- |
${tableRows}

Would you like to help me categorize these so I can learn for the future?`;
}
export function buildByteReviewMessage(
  docType: SmartDocType,
  fileName: string,
  result: WorkerJobResult
): string {
  const docTypeLabel = getDocTypeLabel(docType);
  
  // Handle zero transactions case with OCR summary
  if (result.transactionCount === 0 || !result.analysis) {
    // Check if AI fallback was used (from metadata)
    const usedAiFallback = (result as any).metadata?.usedAiFallback || false;
    const ocrSummary = result.summary || 'I was able to read the document, but couldn\'t identify structured financial transactions.';
    
    let message = `I've finished reviewing your **${docTypeLabel}** _${fileName}_`;
    
    if (usedAiFallback) {
      message += `. I had to use my AI fallback parser because this was a screenshot or non-standard format, but I still couldn't extract any transactions.`;
    } else {
      message += `, but I couldn't reliably detect any structured financial transactions.`;
    }
    
    message += `\n\nHere's what I was able to read from it:\n\n${ocrSummary}\n\n`;
    
    if (usedAiFallback) {
      message += `This sometimes happens with very complex layouts or low-quality screenshots. You can try uploading a clearer version or ask me to help troubleshoot.`;
    } else {
      message += `This sometimes happens with unsupported formats or very low-quality scans. You can upload another file or ask me to help you troubleshoot.`;
    }
    
    return message;
  }

  const analysis = result.analysis;
  const summary = result.summary || generateFallbackSummary(docTypeLabel, fileName, analysis);
  
  // Check if any transactions are AI-inferred or AI fallback
  const hasAiInferred = result.transactions?.some((t: any) => t.source === 'ai_inferred') || false;
  const usedAiFallback = (result as any).metadata?.usedAiFallback || false;
  const usedVisionParse = (result as any).via === 'vision-parse' || (result as any).metadata?.via === 'vision-parse';
  
  // Build preview table (first 5-10 transactions)
  const previewTransactions = result.transactions?.slice(0, 10) || [];
  const previewCount = previewTransactions.length;
  const totalCount = result.transactionCount;
  
  let tableRows = previewTransactions.map((txn: any) => {
    const date = txn.date || 'N/A';
    const vendor = (txn.merchant || txn.vendor || 'Unknown').substring(0, 20);
    const amount = formatCurrency(txn.amount || 0);
    const category = txn.category || '(uncategorized)';
    return `| ${date} | ${vendor} | ${amount} | ${category} |`;
  }).join('\n');
  
  // Build category breakdown
  const categoryLines = analysis.byCategory
    .slice(0, 10) // Top 10 categories
    .map(cat => `- **${cat.category}**: ${cat.count} transaction${cat.count !== 1 ? 's' : ''} · ${formatCurrency(cat.totalAmount)}`)
    .join('\n');

  let message = `I've finished reviewing your **${docTypeLabel}** _${fileName}_.

**Document summary**

${summary}`;

  // Add preview table if transactions exist
  if (previewCount > 0) {
    message += `\n\n**Here's a preview of the transactions I extracted:**

| Date       | Vendor         | Amount  | Category      |
| ---------- | -------------- | ------- | ------------- |
${tableRows}

_Showing ${previewCount} of ${totalCount} transaction${totalCount !== 1 ? 's' : ''}. You can view the full list in Smart Import AI._`;
    
    if (hasAiInferred) {
      message += `\n\n_Note: Some transactions are inferred from the text and may need your confirmation._`;
    }
    
    if (usedAiFallback) {
      message += `\n\n_Note: I used my AI fallback parser for this screenshot/statement format. Please review the transactions carefully._`;
    }
    
    if (usedVisionParse) {
      message += `\n\n_Note: I used my Vision OCR fallback to read this image statement. Please review the transactions carefully._`;
    }
  }

  message += `\n\n**By category**

${categoryLines}

You can view all extracted transactions in the Smart Import AI dashboard for further review.

If you'd like, ask me about a specific vendor or date range and I'll break it down for you.`;

  return message;
}

/**
 * Generate fallback summary if LLM summary is not available
 */
function generateFallbackSummary(docTypeLabel: string, fileName: string, analysis: any): string {
  const dateRange = analysis.period?.startDate && analysis.period?.endDate
    ? ` covering ${new Date(analysis.period.startDate).toLocaleDateString()} to ${new Date(analysis.period.endDate).toLocaleDateString()}`
    : '';

  const spendingText = analysis.totalDebits > 0 
    ? `with total spending of ${formatCurrency(analysis.totalDebits)}`
    : '';
  const incomeText = analysis.totalCredits > 0
    ? ` and inflows of ${formatCurrency(analysis.totalCredits)}`
    : '';

  const topCategory = analysis.byCategory?.[0];
  const categoryText = topCategory
    ? ` Top spending category is ${topCategory.category} with ${topCategory.count} transaction${topCategory.count !== 1 ? 's' : ''}.`
    : '';

  return `This ${docTypeLabel}${dateRange} contains ${analysis.totalTransactions} transaction${analysis.totalTransactions !== 1 ? 's' : ''} ${spendingText}${incomeText}.${categoryText}`;
}

