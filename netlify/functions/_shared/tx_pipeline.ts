/**
 * Transaction Pipeline
 * 
 * Day 16: Supercharged Intelligence Layer
 * 
 * Auto-categorizes transactions with confidence scoring.
 * Includes reflection/retry logic for low-confidence results.
 */

import { normalizeVendor } from './vendor_normalize';
import { categorizeTransactionWithLearning } from './categorize';

export interface CategorizedRow {
  id: number;
  date: string;
  vendor: string;
  amount: number;
  category: string;
  confidence: number;
}

export interface CategorizeResult {
  rows: CategorizedRow[];
  needsReview: boolean;
}

/**
 * Auto-categorize transaction rows
 * 
 * Stage A: Vendor normalization
 * Stage B: Category assignment with confidence (using Tag learning)
 * Reflection: Flag if too many low-confidence results
 * 
 * @param input - Transaction rows to categorize
 * @param userId - User ID for learning (required for Tag learning)
 */
export async function autoCategorize(
  input: {
    rows: Array<{ date: string; description: string; amount: number }>;
  },
  userId?: string
): Promise<CategorizeResult> {
  // Stage A: Normalize vendors
  const items = input.rows.map((r, i) => {
    const normalized = normalizeVendor(r.description);
    return {
      id: i,
      ...r,
      vendor: normalized.vendor,
      vendorConfidence: normalized.confidence
    };
  });
  
  // Stage B: Assign categories with confidence using Tag learning
  // If userId provided, use categorizeTransactionWithLearning (includes learning)
  // Otherwise fall back to simple rules
  const out = await Promise.all(
    items.map(async (x) => {
      // Income detection (positive amounts)
      if (x.amount > 0) {
        return {
          id: x.id,
          date: x.date,
          vendor: x.vendor,
          amount: x.amount,
          category: 'Income',
          confidence: 0.95
        };
      }
      
      // Use Tag learning if userId provided
      if (userId) {
        try {
          const result = await categorizeTransactionWithLearning({
            userId: userId,
            merchant: x.vendor,
            description: x.description,
            amount: x.amount
          });
          
          return {
            id: x.id,
            date: x.date,
            vendor: x.vendor,
            amount: x.amount,
            category: result.category,
            confidence: result.confidence
          };
        } catch (error) {
          console.error('[tx_pipeline] Categorization error:', error);
          // Fall through to simple rules
        }
      }
      
      // Fallback: Simple rule-based categorization
      let category = 'Other';
      let confidence = 0.6;
      
      const vendorUpper = x.vendor.toUpperCase();
      const descUpper = x.description.toUpperCase();
      
      // Category rules (vendor-based)
      if (vendorUpper.includes('SAFEWAY') || vendorUpper.includes('COSTCO') || vendorUpper.includes('WALMART')) {
        category = 'Groceries';
        confidence = 0.9;
      } else if (vendorUpper.includes('SHELL') || vendorUpper.includes('PETRO') || vendorUpper.includes('ESSO')) {
        category = 'Transport';
        confidence = 0.85;
      } else if (vendorUpper.includes('NETFLIX') || vendorUpper.includes('SPOTIFY') || vendorUpper.includes('DISNEY')) {
        category = 'Entertainment';
        confidence = 0.95;
      } else if (vendorUpper.includes('AMAZON') || descUpper.includes('AMAZON')) {
        category = 'Shopping';
        confidence = 0.8;
      } else if (vendorUpper.includes('STARBUCKS') || vendorUpper.includes('TIM HORTONS') || vendorUpper.includes('MCDONALDS')) {
        category = 'Food & Dining';
        confidence = 0.85;
      } else if (descUpper.includes('PAYROLL') || descUpper.includes('SALARY') || descUpper.includes('GFS')) {
        category = 'Income';
        confidence = 0.95;
      } else if (vendorUpper.includes('UBER') || vendorUpper.includes('LYFT')) {
        category = 'Transport';
        confidence = 0.9;
      }
      
      // Boost confidence if vendor was matched with high confidence
      if (x.vendorConfidence > 0.9) {
        confidence = Math.min(confidence + 0.1, 0.98);
      }
      
      return {
        id: x.id,
        date: x.date,
        vendor: x.vendor,
        amount: x.amount,
        category,
        confidence
      };
    })
  );
  
  // Reflection: Flag if too many low-confidence results
  const lowConfidence = out.filter(o => o.confidence < 0.6).length;
  const needsReview = lowConfidence > 2;
  
  return {
    rows: out,
    needsReview
  };
}











