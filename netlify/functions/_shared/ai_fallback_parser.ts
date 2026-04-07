/**
 * AI Fallback Parser for OCR Text
 * 
 * When the primary parser (regex/pattern-based) fails to extract transactions,
 * this module uses OpenAI to intelligently parse the OCR text and extract
 * structured transaction data.
 * 
 * Used as a fallback when normalizeBankStatement() returns 0 transactions.
 */

// OpenAI import retained for type compat but Claude is used for actual parsing
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
  anthropicApiKey?: string;
  pdfBase64?: string | null;
}): Promise<ParsedTransaction[]> {
  const { ocrText, statementType = 'unknown', openaiClient, pdfBase64 } = params;

  // Safety: Truncate OCR text to avoid token explosions
  const MAX_OCR_LENGTH = 15000; // ~3-4k tokens
  const originalLength = ocrText.length;
  const truncatedText = ocrText.length > MAX_OCR_LENGTH 
    ? ocrText.substring(0, MAX_OCR_LENGTH) 
    : ocrText;

  if (ocrText.length > MAX_OCR_LENGTH) {
    console.log(`[Byte OCR] OCR text truncated for AI fallback (from ${originalLength} to ${truncatedText.length} chars)`);
  }

  try {
    // Build strict system prompt
    const systemPrompt = `You are a bank statement transaction parser. Extract transactions from OCR text.

STEP 1 — DETECT LAYOUT
Find the transaction table header to identify column order. For BMO statements the header is:
"Amounts deducted from your account ($) | Amounts added to your account ($) | Balance ($)"

STEP 2 — PARSE RIGHT TO LEFT
For each transaction row:
- Rightmost number = running balance
- Number immediately left of balance = transaction amount
- Never swap these two

STEP 3 — COMMA RULE
- Number WITH thousands comma (e.g. 6,030.39) = balance
- Number WITHOUT comma (e.g. 11.85) = amount
- Exception: if BOTH have commas, the larger is the balance

STEP 4 — BALANCE RECONCILIATION
Verify: previous_balance - debit_amount = new_balance (or + for credits)
If it doesn't reconcile, try the other number. Reject the row if neither reconciles.

OUTPUT FORMAT
Return a JSON object: { "transactions": [ ... ] }
Each transaction must have:
- date: YYYY-MM-DD (use TRANSACTION DATE if available, else POSTING DATE)
- description: Full activity line (merchant + details)
- merchant: Merchant name (preserve spaces — "SAVE ON FOODS" not "SAVEONFOODS")
- amount: Number (negative for debits/purchases, positive for credits/deposits)

IGNORE: summary blocks, interest tables, points summaries, headers/footers, section titles.
Currency: assume CAD unless specified. For foreign tx with CAD conversion, always use the CAD amount.
Institution: include top-level "institution" field if bank/issuer (BMO, TD, RBC, etc.) is detected.
If no line-item transactions are found, output: { "transactions": [] }
No commentary, no markdown, no backticks — JSON only.`;

    const userPrompt = `Parse this ${statementType} statement OCR text and extract all line-item transactions:

${truncatedText}

Return a JSON object with a "transactions" array containing all extracted transactions. Format: { "transactions": [...] }`;


    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    let content: string | null = null;
    // Try Claude first � use Vision (PDF direct) when available, text fallback otherwise
    if (anthropicKey) {
      const useVision = Boolean(pdfBase64);
      const visionModel = useVision ? "claude-sonnet-4-20250514" : "claude-haiku-4-5-20251001";
      console.log(`[Byte OCR] Calling Claude ${useVision ? "Vision (PDF)" : "text"} parser for ${statementType} statement, model: ${visionModel}`);
      try {
        const userContent = useVision
          ? [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
              { type: "text", text: userPrompt + "\n\nReturn ONLY the JSON object. No markdown, no backticks, no commentary." },
            ]
          : userPrompt + "\n\nReturn ONLY the JSON object. No markdown, no backticks, no commentary.";
        const claudeHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        };
        if (useVision) claudeHeaders["anthropic-beta"] = "pdfs-2024-09-25";
        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: claudeHeaders,
          body: JSON.stringify({
            model: visionModel,
            max_tokens: 16000,
            system: systemPrompt,
            messages: [{ role: "user", content: userContent }],
          }),
        });
        if (claudeRes.ok) {
          const claudeData = await claudeRes.json() as any;
          content = claudeData?.content?.[0]?.text ?? null;
          if (content) console.log("[Byte OCR] Claude fallback returned content");
        } else {
          console.warn("[Byte OCR] Claude fallback HTTP error:", claudeRes.status);
        }
      } catch (claudeErr: any) {
        console.warn("[Byte OCR] Claude fallback error:", claudeErr?.message?.slice(0, 120));
      }
    }

    // Fall back to OpenAI if Claude failed
    if (!content) {
      console.log(`[Byte OCR] Falling back to OpenAI for ${statementType} statement`);
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 16000,
      });
      content = response.choices[0]?.message?.content ?? null;
    }

    if (!content) {
      console.warn("[Byte OCR] AI fallback returned empty response");
      return [];
    }
    if (!content) {
      console.warn('[Byte OCR] AI fallback returned empty response');
      return [];
    }

    // Parse JSON response
    // OpenAI JSON mode returns: { "transactions": [...] } or direct array
    let parsed: any;
    content = content.replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "").trim();
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('[Byte OCR] AI fallback JSON parse error:', parseError);
      // Try to extract JSON array from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
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
    console.log('[Byte OCR DEBUG] parsed AI transaction count:', Array.isArray(transactions) ? transactions.length : -1);
    console.log('[Byte OCR DEBUG] parsed AI transaction sample:', Array.isArray(transactions) ? transactions.slice(0, 5) : transactions);

    // Validate and normalize transactions
    const validatedTransactions: ParsedTransaction[] = [];
    for (const tx of transactions) {
      console.log('[Byte OCR DEBUG] raw AI tx:', tx);

      if (!tx.date || typeof tx.amount === 'undefined' || tx.amount === null) {
        console.warn('[Byte OCR] Skipping transaction (missing critical fields):', tx);
        continue;
      }

      tx.description = String(tx.description || tx.merchant || 'Unknown').trim();

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      let normalizedDate = String(tx.date).trim();
      if (!dateRegex.test(normalizedDate)) {
        const reparsed = normalizeDate(normalizedDate);
        if (!reparsed) {
          console.warn('[Byte OCR] Skipping transaction with invalid date:', tx.date);
          continue;
        }
        normalizedDate = reparsed;
      }
      tx.date = normalizedDate;

      // Validate amount is finite
      let amount = tx.amount;

      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(/[^0-9.\-]/g, ''));
      }

      if (!Number.isFinite(amount) || amount === 0) {
        console.warn('[Byte OCR] Skipping transaction with invalid amount:', tx.amount);
        continue;
      }

      tx.amount = amount;

      // Extract merchant from description if not provided
      const merchant = tx.merchant || extractMerchantFromDescription(tx.description);

      console.log('[Byte OCR DEBUG] accepted AI tx:', {
        date: tx.date,
        description: tx.description,
        merchant,
        amount: tx.amount,
      });

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

