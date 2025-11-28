/**
 * Interactive Categorization Flow Utilities
 * Handles vendor-by-vendor categorization with user assistance
 */

import type { ProcessedDocumentContext, NormalizedTransaction } from '../../types/processedDocument';

export interface VendorCategorizationState {
  vendor: string;
  examples: NormalizedTransaction[];
  transactionIds: string[];
  currentIndex: number;
  totalVendors: number;
}

export const STANDARD_CATEGORIES = [
  'Groceries',
  'Restaurants',
  'Entertainment',
  'Transport',
  'Utilities',
  'Shopping',
  'Healthcare',
  'Education',
  'Subscriptions',
  'Fees',
  'Income',
  'Other',
];

/**
 * Group uncategorized transactions by vendor
 */
export function groupUncategorizedByVendor(
  transactions: NormalizedTransaction[]
): Map<string, NormalizedTransaction[]> {
  const vendorMap = new Map<string, NormalizedTransaction[]>();
  
  for (const txn of transactions) {
    if (!txn.category || txn.category === 'Uncategorized' || txn.category === '(uncategorized)') {
      const vendor = (txn.vendor || txn.merchant || 'Unknown').trim();
      if (!vendorMap.has(vendor)) {
        vendorMap.set(vendor, []);
      }
      vendorMap.get(vendor)!.push(txn);
    }
  }
  
  return vendorMap;
}

/**
 * Build vendor categorization state for interactive flow
 */
export function buildVendorCategorizationState(
  transactions: NormalizedTransaction[]
): VendorCategorizationState[] {
  const vendorMap = groupUncategorizedByVendor(transactions);
  const vendors = Array.from(vendorMap.entries());
  
  return vendors.map(([vendor, txns], index) => ({
    vendor,
    examples: txns.slice(0, 3), // Up to 3 examples
    transactionIds: txns.map(t => t.id || `${vendor}-${index}-${txns.indexOf(t)}`),
    currentIndex: index,
    totalVendors: vendors.length,
  }));
}

/**
 * Update vendor category via API
 */
export async function updateVendorCategory(
  userId: string,
  documentId: string,
  vendor: string,
  category: string,
  transactionIds: string[]
): Promise<{ success: boolean; updatedCount: number; message: string }> {
  try {
    const response = await fetch('/.netlify/functions/update-vendor-category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        documentId,
        vendor,
        category,
        transactionIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: result.success || false,
      updatedCount: result.updatedCount || 0,
      message: result.message || `Updated ${vendor} to ${category}`,
    };
  } catch (error) {
    console.error('[CategorizationFlow] Failed to update vendor category:', error);
    return {
      success: false,
      updatedCount: 0,
      message: `Failed to update category: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Build Byte's message for vendor categorization prompt
 */
export function buildVendorCategorizationPrompt(
  vendorState: VendorCategorizationState
): string {
  const examples = vendorState.examples.map(txn => 
    `- ${txn.date || 'N/A'} | ${txn.description || txn.vendor || 'N/A'} | ${formatCurrency(txn.amount || 0)}`
  ).join('\n');

  return `How should I categorize transactions from **${vendorState.vendor}**?

Examples:
${examples}

Choose a category:`;
}

/**
 * Format currency helper
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Build completion message after all vendors are categorized
 */
export function buildCategorizationCompleteMessage(
  categorizedVendors: Array<{ vendor: string; category: string; count: number }>
): string {
  const vendorList = categorizedVendors.map(v => 
    `- **${v.vendor}** → ${v.category} (${v.count} transaction${v.count !== 1 ? 's' : ''})`
  ).join('\n');

  return `Thanks! I've updated the remaining transactions:

${vendorList}

I'll remember these choices and apply them on future imports.`;
}










