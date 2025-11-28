/**
 * AI Fallback Parser for OCR Text
 * 
 * When the primary parser (regex/pattern-based) fails to extract transactions,
 * this module uses OpenAI to intelligently parse the OCR text and extract
 * structured transaction data.
 * 
 * Used as a fallback when normalizeBankStatement() returns 0 transactions.
 */

import OpenAI from 'openai';

// Transaction shape matching normalizeBankStatement output
export interface ParsedTransaction {
  date?: string;
  merchant?: string;
  description?: string;
  amount: number;
  category?: string;
  raw_line_text?: string;
}

/**
 * AI Fallback Parser
 * 
 * Uses OpenAI to extract transactions from OCR text when primary parser fails.
 * 
 * @param ocrText - Raw OCR text from the document
 * @param statementType - Type of statement (credit_card, bank, unknown)
 * @param openaiClient - Initialized OpenAI client
 * @returns Array of parsed transactions, or empty array if parsing fails
 */
export async function aiFallbackParseTransactions(params: {
  ocrText: string;
  statementType?: 'credit_card' | 'bank' | 'unknown';
  openaiClient: OpenAI;
}): Promise<ParsedTransaction[]> {
  const { ocrText, statementType = 'unknown', openaiClient } = params;

  // Safety: Truncate OCR text to avoid token explosions
  const MAX_OCR_LENGTH = 15000; // ~3-4k tokens
  const originalLength = ocrText.length;
  const truncatedText = ocrText.length > MAX_OCR_LENGTH 
    ? ocrText.substring(0, MAX_OCR_LENGTH) 
    : ocrText;

  if (ocrText.length > MAX_OCR_LENGTH) {
    console.log(`[Byte OCR] OCR text truncated for AI fallback (from ${originalLength} to ${truncatedLength} chars)`);
  }

  try {
    // Build strict system prompt
    const systemPrompt = `You are a bank/credit card statement parser.

Your task: Extract ONLY line-item transactions from OCR text.

CRITICAL RULES:
1. Output ONLY a valid JSON array of transactions. No commentary, no explanations, no markdown.
2. Each transaction must have:
   - date: YYYY-MM-DD format (use TRANSACTION DATE if available, otherwise POSTING DATE)
   - description: Full activity description line (merchant name + details)
   - amount: Number (negative for purchases/charges/debits, positive for payments/credits/refunds)
   - merchant: Merchant name extracted from description (first part, before location/ID codes)

3. IGNORE these sections completely:
   - Summary blocks ("TOTAL ACCOUNT BALANCE", "NEW BALANCE", "PREVIOUS BALANCE")
   - Interest rate tables
   - Points summaries
   - Address blocks
   - Header/footer text
   - Section headers ("TRANSACTIONS", "PAYMENTS", etc.)

4. For credit card statements:
   - Purchases/charges = negative amounts
   - Payments/credits = positive amounts
   - Use TRANSACTION DATE column if present, otherwise POSTING DATE

5. For bank statements:
   - Debits/withdrawals = negative amounts
   - Deposits/credits = positive amounts

6. If you cannot find any real line-item transactions, output: { "transactions": [] }

7. Currency: Assume CAD if not specified.

Example output format (JSON object with transactions array):
{
  "transactions": [
    {"date": "2025-01-15", "description": "AMAZON.COM AMZN.COM/BILL WA", "merchant": "AMAZON.COM", "amount": -123.45},
    {"date": "2025-01-16", "description": "PAYMENT RECEIVED", "merchant": "PAYMENT", "amount": 500.00}
  ]
}`;

    const userPrompt = `Parse this ${statementType} statement OCR text and extract all line-item transactions:

${truncatedText}

Return a JSON object with a "transactions" array containing all extracted transactions. Format: { "transactions": [...] }`;

    console.log(`[Byte OCR] Calling OpenAI AI fallback parser for ${statementType} statement (${truncatedText.length} chars)`);

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini', // Use cheaper model for parsing
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }, // Force JSON mode (returns { "transactions": [...] })
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 4000, // Enough for ~100 transactions
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.warn('[Byte OCR] AI fallback returned empty response');
      return [];
    }

    // Parse JSON response
    // OpenAI JSON mode returns: { "transactions": [...] } or direct array
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('[Byte OCR] AI fallback JSON parse error:', parseError);
      // Try to extract JSON array from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find JSON array directly
        const arrayMatch = content.match(/(\[[\s\S]*\])/);
        if (arrayMatch) {
          parsed = JSON.parse(arrayMatch[1]);
        } else {
          console.error('[Byte OCR] AI fallback: No valid JSON found in response');
          return [];
        }
      }
    }

    // Extract transactions array (handle both {transactions: [...]} and direct array)
    let transactions: any[] = [];
    if (Array.isArray(parsed)) {
      transactions = parsed;
    } else if (parsed.transactions && Array.isArray(parsed.transactions)) {
      transactions = parsed.transactions;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      transactions = parsed.data;
    } else {
      console.warn('[Byte OCR] AI fallback response does not contain transactions array. Keys:', Object.keys(parsed || {}));
      return [];
    }

    // Validate and normalize transactions
    const validatedTransactions: ParsedTransaction[] = [];
    for (const tx of transactions) {
      // Validate required fields
      if (!tx.date || !tx.description || typeof tx.amount !== 'number') {
        console.warn('[Byte OCR] Skipping invalid transaction (missing required fields):', tx);
        continue;
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(tx.date)) {
        // Try to normalize date
        const normalizedDate = normalizeDate(tx.date);
        if (!normalizedDate) {
          console.warn('[Byte OCR] Skipping transaction with invalid date:', tx.date);
          continue;
        }
        tx.date = normalizedDate;
      }

      // Validate amount is finite
      if (!isFinite(tx.amount) || tx.amount === 0) {
        console.warn('[Byte OCR] Skipping transaction with invalid amount:', tx.amount);
        continue;
      }

      // Extract merchant from description if not provided
      const merchant = tx.merchant || extractMerchantFromDescription(tx.description);

      validatedTransactions.push({
        date: tx.date,
        merchant: merchant || undefined,
        description: String(tx.description).trim(),
        amount: tx.amount, // Keep sign (negative for debits, positive for credits)
        category: tx.category || 'Uncategorized',
        raw_line_text: tx.description, // Use description as raw line
      });
    }

    console.log(`[Byte OCR] AI fallback parser produced ${validatedTransactions.length} validated transactions`);
    return validatedTransactions;

  } catch (error: any) {
    console.error('[Byte OCR] AI fallback failed:', error?.message || error);
    // Don't throw - return empty array so pipeline continues
    return [];
  }
}

/**
 * Normalize date string to YYYY-MM-DD format
 */
function normalizeDate(dateStr: string): string | null {
  try {
    // Try YYYY-MM-DD first
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Try MM/DD/YYYY or DD/MM/YYYY
    const slashMatch = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
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

    // Try parsing as Date object
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}

/**
 * Extract merchant name from description
 */
function extractMerchantFromDescription(description: string): string | null {
  if (!description) return null;

  // Remove common prefixes
  let cleaned = description
    .replace(/^(Debit Card Purchase|Credit Card Purchase|ATM Withdrawal|Online Transfer|Bill Payment|Deposit|Withdrawal|Purchase)[,\s]+/i, '')
    .trim();

  // Take first part (usually merchant name)
  const parts = cleaned.split(/\s+/);
  if (parts.length > 0) {
    return parts[0].substring(0, 100);
  }

  return cleaned.substring(0, 100) || null;
}

