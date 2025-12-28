/**
 * Vision Statement Parser
 * 
 * Uses OpenAI Vision API to extract structured transactions from bank/credit card statement images.
 * Designed as a fallback when classic OCR fails to detect structured transactions.
 * 
 * Handles formats like RBC ION Visa statements with transaction tables.
 */

import OpenAI from 'openai';

export interface ParsedStatement {
  summary: {
    institution?: string;
    account_type?: string;
    statement_period_start?: string | null; // YYYY-MM-DD
    statement_period_end?: string | null;
    previous_balance?: number | null;
    new_balance?: number | null;
    credit_limit?: number | null;
  };
  transactions: Array<{
    transaction_date: string | null;      // YYYY-MM-DD
    posting_date: string | null;          // YYYY-MM-DD
    description: string;
    merchant_guess?: string | null;
    amount: number;                       // positive for charges, negative for payments/credits
    currency?: string | null;
    raw_row_text?: string | null;
  }>;
}

export interface VisionParseResult {
  parsed: ParsedStatement;
  errors?: string[];
}

/**
 * Parse bank/credit card statement image using OpenAI Vision
 * 
 * @param userId - User ID (for logging)
 * @param documentId - Document ID (for logging)
 * @param publicUrl - Public or signed URL to the image in Supabase storage
 * @param mimeType - MIME type (e.g., 'image/png', 'image/jpeg')
 * @returns Parsed statement with transactions and summary
 */
