/**
 * OCR Normalizer Module
 * 
 * Day 9: Convert ParsedDoc → NormalizedTransaction[]
 * 
 * Functions:
 * - toTransactions: Map invoice/receipt/bank to normalized transactions
 * - categorize: Auto-categorize transactions (rules + Tag fallback)
 * - linkToDocument: Link transaction to document (non-blocking)
 */

import { ParsedDoc, InvoiceData, ReceiptData } from './ocr_parsers';
import { maskPII } from './pii';

export type NormalizedTransaction = {
  userId: string;
  kind: 'invoice' | 'receipt' | 'bank';
  date?: string;
  merchant?: string;
  amount?: number;
  currency?: string;
  items?: Array<{
    name: string;
    qty?: number;
    unit?: string;
    price?: number;
  }>;
  docId?: string;
};

export interface CategorizationResult {
  category: string;
  subcategory?: string;
  confidence: number;
  method: 'rules' | 'tag';
}

/**
 * Convert ParsedDoc to normalized transactions
 */
export function toTransactions(userId: string, parsed: ParsedDoc | null): NormalizedTransaction[] {
  if (!parsed) {
    return [];
  }
  
  const transactions: NormalizedTransaction[] = [];
  
  if (parsed.kind === 'receipt' && parsed.data) {
    const receipt = parsed.data as ReceiptData;
    
    // Extract date (normalize formats)
    let normalizedDate: string | undefined;
    if (receipt.date) {
      normalizedDate = normalizeDate(receipt.date);
    }
    
    // Extract currency
    const currency = extractCurrency(receipt);
    
    // Extract amount (prefer total)
    const amount = receipt.total || 0;
    
    // Create transaction
    const tx: NormalizedTransaction = {
      userId,
      kind: 'receipt',
      date: normalizedDate,
      merchant: receipt.merchant,
      amount,
      currency,
      items: receipt.items?.map(item => ({
        name: item.name,
        qty: item.qty,
        price: item.price
      })),
      docId: undefined // Will be set by caller
    };
    
    if (amount > 0) {
      transactions.push(tx);
    }
  } else if (parsed.kind === 'invoice' && parsed.data) {
    const invoice = parsed.data as InvoiceData;
    
    // Extract date
    let normalizedDate: string | undefined;
    if (invoice.date) {
      normalizedDate = normalizeDate(invoice.date);
    }
    
    // Extract currency
    const currency = invoice.currency || extractCurrencyFromInvoice(invoice);
    
    // Extract amount (prefer total, fallback to subtotal + tax)
    const amount = invoice.total || (invoice.subtotal && invoice.tax ? invoice.subtotal + invoice.tax : invoice.subtotal) || 0;
    
    // Create transaction
    const tx: NormalizedTransaction = {
      userId,
      kind: 'invoice',
      date: normalizedDate,
      merchant: invoice.vendor,
      amount,
      currency,
      items: invoice.line_items?.map(item => ({
        name: item.desc,
        qty: item.qty,
        unit: item.unit,
        price: item.price
      })),
      docId: undefined // Will be set by caller
    };
    
    if (amount > 0) {
      transactions.push(tx);
    }
  } else if (parsed.kind === 'bank' && parsed.data) {
    // Bank statement parsing (minimal for Phase 1)
    // Future: Extract multiple transactions from statement
    const bank = parsed.data as any;
    
    if (bank.transactions && Array.isArray(bank.transactions)) {
      for (const bankTx of bank.transactions) {
        const tx: NormalizedTransaction = {
          userId,
          kind: 'bank',
          date: bankTx.date ? normalizeDate(bankTx.date) : undefined,
          merchant: bankTx.merchant || bankTx.description,
          amount: bankTx.amount,
          currency: bankTx.currency || 'USD',
          docId: undefined
        };
        
        if (tx.amount && tx.amount !== 0) {
          transactions.push(tx);
        }
      }
    }
  }
  
  return transactions;
}

