/**
 * Document Analysis and Summary Generation
 * Computes analytics and generates natural-language summaries for processed documents
 */

import type { Transaction } from '../categorize/index.js';

export interface DocumentAnalysis {
  totalTransactions: number;
  totalDebits: number;      // sum of negative amounts
  totalCredits: number;     // sum of positive amounts
  byCategory: Array<{
    category: string;
    count: number;
    totalAmount: number;    // sum of amounts in that category
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

/**
 * Compute document analysis from categorized transactions
 */
export function computeDocumentAnalysis(transactions: Transaction[]): DocumentAnalysis {
  if (transactions.length === 0) {
    return {
      totalTransactions: 0,
      totalDebits: 0,
      totalCredits: 0,
      byCategory: [],
      topVendors: [],
      period: {
        startDate: null,
        endDate: null,
      },
    };
  }

  // Calculate totals
  let totalDebits = 0;
  let totalCredits = 0;
  
  // Group by category
  const categoryMap = new Map<string, { count: number; totalAmount: number }>();
  
  // Group by vendor
  const vendorMap = new Map<string, { count: number; totalAmount: number }>();
  
  // Track dates
  const dates: string[] = [];

  for (const transaction of transactions) {
    const amount = Math.abs(transaction.amount); // Use absolute value for grouping
    const isDebit = transaction.direction === 'debit' || transaction.amount < 0;
    
    // Track debits (money going out) and credits (money coming in)
    if (isDebit) {
      totalDebits += amount;
    } else {
      totalCredits += amount;
    }
    
    // Group by category
    const category = transaction.category || 'Uncategorized';
    const existing = categoryMap.get(category) || { count: 0, totalAmount: 0 };
    categoryMap.set(category, {
      count: existing.count + 1,
      totalAmount: existing.totalAmount + amount,
    });
    
    // Group by vendor/merchant
    const vendor = transaction.merchant || 'Unknown';
    const vendorExisting = vendorMap.get(vendor) || { count: 0, totalAmount: 0 };
    vendorMap.set(vendor, {
      count: vendorExisting.count + 1,
      totalAmount: vendorExisting.totalAmount + amount,
    });
    
    // Track dates
    if (transaction.date) {
      dates.push(transaction.date);
    }
  }

  // Convert maps to arrays and sort
  const byCategory = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      totalAmount: data.totalAmount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const topVendors = Array.from(vendorMap.entries())
    .map(([vendor, data]) => ({
      vendor,
      count: data.count,
      totalAmount: data.totalAmount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10); // Top 10 vendors

  // Determine date range
  let startDate: string | null = null;
  let endDate: string | null = null;
  
  if (dates.length > 0) {
    const sortedDates = dates.sort();
    startDate = sortedDates[0];
    endDate = sortedDates[sortedDates.length - 1];
  }

  return {
    totalTransactions: transactions.length,
    totalDebits,
    totalCredits,
    byCategory,
    topVendors,
    period: {
      startDate,
      endDate,
    },
  };
}

/**
 * Generate natural-language summary using LLM
 */
export async function summarizeDocumentForChat(
  docType: string,
  fileName: string,
  analysis: DocumentAnalysis,
  apiKey: string,
  invoiceFallbackTransaction?: any // Optional: transaction created via invoice fallback
): Promise<string> {
  try {
    // Build context for the LLM
    const categoryBreakdown = analysis.byCategory
      .slice(0, 5) // Top 5 categories
      .map(cat => `${cat.category}: ${cat.count} transactions, $${cat.totalAmount.toFixed(2)}`)
      .join('; ');

    const dateRange = analysis.period?.startDate && analysis.period?.endDate
      ? `from ${new Date(analysis.period.startDate).toLocaleDateString()} to ${new Date(analysis.period.endDate).toLocaleDateString()}`
      : '';

    let prompt = `You are Byte — the document intelligence specialist inside XspensesAI.

Your job is to read any document and extract smart financial insights from it — just like ChatGPT does.

CORE RESPONSIBILITIES:
- Interpret documents like a human — identify transactions, merchant names, totals, taxes, fees, balances, dates, interest, credits & debits
- Explain the document clearly: what type it is, what stands out, total spent, most important numbers, anything concerning, anything beneficial
- NEVER say "I cannot read this" — always work with what you have
- Be friendly, helpful, and conversational — Byte should feel like a smart assistant, not a robot

ADVANCED ANALYSIS:
- Totals & category grouping
- Pattern detection
- Spending summaries
- Interest calculations
- Daily/weekly/monthly averages
- Payment recommendations
- "What this means for your finances" explanations
- Red flag detection

PERSONALITY:
- Smart, calm, observant
- The analytical, detail-focused teammate who can calmly read ANYTHING
- Be conversational and warm — like a smart assistant who cares

Generate a clear, helpful summary of this processed ${docType}:

Document: ${fileName}
Total transactions: ${analysis.totalTransactions}
Total debits (spending): $${analysis.totalDebits.toFixed(2)}
Total credits (income): $${analysis.totalCredits.toFixed(2)}
Date range: ${dateRange || 'Not specified'}
Top categories: ${categoryBreakdown}`;

    // Add note if invoice fallback was used
    if (invoiceFallbackTransaction) {
      prompt += `\n\nIMPORTANT: This document appeared to be a single invoice/receipt. I created 1 inferred transaction from it:
- Merchant: ${invoiceFallbackTransaction.merchant || 'Unknown'}
- Date: ${invoiceFallbackTransaction.date || 'Unknown'}
- Amount: $${invoiceFallbackTransaction.amount || 0}
Please mention in your summary that this transaction was inferred from an invoice/receipt and may need review.`;
    }

    prompt += `\n\nYour summary should:
- Explain what type of document this is (invoice, bank statement, credit card statement, receipt)
- Highlight what stands out: total spent, most important numbers, key patterns
- Mention anything concerning (fees, unusual activity) or beneficial (savings, good patterns)
- Provide a clear summary in plain English
- Be conversational and warm — like explaining to a friend
- Keep it concise but informative (2-3 sentences)
- Focus on transaction count, overall spending vs inflows, and top spending categories
- Use patterns rather than specific vendor names (e.g., "several restaurant transactions" or "recurring utility payments")
${invoiceFallbackTransaction ? '- If this was an invoice fallback, mention that 1 transaction was inferred and may need review' : ''}

PII has already been redacted from this document.

Generate only the summary text, no markdown formatting or labels. Write naturally, like you're explaining to a friend.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Byte — the document intelligence specialist inside XspensesAI. Your job is to read any document and extract smart financial insights from it — just like ChatGPT does. You interpret documents like a human, identify transactions/merchants/totals/dates/patterns, explain documents clearly, and NEVER say "I cannot read this" — always work with what you have. Be smart, calm, observant, and conversational — like a smart assistant who cares.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const result: any = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      // Fallback to a simple summary if LLM fails
      return generateFallbackSummary(docType, fileName, analysis);
    }

    return content.trim();
  } catch (error) {
    console.warn('[DocumentSummary] LLM summary generation failed, using fallback:', error);
    return generateFallbackSummary(docType, fileName, analysis);
  }
}

/**
 * Generate a fallback summary if LLM fails
 */
function generateFallbackSummary(
  docType: string,
  fileName: string,
  analysis: DocumentAnalysis
): string {
  const docTypeLabel = getDocTypeLabel(docType);
  const dateRange = analysis.period?.startDate && analysis.period?.endDate
    ? ` covering ${new Date(analysis.period.startDate).toLocaleDateString()} to ${new Date(analysis.period.endDate).toLocaleDateString()}`
    : '';

  if (analysis.totalTransactions === 0) {
    return `Here's what I can see from your ${docTypeLabel}: I've finished reviewing it, but I couldn't reliably detect any structured financial transactions. My best interpretation is that this sometimes happens with unsupported formats, very low-quality scans, or documents that don't follow standard statement layouts. The document has been saved and I can read the OCR text if you have questions about it — feel free to ask me anything specific!`;
  }

  const topCategory = analysis.byCategory[0];
  const spendingText = analysis.totalDebits > 0 
    ? `with total spending of $${analysis.totalDebits.toFixed(2)}`
    : '';
  const incomeText = analysis.totalCredits > 0
    ? ` and ${analysis.totalCredits > 0 ? 'inflows' : ''} of $${analysis.totalCredits.toFixed(2)}`
    : '';

  return `This ${docTypeLabel}${dateRange} contains ${analysis.totalTransactions} transaction${analysis.totalTransactions !== 1 ? 's' : ''} ${spendingText}${incomeText}. What stands out: your top spending category is ${topCategory?.category || 'Uncategorized'} with ${topCategory?.count || 0} transaction${topCategory?.count !== 1 ? 's' : ''} totaling $${topCategory?.totalAmount.toFixed(2) || '0.00'}.`;
}

/**
 * Get friendly label for docType
 */
function getDocTypeLabel(docType: string): string {
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

