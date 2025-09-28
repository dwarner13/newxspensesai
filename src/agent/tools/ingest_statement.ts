import { z } from "zod";

export const inputSchema = z.object({
  type: z.enum(["csv", "pdf", "image"]).optional(),
  text: z.string().optional(), // <-- NEW: pre-extracted text (from pdfjs)
  fileId: z.string().optional(),
  confirm: z.boolean().optional(),
});

export const outputSchema = z.object({
  inserted: z.number(),
  duplicates: z.number(),
  transactions: z.array(z.object({
    date: z.string(),
    description: z.string(),
    amount: z.number(),
    category: z.string().optional(),
  })).optional(),
});

// Advanced transaction parsing from financial statement text
function parseTransactionsFromText(text: string): Array<{date: string, description: string, amount: number, category?: string}> {
  const transactions: Array<{date: string, description: string, amount: number, category?: string}> = [];
  
  // Common financial statement patterns
  const patterns = [
    // Pattern 1: Date Description Amount (most common)
    {
      regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/,
      groups: { date: 1, description: 2, amount: 3 }
    },
    // Pattern 2: Date Amount Description
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
    {
      regex: /^(\d{2}[\/\-\.]\d{2})\s+(.+?)\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/,
      groups: { date: 1, description: 2, amount: 3 }
    },
    // Pattern 5: Bank statement format with posting date
    {
      regex: /^(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2})\s+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2})\s+(.+?)\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/,
      groups: { date: 1, description: 3, amount: 4 }
    }
  ];
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 5);
  
  for (const line of lines) {
    // Skip summary lines
    if (isSummaryLine(line)) continue;
    
    let match: RegExpMatchArray | null = null;
    let patternUsed = null;
    
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
        
        if (cleanDescription.length > 0) {
          transactions.push({
            date: normalizeDate(date),
            description: cleanDescription,
            amount: Math.abs(amount), // Always positive for expenses
            category: categorizeTransaction(cleanDescription)
          });
        }
      }
    }
  }
  
  // Remove duplicates and sort by date
  const uniqueTransactions = removeDuplicates(transactions);
  return uniqueTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function isSummaryLine(line: string): boolean {
  const summaryKeywords = [
    'total', 'balance', 'subtotal', 'grand total', 'statement', 'page', 
    'credit limit', 'available credit', 'minimum payment', 'due date',
    'previous balance', 'new balance', 'payment received', 'interest',
    'fees', 'charges', 'deposits', 'withdrawals', 'transfers'
  ];
  
  const lowerLine = line.toLowerCase();
  return summaryKeywords.some(keyword => lowerLine.includes(keyword));
}

function parseAmount(amountStr: string): number | null {
  // Remove currency symbols and parse
  const cleanAmount = amountStr.replace(/[\$\+\-\s]/g, '');
  const amount = parseFloat(cleanAmount.replace(/,/g, ''));
  
  // Validate amount
  if (isNaN(amount) || amount === 0) return null;
  
  // Handle negative amounts (credits)
  if (amountStr.includes('-') || amountStr.includes('+')) {
    return amountStr.includes('-') ? -amount : amount;
  }
  
  return amount;
}

function cleanDescription(description: string): string {
  return description
    .replace(/[^\w\s\-.,&()]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function removeDuplicates(transactions: Array<{date: string, description: string, amount: number, category?: string}>): Array<{date: string, description: string, amount: number, category?: string}> {
  const seen = new Set<string>();
  return transactions.filter(tx => {
    const key = `${tx.date}-${tx.description}-${tx.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeDate(dateStr: string): string {
  // Convert various date formats to ISO format
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let year = parts[2];
    let month = parts[0];
    let day = parts[1];
    
    // Handle 2-digit years
    if (year.length === 2) {
      year = '20' + year;
    }
    
    // Ensure month and day are 2 digits
    month = month.padStart(2, '0');
    day = day.padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  // Basic categorization
  if (desc.includes('gas') || desc.includes('fuel') || desc.includes('shell') || desc.includes('esso')) {
    return 'Transportation';
  } else if (desc.includes('grocery') || desc.includes('food') || desc.includes('restaurant') || desc.includes('coffee')) {
    return 'Food & Dining';
  } else if (desc.includes('amazon') || desc.includes('walmart') || desc.includes('target') || desc.includes('store')) {
    return 'Shopping';
  } else if (desc.includes('electric') || desc.includes('utility') || desc.includes('water') || desc.includes('internet')) {
    return 'Utilities';
  } else if (desc.includes('salary') || desc.includes('payroll') || desc.includes('income')) {
    return 'Income';
  } else if (desc.includes('transfer') || desc.includes('payment') || desc.includes('deposit')) {
    return 'Transfer';
  }
  
  return 'Other';
}

// Mock database functions (replace with actual implementation)
async function insertTransactions(userId: string, transactions: Array<{date: string, description: string, amount: number, category?: string}>): Promise<{inserted: number, duplicates: number}> {
  // This would normally insert into your database
  // For now, just return mock results
  console.log(`Would insert ${transactions.length} transactions for user ${userId}`);
  
  return {
    inserted: transactions.length,
    duplicates: 0
  };
}

export async function run(input: z.infer<typeof inputSchema>, ctx: { userId: string; conversationId?: string }) {
  const started = Date.now();
  
  try {
    // Handle pre-extracted text from PDFs
    if (input.text && (!input.fileId || input.type === "pdf")) {
      console.log(`Processing pre-extracted text for user ${ctx.userId}`);
      
      // Parse lines from text into transactions
      const transactions = parseTransactionsFromText(input.text);
      
      if (transactions.length === 0) {
        return {
          inserted: 0,
          duplicates: 0,
          transactions: [],
          message: "No transactions found in the provided text"
        };
      }
      
      const { inserted, duplicates } = await insertTransactions(ctx.userId, transactions);
      
      console.log(`Statement ingestion completed for user ${ctx.userId} in ${Date.now() - started}ms`);
      
      return {
        inserted,
        duplicates,
        transactions: transactions.slice(0, 10) // Return first 10 for preview
      };
    }
    
    // Handle other file types (CSV, images) - placeholder for now
    if (input.type === "csv") {
      return {
        inserted: 0,
        duplicates: 0,
        message: "CSV processing not yet implemented"
      };
    }
    
    if (input.type === "image") {
      return {
        inserted: 0,
        duplicates: 0,
        message: "Image OCR processing not yet implemented in this function"
      };
    }
    
    return {
      inserted: 0,
      duplicates: 0,
      message: "No valid input provided"
    };
    
  } catch (error) {
    console.error(`Statement ingestion failed for user ${ctx.userId}:`, error);
    return {
      inserted: 0,
      duplicates: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