/**
 * Normalize date string to YYYY-MM-DD format
 */
function normalizeDate(dateStr: string): string | undefined {
  try {
    // Try common formats
    // DD/MM/YYYY or MM/DD/YYYY
    const slashMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (slashMatch) {
      const [, part1, part2, year] = slashMatch;
      const yearNum = parseInt(year.length === 2 ? `20${year}` : year);
      // Assume MM/DD/YYYY (US format)
      const month = parseInt(part1);
      const day = parseInt(part2);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${yearNum}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    // Try YYYY-MM-DD
    const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return dateStr;
    }
    
    // Try MMM DD, YYYY
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthMatch = dateStr.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i);
    if (monthMatch) {
      const [, monthStr, day, year] = monthMatch;
      const monthIndex = monthNames.findIndex(m => m === monthStr.toLowerCase().substring(0, 3));
      if (monthIndex >= 0) {
        return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    // Try parsing as Date
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // Ignore parse errors
  }
  
  return undefined;
}

/**
 * Extract currency from receipt
 */
function extractCurrency(receipt: ReceiptData): string {
  // Default to USD
  return 'USD';
}

/**
 * Extract currency from invoice
 */
function extractCurrencyFromInvoice(invoice: InvoiceData): string {
  if (invoice.currency) {
    return invoice.currency.toUpperCase();
  }
  // Check for currency symbols in totals
  return 'USD';
}

/**
 * Categorize transaction using deterministic rules first, then Tag LLM fallback
 */
export async function categorize(tx: NormalizedTransaction): Promise<CategorizationResult> {
  // Deterministic rules first
  const merchant = (tx.merchant || '').toLowerCase();
  
  // Groceries
  const groceryKeywords = ['save-on-foods', 'sobeys', 'walmart', 'target', 'safeway', 'kroger', 'whole foods', 'costco', 'superstore'];
  if (groceryKeywords.some(kw => merchant.includes(kw))) {
    return { category: 'Groceries', confidence: 0.9, method: 'rules' };
  }
  
  // Fuel/Gas
  const fuelKeywords = ['shell', 'esso', 'chevron', 'bp', 'exxon', 'petro-canada', 'gas station', 'petrol'];
  if (fuelKeywords.some(kw => merchant.includes(kw))) {
    return { category: 'Transportation', subcategory: 'Fuel', confidence: 0.9, method: 'rules' };
  }
  
  // Restaurants
  const restaurantKeywords = ['grill', 'café', 'cafe', 'pizza', 'restaurant', 'diner', 'bistro', 'starbucks', 'tim hortons', 'mcdonalds', 'subway'];
  if (restaurantKeywords.some(kw => merchant.includes(kw))) {
    return { category: 'Dining', confidence: 0.85, method: 'rules' };
  }
  
  // Office Supplies
  const officeKeywords = ['staples', 'office depot', 'office max'];
  if (officeKeywords.some(kw => merchant.includes(kw))) {
    return { category: 'Office', subcategory: 'Supplies', confidence: 0.85, method: 'rules' };
  }
  
  // Utilities
  const utilityKeywords = ['hydro', 'electric', 'gas company', 'water', 'internet', 'phone', 'cable'];
  if (utilityKeywords.some(kw => merchant.includes(kw))) {
    return { category: 'Utilities', confidence: 0.85, method: 'rules' };
  }
  
  // Default confidence if no rules match
  let confidence = 0.5;
  
  // If confidence is low, try Tag LLM fallback
  if (confidence < 0.6) {
    try {
      const tagResult = await categorizeWithTag(tx);
      if (tagResult.confidence > confidence) {
        return tagResult;
      }
    } catch (e) {
      console.warn('[OCR Normalize] Tag categorization failed, using default:', e);
    }
  }
  
  // Default category
  return { category: 'Uncategorized', confidence: 0.5, method: 'rules' };
}

/**
 * Categorize using Tag LLM (fallback when rules don't match)
 */
async function categorizeWithTag(tx: NormalizedTransaction): Promise<CategorizationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Mask PII before sending to LLM
  const maskedMerchant = maskPII(tx.merchant || '', 'last4').masked;
  const maskedItems = tx.items?.map(item => ({
    ...item,
    name: maskPII(item.name, 'last4').masked
  }));
  
  const prompt = `Categorize this transaction into one of these categories:
- Groceries
- Dining
- Transportation (with subcategory: Fuel, Parking, Public Transit, etc.)
- Utilities
- Office (with subcategory: Supplies, Equipment, etc.)
- Shopping (with subcategory: Clothing, Electronics, etc.)
- Healthcare
- Entertainment
- Education
- Uncategorized

Transaction:
- Merchant: ${maskedMerchant || 'N/A'}
- Amount: ${tx.amount ? '$' + tx.amount : 'N/A'}
- Date: ${tx.date || 'N/A'}
- Items: ${maskedItems?.map(i => i.name).join(', ') || 'N/A'}

Respond with JSON:
{
  "category": "category name",
  "subcategory": "optional subcategory",
  "confidence": 0.0-1.0
}`;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category || 'Uncategorized',
        subcategory: parsed.subcategory,
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        method: 'tag'
      };
    }
    
    throw new Error('Failed to parse Tag response');
  } catch (error: any) {
    console.error('[OCR Normalize] Tag categorization error:', error);
    throw error;
  }
}

