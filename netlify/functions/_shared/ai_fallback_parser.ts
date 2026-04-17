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

GENERAL RULES:
- Extract ONLY individual line-item transactions. IGNORE summary blocks, interest tables, points summaries, headers/footers, section titles, payment stubs, remittance slips.
- Currency: assume CAD unless specified. For foreign transactions with CAD conversion, always use the CAD amount.
- Preserve spaces in merchant names: "SAVE ON FOODS" not "SAVEONFOODS", "CANADIAN TIRE" not "CANADIANTIRE".
- Strip city/province suffixes from merchant names (e.g. remove "EDMONTON AB", "BRAMPTON ON", "TORONTO ON").
- Strip trailing reference numbers (long digit strings like "74064495318820133598506").
- Include top-level "institution" field if bank/issuer (BMO, TD, RBC, CIBC, Scotiabank, Amex, Capital One, Canadian Tire) is detected.
- Use TRANSACTION DATE if available, otherwise use POSTING DATE.

BMO CHEQUING STATEMENT RULES:
- BMO statements have columns: "Amounts deducted from your account ($) | Amounts added to your account ($) | Balance ($)"
- Parse RIGHT TO LEFT: rightmost number = running balance (IGNORE IT), number left of balance = transaction amount.
- Number WITH thousands comma (e.g. 6,030.39) is likely the balance. Number WITHOUT comma (e.g. 11.85) is likely the amount.
- NEVER use the Balance column as the transaction amount.
- Debits/withdrawals/purchases = negative amounts. Deposits/credits/income = positive amounts.
- Common BMO prefixes to strip from merchant names: "Debit Card Purchase,", "Pre-Authorized Payment,", "Online Bill Payment,", "INTERAC e-Transfer Sent", "INTERAC e-Transfer Received", "Direct Deposit,", "Mobile Cheque Deposit".

RBC VISA / CREDIT CARD STATEMENT RULES:
- RBC Visa statements have only ONE "AMOUNT ($)" column. Positive amounts are charges (output as negative/debit). Negative amounts (prefixed with -) are payments/credits (output as positive/credit).
- Lines starting with "Foreign Currency - USD" are metadata for the transaction ABOVE them. Do NOT create a separate transaction for foreign currency lines. Use the CANADIAN DOLLAR amount from the main transaction line.
- Lines that are just long numeric strings (e.g. "74510204352610287899203") are internal reference numbers — skip them entirely.
- IGNORE these sections completely: "CALCULATING YOUR BALANCE", "PAYMENTS & INTEREST RATES", "IMPORTANT INFORMATION", "AVION POINTS", "CONTACT US", "INTEREST RATE CHART", "Time to Pay", payment stub/remittance slip, and any text after "TOTAL ACCOUNT BALANCE".
- "BALANCEPROTECTOR PREMIUM" is a bank fee. "OVERLIMIT FEE" and "CASH - SERVICE CHARGE" are also fees.
- "PAYMENT - THANK YOU / PAIEMENT - MERCI" is always a payment/credit. Output as positive amount.
- Statement period is "STATEMENT FROM [date] TO [date]".

CANADIAN TIRE / TRIANGLE MASTERCARD / TRIANGLE WORLD ELITE RULES:
- Single amount column format. Positive = charges (output negative), negative = payments (output positive).
- "INTEREST CHARGES" and "CREDIT INSURANCE PREMIUM" are fees, not purchases.
- "CTFS" or "CANADIAN TIRE BANK" references are the issuer, not a merchant.
- Statement period may appear as "Statement Period: [date] to [date]".

TD / SCOTIABANK CHEQUING STATEMENT RULES:
- These use two-column layouts similar to BMO (Withdrawals / Deposits / Balance).
- Same logic applies: IGNORE the Balance column, use only the Withdrawal or Deposit column for the transaction amount.
- Withdrawals/debits = negative amounts. Deposits/credits = positive amounts.

CIBC STATEMENT RULES:
- CIBC statements may split transaction details across multiple lines.
- Look for the transaction table with Date, Description, and Amount columns.
- Purchases are positive (output negative), payments are negative (output positive) for credit cards.
- For chequing accounts, use the Withdrawals and Deposits columns, ignore the Balance column.

AMERICAN EXPRESS RULES:
- Amex statements list charges as positive numbers and payments/credits as negative.
- Charges = output negative. Payments/credits = output positive.
- "ANNUAL MEMBERSHIP FEE" is a fee transaction, not a purchase.
- Ignore "Total New Charges", "Total Payments", and "Account Summary" sections entirely.

CAPITAL ONE RULES:
- Single amount column. Charges are positive (output negative), payments are negative (output positive).
- "INTEREST CHARGE" and "ANNUAL FEE" are fee transactions.
- Ignore "Account Summary" and "Payment Information" sections.

UNIVERSAL FALLBACK:
- If you cannot identify the specific bank, look for the transaction table header to determine column layout.
- Single amount column = credit card (positive = charge/output negative, negative = payment/output positive).
- Two amount columns + balance column = chequing/savings account (use deducted/added columns, NEVER the balance column).
- If a convenience store or gas station purchase shows as $500+, you are reading the Balance column by mistake. Re-parse the line.

OUTPUT FORMAT:
Return a JSON object: { "institution": "detected bank name", "transactions": [ ... ] }
Each transaction must have:
- date: YYYY-MM-DD
- description: Full activity line (before cleanup)
- merchant: Clean merchant name (no reference numbers, no city/province, no transaction type prefixes)
- amount: Number (negative for debits/purchases/charges, positive for credits/deposits/payments)

If no line-item transactions are found, output: { "transactions": [] }
No commentary, no markdown, no backticks - JSON only.`;

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