export async function visionStatementParser(
  userId: string,
  documentId: string,
  publicUrl: string,
  mimeType: string
): Promise<VisionParseResult> {
  const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  // Validate image MIME type
  if (!mimeType.startsWith('image/')) {
    throw new Error(`Vision parser only supports images, got: ${mimeType}`);
  }

  console.log(`[Vision Parser] Starting Vision OCR for document ${documentId} (${mimeType})`);

  // Build system prompt for structured statement parsing
  const systemPrompt = `You are a bank/credit card statement parser. Your task is to extract structured transaction data from statement images.

CRITICAL RULES:
1. Output ONLY valid JSON. No markdown, no explanations, no commentary.
2. Extract ALL line-item transactions from the transaction table.
3. Ignore summary sections (totals, balances, interest rates) unless specifically requested.
4. For each transaction:
   - transaction_date: Use TRANSACTION DATE if available, otherwise POSTING DATE. Format as YYYY-MM-DD or null.
   - posting_date: POSTING DATE if available, format as YYYY-MM-DD or null.
   - description: Full activity description (merchant name + location/details)
   - merchant_guess: Extract merchant name from description (first part, before location codes)
   - amount: Number (positive for purchases/charges, negative for payments/credits/refunds)
   - currency: Currency code if visible (default: CAD if not specified)
   - raw_row_text: Original text from the statement row (for debugging)

5. Amount sign rules:
   - Purchases/charges/debits = POSITIVE numbers
   - Payments/credits/refunds = NEGATIVE numbers

6. Date normalization:
   - Convert all dates to YYYY-MM-DD format
   - If year is missing, infer from statement period
   - If date cannot be parsed, use null

7. Summary section (optional):
   - Extract institution name, account type, statement period dates
   - Extract previous balance, new balance, credit limit if visible

8. If you cannot find any real line-item transactions, return empty transactions array: []

Example output format:
{
  "summary": {
    "institution": "RBC",
    "account_type": "Credit Card",
    "statement_period_start": "2025-01-01",
    "statement_period_end": "2025-01-31",
    "previous_balance": 1234.56,
    "new_balance": 2345.67,
    "credit_limit": 10000.00
  },
  "transactions": [
    {
      "transaction_date": "2025-01-15",
      "posting_date": "2025-01-16",
      "description": "AMAZON.COM AMZN.COM/BILL WA",
      "merchant_guess": "AMAZON.COM",
      "amount": 123.45,
      "currency": "CAD",
      "raw_row_text": "01/15 01/16 AMAZON.COM AMZN.COM/BILL WA 123.45"
    },
    {
      "transaction_date": "2025-01-20",
      "posting_date": "2025-01-21",
      "description": "PAYMENT RECEIVED",
      "merchant_guess": "PAYMENT",
      "amount": -500.00,
      "currency": "CAD",
      "raw_row_text": "01/20 01/21 PAYMENT RECEIVED -500.00"
    }
  ]
}`;

  const userPrompt = `Parse this bank/credit card statement image and extract all structured transaction data.

Focus on:
- Transaction table with dates, descriptions, and amounts
- Statement period dates (for year inference)
- Account summary information (if visible)

Return ONLY a valid JSON object matching the format specified in the system prompt.`;

  try {
    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Use GPT-4o for best vision capabilities
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            {
              type: 'image_url',
              image_url: {
                url: publicUrl,
                detail: 'high' // High detail for better table reading
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' }, // Force JSON mode
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 4000, // Enough for ~100 transactions
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI Vision returned empty response');
    }

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError: any) {
      console.error('[Vision Parser] JSON parse error, attempting retry with fix prompt:', parseError);
      
      // Retry with JSON fix prompt
      const fixResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a JSON fixer. Fix invalid JSON and return ONLY valid JSON.' },
          {
            role: 'user',
            content: `Fix this JSON and return ONLY the corrected JSON object:\n\n${content}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 4000,
      });

      const fixedContent = fixResponse.choices[0]?.message?.content;
      if (!fixedContent) {
        throw new Error('JSON fix attempt also returned empty response');
      }

      parsed = JSON.parse(fixedContent);
    }

    // Validate structure
    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      throw new Error('Response does not contain transactions array');
    }

    // Normalize and validate transactions
    const errors: string[] = [];
    const normalizedTransactions = parsed.transactions.map((tx: any, index: number) => {
      // Validate required fields
      if (!tx.description || typeof tx.amount !== 'number') {
        errors.push(`Transaction ${index + 1}: Missing description or invalid amount`);
        return null;
      }

      // Normalize dates
      const normalizeDate = (dateStr: any): string | null => {
        if (!dateStr) return null;
        if (typeof dateStr !== 'string') return null;
        
        // Already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr;
        }

        // Try to parse common formats
        // MM/DD/YYYY or MM/DD/YY
        const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        if (slashMatch) {
          const [, month, day, year] = slashMatch;
          const yearNum = year.length === 2 ? parseInt(`20${year}`) : parseInt(year);
          const monthNum = parseInt(month);
          const dayNum = parseInt(day);
          
          if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
            return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          }
        }

        // Try Date.parse
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }

        return null;
      };

      return {
        transaction_date: normalizeDate(tx.transaction_date),
        posting_date: normalizeDate(tx.posting_date),
        description: String(tx.description).trim(),
        merchant_guess: tx.merchant_guess ? String(tx.merchant_guess).trim() : null,
        amount: tx.amount, // Keep sign (positive for charges, negative for payments)
        currency: tx.currency || 'CAD',
        raw_row_text: tx.raw_row_text || null,
      };
    }).filter((tx: any) => tx !== null); // Remove invalid transactions

    // Normalize summary
    const summary = {
      institution: parsed.summary?.institution || null,
      account_type: parsed.summary?.account_type || null,
      statement_period_start: parsed.summary?.statement_period_start || null,
      statement_period_end: parsed.summary?.statement_period_end || null,
      previous_balance: parsed.summary?.previous_balance || null,
      new_balance: parsed.summary?.new_balance || null,
      credit_limit: parsed.summary?.credit_limit || null,
    };

    console.log(`[Vision Parser] Extracted ${normalizedTransactions.length} transactions from document ${documentId}`);

    return {
      parsed: {
        summary,
        transactions: normalizedTransactions,
      },
      errors: errors.length > 0 ? errors : undefined,
    };

  } catch (error: any) {
    console.error(`[Vision Parser] Error parsing document ${documentId}:`, error);
    throw new Error(`Vision parsing failed: ${error.message || 'Unknown error'}`);
  }
}