/**
 * Link transaction to document (non-blocking)
 */
export async function linkToDocument(txId: number, docId: string): Promise<void> {
  // This will be implemented in transactions_store.ts
  // For now, it's a no-op (link is stored in transaction.doc_id)
}

/**
 * Normalize bank statement text into transaction array
 * 
 * Parses raw OCR text from bank statements and extracts transactions.
 * Returns array of transactions with: date, merchant, description, amount, category, raw_line_text
 */
export function normalizeBankStatement(rawText: string): Array<{
  date?: string;
  merchant?: string;
  description?: string;
  amount: number;
  category?: string;
  raw_line_text?: string;
}> {
  const transactions: Array<{
    date?: string;
    merchant?: string;
    description?: string;
    amount: number;
    category?: string;
    raw_line_text?: string;
  }> = [];
  
  const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 5);
  
  // Common bank statement patterns
  const patterns = [
    // Pattern 1: Date Description Amount (most common)
    // e.g., "01/15/2024 WALMART #1234 $45.67"
    {
      regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/,
      groups: { date: 1, description: 2, amount: 3 }
    },
    // Pattern 2: Date Amount Description
    // e.g., "01/15/2024 $45.67 WALMART #1234"
    {
      regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(.+)$/,
      groups: { date: 1, amount: 2, description: 3 }
    },
    // Pattern 3: Description Date Amount
    {
      regex: /^(.+?)\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/,
      groups: { description: 1, date: 2, amount: 3 }
    },
    // Pattern 4: Credit card format: Date Description Amount
    // e.g., "01/15 WALMART #1234 $45.67"
    {
      regex: /^(\d{2}[\/\-\.]\d{2})\s+(.+?)\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/,
      groups: { date: 1, description: 2, amount: 3 }
    },
    // Pattern 5: Bank statement format with posting date
    // e.g., "01/15/24 01/16/24 WALMART #1234 $45.67"
    {
      regex: /^(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2})\s+\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2}\s+(.+?)\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/,
      groups: { date: 1, description: 2, amount: 3 }
    }
  ];
  
  for (const line of lines) {
    // Skip summary lines
    if (isSummaryLine(line)) continue;
    
    let match: RegExpMatchArray | null = null;
    let patternUsed: typeof patterns[0] | null = null;
    
    // Try each pattern
    for (const pattern of patterns) {
      match = line.match(pattern.regex);
      if (match) {
        patternUsed = pattern;
        break;
      }
    }
    
    if (match && patternUsed) {
      const date = match[patternUsed.groups.date];
      const description = match[patternUsed.groups.description];
      const amountStr = match[patternUsed.groups.amount];
      
      // Parse amount
      const amount = parseAmount(amountStr);
      
      if (amount !== null && amount !== 0) {
        const cleanDescription = cleanDescription(description);
        const merchant = extractMerchant(cleanDescription);
        
        if (cleanDescription.length > 0) {
          transactions.push({
            date: normalizeDate(date),
            merchant,
            description: cleanDescription,
            amount: Math.abs(amount), // Always positive for expenses
            category: categorizeTransaction(cleanDescription),
            raw_line_text: line
          });
        }
      }
    }
  }
  
  // Remove duplicates and sort by date
  const uniqueTransactions = removeDuplicates(transactions);
  return uniqueTransactions.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateA - dateB;
  });
}

