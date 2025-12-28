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
import { categorizeTransaction as sharedCategorize, categorizeTransactionWithLearning } from './categorize';

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
 * Main entry point for OCR result normalization
 * 
 * Detects statement format and returns normalized transactions.
 * If primary parser returns 0 transactions, uses AI fallback parser.
 */
export async function normalizeOcrResult(text: string, userId: string = 'default-user'): Promise<NormalizedTransaction[]>;
export function normalizeOcrResult(text: string, userId: string = 'default-user', openaiClient?: any): Promise<NormalizedTransaction[]> | NormalizedTransaction[];
export function normalizeOcrResult(text: string, userId: string = 'default-user', openaiClient?: any): Promise<NormalizedTransaction[]> | NormalizedTransaction[] {
  const normalizedText = text || "";

  // BMO Everyday Banking detection:
  // Check for specific BMO statement markers
  if (
    /Your Everyday Banking statement/i.test(normalizedText) &&
    /EDMONTON, AB/i.test(normalizedText)
  ) {
    const bmoTransactions = parseBmoEverydayStatement(normalizedText);
    
    // If we found transactions, return them (no AI fallback needed)
    if (bmoTransactions.length > 0) {
      console.log(`[Byte OCR] Parsed ${bmoTransactions.length} transactions with primary parser (BMO format)`);
      // Convert to NormalizedTransaction format
      return bmoTransactions.map(tx => ({
        userId,
        kind: 'bank' as const,
        date: tx.date,
        merchant: tx.merchant,
        amount: tx.amount,
        currency: 'CAD',
        docId: undefined
      }));
    }
  }

  // Also try BMO format if we detect "Everyday Banking" or "For the period ending" patterns
  // (fallback detection for other BMO statement variants)
  if (
    /Everyday Banking/i.test(normalizedText) ||
    (/For the period ending/i.test(normalizedText) && /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/i.test(normalizedText))
  ) {
    const bmoTransactions = parseBmoEverydayStatement(normalizedText);
    if (bmoTransactions.length > 0) {
      console.log(`[Byte OCR] Parsed ${bmoTransactions.length} transactions with primary parser (BMO variant)`);
      // Convert to NormalizedTransaction format
      return bmoTransactions.map(tx => ({
        userId,
        kind: 'bank' as const,
        date: tx.date,
        merchant: tx.merchant,
        amount: tx.amount,
        currency: 'CAD',
        docId: undefined
      }));
    }
  }

  // Fallback to general bank statement normalization
  const bankTransactions = normalizeBankStatement(normalizedText);
  
  // If primary parser found transactions, return them synchronously
  if (bankTransactions.length > 0) {
    console.log(`[Byte OCR] Parsed ${bankTransactions.length} transactions with primary parser`);
    // Convert to NormalizedTransaction format
    const result = bankTransactions.map(tx => ({
      userId,
      kind: 'bank' as const,
      date: tx.date,
      merchant: tx.merchant,
      amount: tx.amount,
      currency: 'CAD',
      docId: undefined
    }));
    // Return synchronously (wrap in Promise.resolve if openaiClient was provided to maintain consistent return type)
    return openaiClient ? Promise.resolve(result) : result;
  }

  // Primary parser found 0 transactions - use AI fallback if OpenAI client is available
  if (openaiClient) {
    console.log(`[Byte OCR] Primary parser found 0 transactions, using AI fallback parser`);
    
    // Detect statement type for better AI parsing
    const isCreditCard = /credit card|visa|mastercard|amex/i.test(normalizedText);
    const statementType: 'credit_card' | 'bank' | 'unknown' = isCreditCard ? 'credit_card' : 'bank';
    
    // Call AI fallback (async)
    return (async () => {
      const { aiFallbackParseTransactions } = await import('./ai_fallback_parser.js');
      const aiTransactions = await aiFallbackParseTransactions({
        ocrText: normalizedText,
        statementType,
        openaiClient,
      });

      if (aiTransactions.length > 0) {
        console.log(`[Byte OCR] AI fallback parser produced ${aiTransactions.length} transactions`);
        // Convert to NormalizedTransaction format and tag with source
        return aiTransactions.map(tx => ({
          userId,
          kind: 'bank' as const,
          date: tx.date,
          merchant: tx.merchant,
          amount: tx.amount,
          currency: 'CAD',
          docId: undefined,
          // Tag as AI fallback (can be used for metadata)
        }));
      } else {
        console.log(`[Byte OCR] AI fallback parser also found 0 transactions`);
        return [];
      }
    })();
  }

  // No OpenAI client available, return empty array
  console.log(`[Byte OCR] Primary parser found 0 transactions, but OpenAI client not available for fallback`);
  return [];
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
 * Categorize using Tag with learning (fallback when rules don't match)
 * 
 * This function uses categorizeTransactionWithLearning which:
 * 1. First checks if Tag learned from user corrections
 * 2. Falls back to AI if no learned pattern found
 */
async function categorizeWithTag(tx: NormalizedTransaction): Promise<CategorizationResult> {
  // Use the new wrapper function that includes learning
  try {
    const result = await categorizeTransactionWithLearning({
      userId: tx.userId,
      merchant: tx.merchant || null,
      description: tx.merchant || 'Transaction',
      amount: tx.amount || 0
    });

    // Convert to CategorizationResult format
    return {
      category: result.category,
      confidence: result.confidence,
      source: result.source === 'learned' ? 'learned' : 'ai',
      method: result.source === 'learned' ? 'learned' : 'tag'
    };
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
 * Parse BMO "Everyday Banking" statement format
 * 
 * Format: Multi-line transactions where:
 * - Line 1: Date (e.g., "Sep 17")
 * - Lines 2..N-2: Description (can span multiple lines)
 * - Line N-1: Amount (e.g., "20.23" or "1,000.00" or "-25.00")
 * - Line N: Balance (e.g., "1,489.87")
 * 
 * Example:
 *   Sep 17
 *   Debit Card Purchase, SOBEYS HOLLICK KENYON
 *   76.09
 *   1,519.47
 */
function parseBmoEverydayStatement(text: string): Array<{
  date?: string;
  merchant?: string;
  description?: string;
  amount: number;
  category?: string;
  raw_line_text?: string;
}> {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // 1) Detect year from "For the period ending ... 2025"
  let year = new Date().getFullYear();
  for (const line of lines) {
    const m = /For the period ending .*?(\d{4})$/.exec(line);
    if (m) {
      year = Number(m[1]);
      break;
    }
  }

  const monthMap: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04",
    May: "05", Jun: "06", Jul: "07", Aug: "08",
    Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };

  const monthRegex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/i;
  const moneyRegex = /^-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?$/;

  const normalizeMoney = (raw: string): number | null => {
    const cleaned = raw.replace(/[\$,]/g, "");
    if (!/^-?\d+(\.\d{2})?$/.test(cleaned)) return null;
    return Number(cleaned);
  };

  const transactions: Array<{
    date?: string;
    merchant?: string;
    description?: string;
    amount: number;
    category?: string;
    raw_line_text?: string;
  }> = [];

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const m = monthRegex.exec(line);
    
    if (!m) {
      i++;
      continue;
    }

    const monthAbbr = m[1];
    const day = m[2].padStart(2, "0");
    const month = monthMap[monthAbbr] ?? "01";
    const isoDate = `${year}-${month}-${day}`;

    // Collect description lines until we hit an amount line
    const descLines: string[] = [];
    i++; // move past the date line

    while (i < lines.length && !moneyRegex.test(lines[i])) {
      // Stop if we accidentally hit another date (safety guard)
      if (monthRegex.test(lines[i])) break;
      descLines.push(lines[i]);
      i++;
    }

    if (i >= lines.length) break;

    const amountLine = lines[i];
    if (!moneyRegex.test(amountLine)) {
      // Not a valid amount, skip this candidate and continue
      i++;
      continue;
    }
    
    const amount = normalizeMoney(amountLine);
    if (amount === null) {
      i++;
      continue;
    }
    
    i++;

    // Check for balance line (optional)
    if (i < lines.length && moneyRegex.test(lines[i])) {
      i++; // consume balance line
    }

    const description = descLines.join(" ").replace(/\s+/g, " ").trim();
    
    // Skip if description is empty
    if (!description || description.length === 0) {
      continue;
    }
    
    // Extract merchant from description (remove common prefixes)
    let merchant = description;
    merchant = merchant.replace(/^(Debit Card Purchase|Credit Card Purchase|ATM Withdrawal|Online Transfer|Bill Payment|Deposit|Withdrawal)[,\s]+/i, '');
    
    // Take first part as merchant name
    const merchantParts = merchant.split(/\s+/);
    const merchantName = merchantParts[0] || merchant.substring(0, 50);

    // Combine all lines for raw_line_text
    const rawLines = [line, ...descLines, amountLine];
    const rawLineText = rawLines.join(' | ');

      transactions.push({
      date: isoDate,
      merchant: merchantName,
      description: description,
      amount: Math.abs(amount), // Always positive for expenses
      category: categorizeTransactionSync(description), // Sync fallback - will be re-categorized with learning later
      raw_line_text: rawLineText
    });
  }

  return transactions;
}

/**
 * Parse Canadian bank statement line (BMO, TD, RBC format)
 * 
 * Format: "Sep 17   Debit Card Purchase SOBEYS HOLLICK KENYON   76.09   1,519.47"
 * Pattern: Month Day Description Amount Balance
 */
function parseCanadianStatementLine(line: string): {
  date?: string;
  merchant?: string;
  description?: string;
  amount: number;
  category?: string;
} | null {
  // Match: Month Day Description Amount Balance
  // e.g., "Sep 17   Debit Card Purchase SOBEYS HOLLICK KENYON   76.09   1,519.47"
  // Handle variable spacing between fields
  const regex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/i;
  const match = line.match(regex);
  
  if (!match) return null;
  
  const [, mon, day, description, amountStr] = match;
  
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  
  const monthNum = months[mon];
  if (!monthNum) return null;
  
  const amount = parseFloat(amountStr.replace(/,/g, ''));
  if (isNaN(amount)) return null;
  
  // Use current year (or could extract from statement header)
  const currentYear = new Date().getFullYear();
  const date = `${currentYear}-${monthNum}-${day.padStart(2, '0')}`;
  
  // Extract merchant from description (remove common prefixes like "Debit Card Purchase")
  let merchant = description.trim();
  merchant = merchant.replace(/^(Debit Card Purchase|Credit Card Purchase|ATM Withdrawal|Online Transfer|Bill Payment)\s+/i, '');
  
  // Take first part as merchant name
  const merchantParts = merchant.split(/\s+/);
  const merchantName = merchantParts[0] || merchant.substring(0, 50);
  
  return {
    date,
    merchant: merchantName,
    description: description.trim(),
    amount: -amount, // Treat as debit by default
    category: 'Uncategorized'
  };
}

/**
 * Normalize bank statement text into transaction array
 * 
 * Parses raw OCR text from bank statements and extracts transactions.
 * Returns array of transactions with: date, merchant, description, amount, category, raw_line_text
 * 
 * If primary parser returns 0 transactions, AI fallback parser is used automatically.
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
  
  // First, try BMO Everyday Banking format (multi-line transactions)
  // Check if this looks like a BMO statement
  const isBmoStatement = rawText.includes('Everyday Banking') || 
                         rawText.includes('For the period ending') ||
                         /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/i.test(rawText);
  
  if (isBmoStatement) {
    const bmoTransactions = parseBmoEverydayStatement(rawText);
    if (bmoTransactions.length > 0) {
      const uniqueTransactions = removeDuplicates(bmoTransactions);
      return uniqueTransactions.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
      });
    }
  }
  
  // Second, try Canadian bank statement format (single-line)
  for (const line of lines) {
    if (isSummaryLine(line)) continue;
    
    const canadianTx = parseCanadianStatementLine(line);
    if (canadianTx) {
      transactions.push({
        date: canadianTx.date,
        merchant: canadianTx.merchant,
        description: canadianTx.description,
        amount: Math.abs(canadianTx.amount), // Always positive for expenses
        category: categorizeTransactionSync(canadianTx.description || ''), // Sync fallback - will be re-categorized with learning later
        raw_line_text: line
      });
      continue; // Skip to next line if Canadian format matched
    }
  }
  
  // If we found Canadian transactions, return them (don't try other patterns)
  if (transactions.length > 0) {
    const uniqueTransactions = removeDuplicates(transactions);
    return uniqueTransactions.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
  }
  
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
        const cleanedDesc = cleanDescription(description);
        const merchant = extractMerchant(cleanedDesc);
        
        if (cleanedDesc.length > 0) {
          transactions.push({
            date: normalizeDate(date),
            merchant,
            description: cleanedDesc,
            amount: Math.abs(amount), // Always positive for expenses
            category: categorizeTransactionSync(cleanedDesc), // Sync fallback - will be re-categorized with learning later
            raw_line_text: line
          });
        }
      }
    }
  }
  
  // Remove duplicates and sort by date
  const uniqueTransactions = removeDuplicates(transactions);
  const sortedTransactions = uniqueTransactions.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateA - dateB;
  });

  // If primary parser found 0 transactions, AI fallback is handled by caller (normalizeOcrResult)
  // This function just returns what it found
  return sortedTransactions;
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
 * 
 * NOTE: This is a fallback for synchronous contexts.
 * For async contexts, use sharedCategorize() which includes learning.
 */
function categorizeTransactionSync(description: string): string {
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








