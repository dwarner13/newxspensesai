import { logUtils } from '../logging.js';
import { config } from '../config.js';
import { extractAmountsFromText, validateTransactions } from './amountUtils.js';

// Transaction interface
export interface Transaction {
  id?: string;
  date: string;
  merchant: string;
  description: string;
  amount: number;
  direction: 'debit' | 'credit';
  category?: string;
  subcategory?: string;
  source?: 'structured' | 'regex_fallback' | 'ai_inferred' | 'invoice_single_fallback'; // Track extraction source
  rawLine?: string; // Original line for debugging
}

// Parsing result interface
export interface ParsingResult {
  transactions: Transaction[];
  confidence: number;
  metadata: {
    totalAmount: number;
    transactionCount: number;
    dateRange: {
      start: string;
      end: string;
    };
    currency: string;
  };
}

// Bank statement parser
export class BankStatementParser {
  async parseBankStatement(text: string): Promise<ParsingResult> {
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      const transactions: Transaction[] = [];
      let totalAmount = 0;
      let dateRange = { start: '', end: '' };
      let currency = 'CAD'; // Default currency
      
      // Parse each line for transaction data
      for (const line of lines) {
        const transaction = this.parseTransactionLine(line);
        if (transaction) {
          transactions.push(transaction);
          totalAmount += transaction.amount;
          
          // Update date range
          if (!dateRange.start || transaction.date < dateRange.start) {
            dateRange.start = transaction.date;
          }
          if (!dateRange.end || transaction.date > dateRange.end) {
            dateRange.end = transaction.date;
          }
        }
      }
      
      // If structured parser found 0 transactions, try regex fallback
      if (transactions.length === 0) {
        console.log(`[BankStatementParser] Structured parser found 0 transactions; trying regex fallback`);
        const fallbackTransactions = this.regexFallbackParse(text);
        if (fallbackTransactions.length > 0) {
          console.log(`[BankStatementParser] Regex fallback extracted ${fallbackTransactions.length} candidate transactions`);
          transactions = fallbackTransactions;
          // Recalculate totals and date range
          totalAmount = 0;
          dateRange = { start: '', end: '' };
          for (const txn of transactions) {
            totalAmount += txn.amount;
            if (!dateRange.start || txn.date < dateRange.start) {
              dateRange.start = txn.date;
            }
            if (!dateRange.end || txn.date > dateRange.end) {
              dateRange.end = txn.date;
            }
          }
        }
      }
      
      // Calculate confidence based on parsing success
      const confidence = this.calculateConfidence(transactions, lines.length);
      
      logUtils.logParsingResults(transactions.length, confidence);
      
      return {
        transactions,
        confidence,
        metadata: {
          totalAmount,
          transactionCount: transactions.length,
          dateRange,
          currency,
        },
      };
    } catch (error) {
      throw new Error(`Bank statement parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private parseTransactionLine(line: string): Transaction | null {
    try {
      // Common bank statement patterns
      const patterns = [
        // Pattern 1: Date, Description, Amount (e.g., "2024-01-15 AMAZON.COM AMZN.COM/BILL WA 123.45")
        /^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([+-]?\d+\.?\d*)$/,
        
        // Pattern 2: Date, Amount, Description (e.g., "2024-01-15 -123.45 AMAZON.COM")
        /^(\d{4}-\d{2}-\d{2})\s+([+-]?\d+\.?\d*)\s+(.+)$/,
        
        // Pattern 3: Date, Description, Amount with currency (e.g., "2024-01-15 AMAZON.COM $123.45")
        /^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+\$([+-]?\d+\.?\d*)$/,
        
        // Pattern 4: Date, Description, Amount with parentheses for credits (e.g., "2024-01-15 PAYROLL (2500.00)")
        /^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+\(([+-]?\d+\.?\d*)\)$/,
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const date = match[1];
          let description = '';
          let amount = 0;
          
          if (pattern === patterns[0] || pattern === patterns[2]) {
            // Date, Description, Amount
            description = match[2];
            amount = parseFloat(match[3]);
          } else if (pattern === patterns[1]) {
            // Date, Amount, Description
            amount = parseFloat(match[2]);
            description = match[3];
          } else if (pattern === patterns[3]) {
            // Date, Description, Amount in parentheses
            description = match[2];
            amount = parseFloat(match[3]);
          }
          
          // Determine direction
          const direction = amount < 0 ? 'debit' : 'credit';
          const absoluteAmount = Math.abs(amount);
          
          // Extract merchant name (first part of description)
          const merchant = this.extractMerchant(description);
          
          return {
            date,
            merchant,
            description,
            amount: absoluteAmount,
            direction,
            source: 'structured' as const,
          };
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Regex-based fallback parser for when structured parsing fails
   * Scans lines for date + description + amount patterns
   */
  private regexFallbackParse(text: string): Transaction[] {
    const transactions: Transaction[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Flexible patterns for date + description + amount
    const patterns = [
      // MM/DD/YYYY or MM-DD-YYYY + text + amount
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b\s+(.+?)\s+(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
      // YYYY-MM-DD + text + amount
      /\b(\d{4}-\d{2}-\d{2})\b\s+(.+?)\s+(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
      // Date + amount + text (reversed order)
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\b\s+(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(.+)/,
      // Date + text + amount with $ sign
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\b\s+(.+?)\s+\$(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
    ];
    
    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          let date = '';
          let description = '';
          let amountStr = '';
          
          if (match.length === 4) {
            // Pattern: date, description, amount
            date = match[1];
            description = match[2].trim();
            amountStr = match[3];
          } else if (match.length === 5 && pattern === patterns[2]) {
            // Pattern: date, amount, description (reversed)
            date = match[1];
            amountStr = match[2];
            description = match[3].trim();
          }
          
          // Normalize date format
          const normalizedDate = this.normalizeDate(date);
          if (!normalizedDate) continue;
          
          // Parse amount
          const amount = parseFloat(amountStr.replace(/,/g, ''));
          if (isNaN(amount) || amount === 0) continue;
          
          // Extract merchant (first meaningful word/phrase)
          const merchant = this.extractMerchant(description) || 'Unknown';
          
          // Determine direction
          const direction = amount < 0 ? 'debit' : 'credit';
          const absoluteAmount = Math.abs(amount);
          
          transactions.push({
            date: normalizedDate,
            merchant,
            description: description || merchant,
            amount: absoluteAmount,
            direction,
            source: 'regex_fallback',
            rawLine: line,
          });
          
          break; // Found a match, move to next line
        }
      }
    }
    
    return transactions;
  }
  
  /**
   * Normalize date string to YYYY-MM-DD format
   */
  private normalizeDate(dateStr: string): string | null {
    try {
      // Handle MM/DD/YYYY or MM-DD-YYYY
      const slashMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (slashMatch) {
        const month = parseInt(slashMatch[1]);
        const day = parseInt(slashMatch[2]);
        const year = parseInt(slashMatch[3]);
        const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
        return `${fullYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
      
      // Handle YYYY-MM-DD
      const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        return dateStr; // Already in correct format
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  private extractMerchant(description: string): string {
    // Common merchant extraction patterns
    const patterns = [
      // Remove common suffixes
      /^(.*?)\s+(INC|LLC|CORP|LTD|CO)\.?$/i,
      /^(.*?)\s+#\d+$/,
      /^(.*?)\s+\d{4}$/,
      /^(.*?)\s+WA$/,
      /^(.*?)\s+ON$/,
      /^(.*?)\s+CA$/,
    ];
    
    let merchant = description.trim();
    
    for (const pattern of patterns) {
      const match = merchant.match(pattern);
      if (match) {
        merchant = match[1].trim();
        break;
      }
    }
    
    // Limit merchant name length
    if (merchant.length > 50) {
      merchant = merchant.substring(0, 50).trim();
    }
    
    return merchant;
  }
  
  private calculateConfidence(transactions: Transaction[], totalLines: number): number {
    if (transactions.length === 0) {
      return 0;
    }
    
    // Base confidence on parsing success rate
    const successRate = transactions.length / totalLines;
    
    // Adjust confidence based on transaction quality
    let qualityScore = 0;
    
    for (const transaction of transactions) {
      // Check if date is valid
      if (this.isValidDate(transaction.date)) {
        qualityScore += 0.3;
      }
      
      // Check if amount is reasonable
      if (transaction.amount > 0 && transaction.amount < 100000) {
        qualityScore += 0.3;
      }
      
      // Check if description is meaningful
      if (transaction.description.length > 3) {
        qualityScore += 0.2;
      }
      
      // Check if merchant is meaningful
      if (transaction.merchant.length > 2) {
        qualityScore += 0.2;
      }
    }
    
    const averageQuality = qualityScore / transactions.length;
    const confidence = (successRate * 0.6) + (averageQuality * 0.4);
    
    return Math.min(confidence, 1.0);
  }
  
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;
  }
}

// Receipt parser
export class ReceiptParser {
  async parseReceipt(text: string): Promise<ParsingResult> {
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      const transactions: Transaction[] = [];
      let totalAmount = 0;
      let dateRange = { start: '', end: '' };
      let currency = 'CAD'; // Default currency
      
      // Look for total amount
      let totalAmountFound = false;
      for (const line of lines) {
        const amountMatch = line.match(/(?:total|amount|sum):?\s*\$?([+-]?\d+\.?\d*)/i);
        if (amountMatch && !totalAmountFound) {
          totalAmount = parseFloat(amountMatch[1]);
          totalAmountFound = true;
        }
      }
      
      // Look for date
      let dateFound = '';
      for (const line of lines) {
        const dateMatch = line.match(/(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})/);
        if (dateMatch && !dateFound) {
          dateFound = dateMatch[1];
          break;
        }
      }
      
      // Look for merchant name
      let merchant = 'Unknown Merchant';
      for (const line of lines) {
        if (line.length > 5 && line.length < 50 && !line.match(/\d+\.?\d*/)) {
          merchant = line;
          break;
        }
      }
      
      // Create single transaction for receipt
      if (totalAmount > 0 && dateFound) {
        const transaction: Transaction = {
          date: dateFound,
          merchant,
          description: `Receipt from ${merchant}`,
          amount: totalAmount,
          direction: 'debit',
          source: 'structured' as const,
        };
        
        transactions.push(transaction);
        dateRange = { start: dateFound, end: dateFound };
      }
      
      // Calculate confidence
      const confidence = this.calculateReceiptConfidence(transactions, totalAmountFound, dateFound);
      
      logUtils.logParsingResults(transactions.length, confidence);
      
      return {
        transactions,
        confidence,
        metadata: {
          totalAmount,
          transactionCount: transactions.length,
          dateRange,
          currency,
        },
      };
    } catch (error) {
      throw new Error(`Receipt parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private calculateReceiptConfidence(
    transactions: Transaction[],
    totalAmountFound: boolean,
    dateFound: string
  ): number {
    let confidence = 0;
    
    if (totalAmountFound) {
      confidence += 0.4;
    }
    
    if (dateFound) {
      confidence += 0.3;
    }
    
    if (transactions.length > 0) {
      confidence += 0.3;
    }
    
    return confidence;
  }
}

// Main parser factory
export class ParserFactory {
  static createParser(docType: 'receipt' | 'bank_statement'): BankStatementParser | ReceiptParser {
    switch (docType) {
      case 'bank_statement':
        return new BankStatementParser();
      case 'receipt':
        return new ReceiptParser();
      default:
        throw new Error(`Unknown document type: ${docType}`);
    }
  }
}

// Main parsing processor
export class ParsingProcessor {
  async parseDocument(
    text: string,
    docType: 'receipt' | 'bank_statement'
  ): Promise<ParsingResult> {
    try {
      const parser = ParserFactory.createParser(docType);
      
      let result: ParsingResult;
      if (docType === 'bank_statement') {
        result = await (parser as BankStatementParser).parseBankStatement(text);
      } else {
        result = await (parser as ReceiptParser).parseReceipt(text);
      }
      
      // If still 0 transactions and we have text, try AI extraction as last resort
      if (result.transactions.length === 0 && text.trim().length > 0 && config.ai.openai.apiKey) {
        console.log(`[ParsingProcessor] Both parsers found 0 transactions; trying AI extraction`);
        
        // Log OCR text preview for debugging
        console.debug('[ParsingProcessor] OCR text preview', {
          preview: text.slice(0, 400),
          totalLength: text.length,
        });
        
        try {
          // For bank statements, extract allowed amounts before AI extraction
          let allowedAmounts: string[] = [];
          if (docType === 'bank_statement') {
            allowedAmounts = extractAmountsFromText(text);
            console.log(`[ParsingProcessor] Extracted allowed amounts from OCR text`, {
              allowedAmounts: allowedAmounts.slice(0, 20), // Log first 20 for debugging
              amountCount: allowedAmounts.length,
              fullList: allowedAmounts, // Log all amounts for debugging
            });
            
            // Log FULL OCR text for debugging (critical for understanding extraction issues)
            console.log(`[ParsingProcessor] FULL OCR text (for debugging):`, text);
            console.log(`[ParsingProcessor] OCR text length: ${text.length} characters`);
          }
          
          // Strict mode only if we have enough distinct amounts (>= 5)
          // This prevents using strict mode when we only extracted totals (1-2 amounts)
          const useStrictAmounts = docType === 'bank_statement' && allowedAmounts.length >= 5;
          
          const aiTransactions = await this.aiExtractTransactionsFromText(
            text,
            docType,
            useStrictAmounts ? allowedAmounts : undefined
          );
          
          if (aiTransactions.length > 0) {
            console.log(`[ParsingProcessor] AI extraction found ${aiTransactions.length} candidate transactions`);
            
            // Validate transactions against allowed amounts (for bank statements when we have amounts)
            let validatedTransactions = aiTransactions;
            let validTransactions = aiTransactions;
            let flaggedTransactions: any[] = [];
            let transactionsForAnalysis = aiTransactions;
            
            if (docType === 'bank_statement' && allowedAmounts.length > 0) {
              validatedTransactions = validateTransactions(aiTransactions, allowedAmounts);
              
              // Split into valid and flagged transactions
              validTransactions = validatedTransactions.filter((t: any) => !t.needsAmountReview);
              flaggedTransactions = validatedTransactions.filter((t: any) => t.needsAmountReview);
              
              console.log(`[ParsingProcessor] Validation kept ${validTransactions.length} transactions (${flaggedTransactions.length} were summary totals or invalid amounts)`);
              
              if (flaggedTransactions.length > 0) {
                console.warn(`[ParsingProcessor] Found transactions with invalid amounts`, {
                  flaggedCount: flaggedTransactions.length,
                  flaggedExamples: flaggedTransactions.slice(0, 3).map((t: any) => ({
                    merchant: t.merchant,
                    amount: t.amount,
                    description: t.description?.substring(0, 50),
                  })),
                });
              }
              
              // Determine if validation is reliable using heuristic
              const totalCount = validatedTransactions.length;
              const flaggedCount = flaggedTransactions.length;
              const allowedCount = allowedAmounts.length;
              
              const validationLooksReliable =
                allowedCount >= 5 && // enough distinct amounts extracted
                flaggedCount > 0 &&
                flaggedCount < totalCount; // not "everything is invalid"
              
              if (validationLooksReliable) {
                // Validation is reliable - exclude flagged transactions from analysis
                transactionsForAnalysis = validTransactions;
                console.log(
                  `[ParsingProcessor] Excluded ${flaggedCount} flagged transaction(s) from analysis (invalid amounts)`
                );
              } else {
                // Validation is not reliable - include all transactions (but keep flags for UI)
                transactionsForAnalysis = validatedTransactions;
                console.warn(
                  `[ParsingProcessor] Validation unreliable, including flagged transactions in analysis`,
                  {
                    totalCount,
                    flaggedCount,
                    allowedCount,
                  }
                );
              }
            }
            
            // Return all transactions (with flags), but use transactionsForAnalysis for totals/metadata
            result.transactions = validatedTransactions;
            
            // Recalculate metadata using transactionsForAnalysis (may include flagged if validation unreliable)
            let totalAmount = 0;
            let totalDebits = 0;
            let totalCredits = 0;
            let dateRange = { start: '', end: '' };
            
            for (const txn of transactionsForAnalysis) {
              const amt = typeof txn.amount === 'number' ? txn.amount : parseFloat(String(txn.amount));
              totalAmount += amt;
              
              if (txn.direction === 'debit') {
                totalDebits += amt;
              } else if (txn.direction === 'credit') {
                totalCredits += amt;
              }
              
              if (!dateRange.start || txn.date < dateRange.start) {
                dateRange.start = txn.date;
              }
              if (!dateRange.end || txn.date > dateRange.end) {
                dateRange.end = txn.date;
              }
            }
            
            result.metadata = {
              totalAmount,
              transactionCount: transactionsForAnalysis.length, // Count transactions used for analysis
              dateRange,
              currency: 'CAD',
            };
            result.confidence = 0.6; // Lower confidence for AI-inferred
          }
        } catch (aiError) {
          console.warn(`[ParsingProcessor] AI extraction failed: ${aiError}`);
          // Continue with 0 transactions - will try invoice fallback below
        }
      }
      
      // Final fallback: If still 0 transactions, try single invoice/receipt detection
      if (result.transactions.length === 0 && text.trim().length > 0) {
        console.log(`[ParsingProcessor] All parsers found 0 transactions; trying invoice/receipt fallback`);
        const invoiceTransaction = this.tryExtractSingleInvoice(text);
        if (invoiceTransaction) {
          console.log(`[ParsingProcessor] Invoice fallback created 1 synthetic transaction: ${invoiceTransaction.merchant}, $${invoiceTransaction.amount}`);
          result.transactions = [invoiceTransaction];
          result.metadata = {
            totalAmount: Math.abs(invoiceTransaction.amount),
            transactionCount: 1,
            dateRange: {
              start: invoiceTransaction.date,
              end: invoiceTransaction.date,
            },
            currency: 'CAD',
          };
          result.confidence = 0.5; // Lower confidence for synthetic/inferred transactions
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Document parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Sanitize AI JSON response by removing code fences and prefixes
   */
  private sanitizeJsonResponse(raw: string): string {
    let text = raw.trim();
    
    // Strip ``` fences if present
    if (text.includes('```')) {
      const firstFence = text.indexOf('```');
      const lastFence = text.lastIndexOf('```');
      
      if (lastFence > firstFence) {
        text = text.slice(firstFence + 3, lastFence); // between fences
        // Remove "json" or similar language tag after opening fence
        text = text.replace(/^json\s*/i, '').trim();
      }
    }
    
    // Remove "JSON:" prefix if present
    if (text.toUpperCase().startsWith('JSON:')) {
      text = text.slice(5).trim();
    }
    
    // Remove any leading/trailing whitespace or newlines
    text = text.trim();
    
    return text;
  }

  /**
   * AI-only extraction as last resort fallback
   * For bank statements, uses strict amount validation when allowedAmounts is provided and length >= 5
   */
  private async aiExtractTransactionsFromText(
    redactedText: string,
    docType: 'receipt' | 'bank_statement',
    allowedAmounts?: string[]
  ): Promise<Transaction[]> {
    try {
      // Build prompt based on document type
      let prompt: string;
      
      if (docType === 'bank_statement' && allowedAmounts && allowedAmounts.length > 0) {
        // STRICT prompt for bank statements with amount constraints (when we have >= 5 amounts)
        prompt = `You are a STRICT bank statement parser. Extract ALL individual line-item transactions from this redacted bank statement text.

CRITICAL RULES - READ CAREFULLY:
1. Extract EVERY individual transaction line-item: purchases, payments, fees, interest charges, cash advances, deposits, refunds, etc.
2. DO NOT extract summary/total rows. EXCLUDE these types of lines:
   - "Total Purchases", "Total Payments", "Total Cash Advances"
   - "Previous Balance", "New Balance", "Closing Balance", "Opening Balance"
   - "Summary for This Period", "Account Summary", "Period Totals"
   - "Total Fees", "Total Interest", "Total Credits", "Total Debits"
   - Any line that says "TOTAL" or "SUMMARY" or "BALANCE" (unless it's part of a transaction description)
3. Valid transaction amounts MUST be copied EXACTLY from the statement text - NO ROUNDING, NO MODIFICATION.
4. The ONLY valid amounts you may use are from this EXACT list: ${allowedAmounts.join(', ')}
5. DO NOT use any amount that is NOT in the list above. If an amount isn't in the list, DO NOT extract that transaction.
6. DO NOT convert store numbers (e.g., KFC #1709, STORE 33535) into amounts. These are NOT transaction amounts.
7. DO NOT use balance amounts (e.g., "Balance: 3,026.53") as transaction amounts - balances are NOT transactions.
8. Extract ONLY actual transaction lines that have:
   - A date (Sep 17, Sep 18, etc.)
   - A description (e.g., "Debit Card Purchase", "Direct Deposit", "Payment", "Fee", "Interest Charge")
   - A merchant/vendor name (e.g., "SOBEYS", "APPLE.COM", "AMAZON", "NETFLIX")
   - An amount that matches EXACTLY one from the allowed list
9. If two consecutive lines both start with a date, treat them as TWO separate transactions.
10. Preserve vendor names EXACTLY as they appear (e.g., "SOBEYS HOLLICK KENYON", "7-ELEVEN STORE 33535", "KOSMOS RESTAURANT & LOUNGE")
11. Dates must match the statement (Sep 17 = 2025-09-17, Sep 18 = 2025-09-18, Sep 19 = 2025-09-19)
12. For debits: amount is deducted (negative in statement, but return as positive with direction="debit")
13. For credits: amount is added (positive in statement, return with direction="credit")
14. Include ALL transaction types: purchases, payments, fees, interest, cash advances, deposits, refunds, transfers, etc.

ALLOWED AMOUNTS (use ONLY these - prefer amounts from this list, but you may use duplicates and negative amounts):
${allowedAmounts.map(a => `- ${a}`).join('\n')}

Text:
${redactedText.substring(0, 10000)}${redactedText.length > 10000 ? '...' : ''}

Return ONLY a JSON array with ALL individual transactions, no explanations. Each transaction must have:
- date (YYYY-MM-DD format, matching the statement date)
- merchant (string, exact vendor name from text, preserve case and spacing)
- description (string, full transaction description from text)
- amount (string, MUST be EXACTLY one of: ${allowedAmounts.join(', ')})
- direction ("debit" for purchases/payments/fees/interest, "credit" for deposits/income/refunds)
- type (optional: "purchase", "payment", "fee", "interest", "cash_advance", "deposit", "refund", "transfer", "other")

Example format:
[{"date": "2025-09-17", "merchant": "SOBEYS HOLLICK KENYON", "description": "Debit Card Purchase, SOBEYS HOLLICK KENYON", "amount": "76.09", "direction": "debit", "type": "purchase"}, {"date": "2025-09-18", "merchant": "NETFLIX", "description": "NETFLIX.COM", "amount": "15.99", "direction": "debit", "type": "purchase"}]`;
      } else if (docType === 'bank_statement') {
        // SOFTER prompt for bank statements without strict amount list (when we only found totals)
        prompt = `You are a bank statement parser. Extract ALL individual line-item transactions from this redacted bank statement text.

IMPORTANT RULES:
1. Extract EVERY individual transaction line-item: purchases, payments, fees, interest charges, cash advances, deposits, refunds, etc.
2. DO NOT extract summary/total rows. EXCLUDE these types of lines:
   - "Total Purchases", "Total Payments", "Total Cash Advances"
   - "Previous Balance", "New Balance", "Closing Balance", "Opening Balance"
   - "Summary for This Period", "Account Summary", "Period Totals"
   - "Total Fees", "Total Interest", "Total Credits", "Total Debits"
   - Any line that says "TOTAL" or "SUMMARY" or "BALANCE" (unless it's part of a transaction description)
3. Copy amounts EXACTLY from the statement text - do not invent, round, or modify amounts
4. Do NOT convert store numbers (e.g., KFC #1709) into amounts like 1,709.00
5. Ignore numbers that look like IDs or store numbers (e.g., #1709, STORE 33535); they are NOT amounts
6. Extract every line that has a date and a dollar amount - include ALL purchases, payments, fees, interest, deposits, etc.
7. If two consecutive lines both start with a date, treat them as two separate transactions, not one
8. Preserve vendor names exactly as they appear (e.g., "SOBEYS HOLLICK KENYON", "7-ELEVEN STORE 33535", "KOSMOS RESTAURANT & LOUNGE")
9. Include ALL transaction types: purchases, payments, fees, interest, cash advances, deposits, refunds, transfers, etc.

Text:
${redactedText.substring(0, 10000)}${redactedText.length > 10000 ? '...' : ''}

Return ONLY a JSON array with ALL individual transactions, no explanations. Each transaction must have:
- date (YYYY-MM-DD format)
- merchant (string, exact vendor name from text)
- description (string, full transaction description)
- amount (number or string, copied exactly from the text)
- direction ("debit" for purchases/payments/fees/interest, "credit" for deposits/income/refunds)
- type (optional: "purchase", "payment", "fee", "interest", "cash_advance", "deposit", "refund", "transfer", "other")

Example format:
[{"date": "2025-09-17", "merchant": "SOBEYS HOLLICK KENYON", "description": "Debit Card Purchase, SOBEYS HOLLICK KENYON", "amount": 76.09, "direction": "debit", "type": "purchase"}, {"date": "2025-09-18", "merchant": "NETFLIX", "description": "NETFLIX.COM", "amount": 15.99, "direction": "debit", "type": "purchase"}]`;
      } else {
        // Standard prompt for receipts
        prompt = `You are a financial document parser. Extract any financial transactions from this redacted text.

Important:
- PII has already been redacted (no account numbers, addresses, phone numbers)
- Only extract lines that clearly look like transactions (date + description + amount)
- Be conservative - only extract if you're confident it's a transaction
- Return JSON array of transactions with: date (YYYY-MM-DD), merchant (string), description (string), amount (number, positive), direction ("debit" or "credit")

Text:
${redactedText.substring(0, 2000)}${redactedText.length > 2000 ? '...' : ''}

Return ONLY a JSON array, no explanations. Example format:
[{"date": "2025-01-03", "merchant": "Amazon", "description": "AMAZON.COM AMZN.COM/BILL", "amount": 42.15, "direction": "debit"}]`;
      }

      const systemMessage = docType === 'bank_statement' && allowedAmounts && allowedAmounts.length > 0
        ? 'You are a STRICT bank statement parser. Extract ALL individual line-item transactions as JSON array. Exclude summary/total rows. Use ONLY the allowed amounts provided.'
        : docType === 'bank_statement'
        ? 'You are a bank statement parser. Extract ALL individual line-item transactions as JSON array. Exclude summary/total rows. Copy amounts exactly from the text.'
        : 'You are a financial document parser. Extract transactions as JSON array only.';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.ai.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemMessage,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1, // Low temperature for strict parsing
          max_tokens: 8000, // Increased for extracting many transactions (supports ~50-60 transactions)
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result: any = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        return [];
      }

      // Parse JSON response
      try {
        // Sanitize JSON response (remove code fences, prefixes)
        const cleaned = this.sanitizeJsonResponse(content);
        
        let transactions: any[];
        
        // Handle both direct array and wrapped object responses
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          transactions = parsed;
        } else if (parsed.transactions && Array.isArray(parsed.transactions)) {
          transactions = parsed.transactions;
        } else if (typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          // Try to extract array from object
          const firstKey = Object.keys(parsed)[0];
          if (Array.isArray(parsed[firstKey])) {
            transactions = parsed[firstKey];
          } else {
            console.warn('[ParsingProcessor] Unexpected JSON structure from AI:', Object.keys(parsed));
            return [];
          }
        } else {
          return [];
        }

        // Convert to Transaction format with source marker
        return transactions.map((txn: any) => {
          // Handle amount as string or number
          const amountStr = String(txn.amount || '0');
          const amountNum = parseFloat(amountStr.replace(/,/g, ''));
          
          return {
            date: txn.date || new Date().toISOString().split('T')[0],
            merchant: (txn.merchant || 'Unknown').trim(),
            description: (txn.description || txn.merchant || 'Unknown').trim(),
            amount: Math.abs(amountNum) || 0,
            direction: (txn.direction || (amountNum < 0 ? 'debit' : 'credit')) as 'debit' | 'credit',
            source: 'ai_inferred' as const,
          };
        }).filter((txn: Transaction) => txn.amount > 0);
      } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
        console.warn('[ParsingProcessor] Failed to parse AI response:', {
          error: errorMsg,
          rawPreview: content.slice(0, 300),
          cleanedPreview: this.sanitizeJsonResponse(content).slice(0, 300),
        });
        return [];
      }
    } catch (error) {
      console.warn('[ParsingProcessor] AI extraction failed:', error);
      return [];
    }
  }

  /**
   * Fallback: Try to extract a single transaction from invoice/receipt OCR text
   * Only used when all other parsers found 0 transactions
   * 
   * Looks for invoice/receipt patterns:
   * - Keywords: INVOICE, RECEIPT, Sub Total, Total, Amount Due, Invoice No
   * - Monetary amounts (especially near "Total" or "Amount Due")
   * - Date patterns
   * - Merchant/vendor name
   * 
   * Returns a single Transaction if invoice-like structure is detected, null otherwise
   */
  private tryExtractSingleInvoice(text: string): Transaction | null {
    try {
      const upperText = text.toUpperCase();
      
      // Check for invoice/receipt keywords
      const invoiceKeywords = [
        'INVOICE',
        'RECEIPT',
        'SUB TOTAL',
        'SUBTOTAL',
        'TOTAL',
        'AMOUNT DUE',
        'AMOUNT OWING',
        'INVOICE NO',
        'INVOICE NUMBER',
        'INVOICE #',
        'BILL TO',
        'PAY TO',
        'PAYMENT DUE',
      ];
      
      const hasInvoiceKeywords = invoiceKeywords.some(keyword => upperText.includes(keyword));
      
      if (!hasInvoiceKeywords) {
        // Not an invoice/receipt - don't create synthetic transaction
        return null;
      }
      
      console.log(`[ParsingProcessor] Invoice keywords detected, attempting single transaction extraction`);
      
      // Extract amounts from text
      const amountPattern = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
      const amounts: Array<{ value: number; line: string; context: string }> = [];
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Find all amounts with context
      for (const line of lines) {
        const matches = Array.from(line.matchAll(amountPattern));
        for (const match of matches) {
          const amountStr = match[1].replace(/,/g, '');
          const amount = parseFloat(amountStr);
          if (amount > 0 && amount < 1000000) { // Reasonable range
            amounts.push({
              value: amount,
              line,
              context: line.toLowerCase(),
            });
          }
        }
      }
      
      if (amounts.length === 0) {
        console.log(`[ParsingProcessor] No amounts found in invoice text`);
        return null;
      }
      
      // Find the "Total" amount (usually the largest, or near "TOTAL" keyword)
      let totalAmount: number | null = null;
      
      // Strategy 1: Look for amount near "TOTAL" or "AMOUNT DUE"
      for (const line of lines) {
        const lineUpper = line.toUpperCase();
        if (lineUpper.includes('TOTAL') || lineUpper.includes('AMOUNT DUE') || lineUpper.includes('AMOUNT OWING')) {
          const matches = Array.from(line.matchAll(amountPattern));
          if (matches.length > 0) {
            const amountStr = matches[matches.length - 1][1].replace(/,/g, ''); // Take last amount on line
            const amount = parseFloat(amountStr);
            if (amount > 0) {
              totalAmount = amount;
              console.log(`[ParsingProcessor] Found total amount near TOTAL/AMOUNT DUE: $${totalAmount}`);
              break;
            }
          }
        }
      }
      
      // Strategy 2: If no explicit total found, use largest amount (likely the total)
      if (!totalAmount && amounts.length > 0) {
        totalAmount = Math.max(...amounts.map(a => a.value));
        console.log(`[ParsingProcessor] Using largest amount as total: $${totalAmount}`);
      }
      
      if (!totalAmount || totalAmount <= 0) {
        return null;
      }
      
      // Extract date (look for common date patterns)
      let extractedDate: string | null = null;
      const datePatterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, // MM/DD/YYYY or MM-DD-YYYY
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\.]+(\d{1,2})[,\.\s]+(\d{2,4})/i, // Jun 7, 2025
        /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // YYYY-MM-DD
      ];
      
      const monthNames: Record<string, string> = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
      };
      
      for (const line of lines.slice(0, 20)) { // Check first 20 lines for date
        for (const pattern of datePatterns) {
          const match = line.match(pattern);
          if (match) {
            let year: string, month: string, day: string;
            
            if (pattern === datePatterns[1]) {
              // Month name format: Jun 7, 2025
              const monthName = match[1].toLowerCase().substring(0, 3);
              month = monthNames[monthName] || '01';
              day = match[2].padStart(2, '0');
              year = match[3].length === 2 ? `20${match[3]}` : match[3];
            } else if (pattern === datePatterns[2]) {
              // YYYY-MM-DD format
              year = match[1];
              month = match[2].padStart(2, '0');
              day = match[3].padStart(2, '0');
            } else {
              // MM/DD/YYYY or MM-DD-YYYY
              month = match[1].padStart(2, '0');
              day = match[2].padStart(2, '0');
              year = match[3].length === 2 ? `20${match[3]}` : match[3];
            }
            
            extractedDate = `${year}-${month}-${day}`;
            console.log(`[ParsingProcessor] Extracted date from invoice: ${extractedDate}`);
            break;
          }
        }
        if (extractedDate) break;
      }
      
      // Default to today if no date found
      if (!extractedDate) {
        extractedDate = new Date().toISOString().split('T')[0];
        console.log(`[ParsingProcessor] No date found in invoice, using today: ${extractedDate}`);
      }
      
      // Extract merchant/vendor name (usually near top of invoice, before amounts)
      let merchant: string = 'Unknown Merchant';
      const merchantPatterns = [
        /^([A-Z][A-Z\s&]+(?:LTD|INC|LLC|CORP|CO\.|COMPANY)?)/, // All caps company name
        /(?:FROM|VENDOR|MERCHANT|BILL FROM)[\s:]+([A-Z][A-Z\s&]+)/i,
      ];
      
      for (const line of lines.slice(0, 15)) { // Check first 15 lines
        for (const pattern of merchantPatterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            merchant = match[1].trim();
            // Clean up common suffixes
            merchant = merchant.replace(/\s+(LTD|INC|LLC|CORP|CO\.|COMPANY)$/i, '').trim();
            if (merchant.length > 3 && merchant.length < 100) {
              console.log(`[ParsingProcessor] Extracted merchant from invoice: ${merchant}`);
              break;
            }
          }
        }
        if (merchant !== 'Unknown Merchant') break;
      }
      
      // If still unknown, try to find any capitalized words in first few lines
      if (merchant === 'Unknown Merchant') {
        for (const line of lines.slice(0, 10)) {
          const words = line.split(/\s+/).filter(w => w.length > 2);
          const capitalized = words.find(w => /^[A-Z][A-Z\s]+$/.test(w));
          if (capitalized && capitalized.length > 3 && capitalized.length < 50) {
            merchant = capitalized.trim();
            console.log(`[ParsingProcessor] Extracted merchant from capitalized text: ${merchant}`);
            break;
          }
        }
      }
      
      // Create synthetic transaction
      const transaction: Transaction = {
        date: extractedDate,
        merchant,
        description: `Invoice from ${merchant}`,
        amount: totalAmount, // Positive amount (will be marked as debit/expense)
        direction: 'debit',
        source: 'invoice_single_fallback',
        category: 'Uncategorized',
      };
      
      return transaction;
    } catch (error) {
      console.warn(`[ParsingProcessor] Invoice fallback extraction failed: ${error}`);
      return null;
    }
  }
}