/**
 * Check if line is a summary line (should be skipped)
 */
function isSummaryLine(line: string): boolean {
  const summaryKeywords = [
    'total', 'balance', 'summary', 'statement', 'account',
    'previous', 'new balance', 'available credit', 'minimum payment',
    'interest', 'fees', 'credits', 'debits'
  ];
  
  const lower = line.toLowerCase();
  return summaryKeywords.some(keyword => lower.includes(keyword));
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number | null {
  try {
    // Remove currency symbols and commas
    const cleaned = amountStr.replace(/[\$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Clean description text
 */
function cleanDescription(description: string): string {
  return description
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200); // Limit length
}

/**
 * Extract merchant name from description
 */
function extractMerchant(description: string): string {
  // Remove common suffixes
  const cleaned = description
    .replace(/\s+(INC|LLC|CORP|LTD|CO)\.?$/i, '')
    .replace(/\s+#\d+.*$/, '') // Remove transaction IDs
    .trim();
  
  // Take first part (usually merchant name)
  const parts = cleaned.split(/\s+/);
  if (parts.length > 0) {
    return parts[0].substring(0, 100);
  }
  
  return cleaned.substring(0, 100);
}

/**
 * Simple categorization based on description keywords
 */
function categorizeTransaction(description: string): string {
  const lower = description.toLowerCase();
  
  // Groceries
  const groceryKeywords = ['walmart', 'target', 'safeway', 'kroger', 'whole foods', 'costco', 'superstore', 'grocery'];
  if (groceryKeywords.some(kw => lower.includes(kw))) {
    return 'Groceries';
  }
  
  // Fuel/Gas
  const fuelKeywords = ['shell', 'esso', 'chevron', 'bp', 'exxon', 'petro', 'gas station', 'petrol'];
  if (fuelKeywords.some(kw => lower.includes(kw))) {
    return 'Transportation';
  }
  
  // Restaurants
  const restaurantKeywords = ['restaurant', 'cafe', 'pizza', 'diner', 'bistro', 'starbucks', 'mcdonalds', 'subway'];
  if (restaurantKeywords.some(kw => lower.includes(kw))) {
    return 'Dining';
  }
  
  // Utilities
  const utilityKeywords = ['hydro', 'electric', 'gas company', 'water', 'internet', 'phone', 'cable', 'utility'];
  if (utilityKeywords.some(kw => lower.includes(kw))) {
    return 'Utilities';
  }
  
  return 'Uncategorized';
}

/**
 * Remove duplicate transactions
 */
function removeDuplicates(
  transactions: Array<{
    date?: string;
    merchant?: string;
    description?: string;
    amount: number;
    category?: string;
    raw_line_text?: string;
  }>
): typeof transactions {
  const seen = new Set<string>();
  const unique: typeof transactions = [];
  
  for (const tx of transactions) {
    // Create a key from date, merchant, and amount
    const key = `${tx.date || ''}|${tx.merchant || ''}|${tx.amount}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(tx);
    }
  }
  
  return unique;
}








