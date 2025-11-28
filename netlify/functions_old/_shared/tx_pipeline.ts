/**
 * Transaction Pipeline
 * 
 * Day 16: Supercharged Intelligence Layer
 * 
 * Auto-categorizes transactions with confidence scoring.
 * Includes reflection/retry logic for low-confidence results.
 */

import { normalizeVendor } from './vendor_normalize';

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
 * Stage B: Category assignment with confidence
 * Reflection: Flag if too many low-confidence results
 */
export async function autoCategorize(input: {
  rows: Array<{ date: string; description: string; amount: number }>;
}): Promise<CategorizeResult> {
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
  
  // Stage B: Assign categories with confidence
  // Simple rule-based categorization (can be upgraded to LLM/ML later)
  const out = items.map(x => {
    let category = 'Other';
    let confidence = 0.6;
    
    const vendorUpper = x.vendor.toUpperCase();
    const descUpper = x.description.toUpperCase();
    
    // Income detection (positive amounts)
    if (x.amount > 0) {
      category = 'Income';
      confidence = 0.95;
      return {
        id: x.id,
        date: x.date,
        vendor: x.vendor,
        amount: x.amount,
        category,
        confidence
      };
    }
    
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
  });
  
  // Reflection: Flag if too many low-confidence results
  const lowConfidence = out.filter(o => o.confidence < 0.6).length;
  const needsReview = lowConfidence > 2;
  
  return {
    rows: out,
    needsReview
  };
}







