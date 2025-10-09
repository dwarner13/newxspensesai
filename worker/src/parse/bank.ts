import { logUtils } from '../logging.js';

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
          };
        }
      }
      
      return null;
    } catch (error) {
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
      
      if (docType === 'bank_statement') {
        return await (parser as BankStatementParser).parseBankStatement(text);
      } else {
        return await (parser as ReceiptParser).parseReceipt(text);
      }
    } catch (error) {
      throw new Error(`Document parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}




