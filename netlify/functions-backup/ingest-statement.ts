import type { Handler } from '@netlify/functions';
// import { z } from 'zod'; // Temporarily disabled

// Temporarily disabled zod schema
// const inputSchema = z.object({
//   type: z.enum(["csv", "pdf", "image"]).optional(),
//   text: z.string().optional(),
//   fileId: z.string().optional(),
//   confirm: z.boolean().optional(),
//   userId: z.string().optional(),
// });

export const handler: Handler = async (event) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }) 
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    // const { type, text, fileId, confirm, userId } = inputSchema.parse(body); // Temporarily disabled
    const { type, text, fileId, confirm, userId } = body;

    if (!text && !fileId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Either text content or fileId must be provided' 
        })
      };
    }

    const started = Date.now();
    
    // Handle pre-extracted text from PDFs
    if (text && (!fileId || type === "pdf")) {
      console.log(`Processing pre-extracted text for user ${userId || 'anonymous'}`);
      
      // Parse transactions from text using the advanced parser
      const transactions = parseTransactionsFromText(text);
      
      if (transactions.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            inserted: 0,
            duplicates: 0,
            transactions: [],
            message: "No transactions found in the provided text"
          })
        };
      }
      
      // In a real implementation, you would insert into your database here
      const { inserted, duplicates } = await insertTransactions(userId || 'demo-user', transactions);
      
      const duration = Date.now() - started;
      console.log(`Statement ingestion completed in ${duration}ms for user ${userId || 'anonymous'}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          inserted,
          duplicates,
          transactions: transactions.slice(0, 10), // Return first 10 for preview
          totalFound: transactions.length,
          duration
        })
      };
    }
    
    // Handle other file types
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        inserted: 0,
        duplicates: 0,
        message: `${type || 'Unknown'} processing not yet implemented`
      })
    };
    
  } catch (error) {
    console.error('Statement ingestion error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    };
  }
};

// Import the parsing logic from the agent tool
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
  
  // Enhanced categorization
  if (desc.includes('gas') || desc.includes('fuel') || desc.includes('shell') || desc.includes('esso') || desc.includes('mobil')) {
    return 'Transportation';
  } else if (desc.includes('grocery') || desc.includes('food') || desc.includes('restaurant') || desc.includes('coffee') || desc.includes('starbucks') || desc.includes('mcdonald')) {
    return 'Food & Dining';
  } else if (desc.includes('amazon') || desc.includes('walmart') || desc.includes('target') || desc.includes('store') || desc.includes('shop')) {
    return 'Shopping';
  } else if (desc.includes('electric') || desc.includes('utility') || desc.includes('water') || desc.includes('internet') || desc.includes('cable') || desc.includes('phone')) {
    return 'Utilities';
  } else if (desc.includes('salary') || desc.includes('payroll') || desc.includes('income') || desc.includes('deposit')) {
    return 'Income';
  } else if (desc.includes('transfer') || desc.includes('payment') || desc.includes('deposit') || desc.includes('withdrawal')) {
    return 'Transfer';
  } else if (desc.includes('medical') || desc.includes('doctor') || desc.includes('pharmacy') || desc.includes('hospital')) {
    return 'Healthcare';
  } else if (desc.includes('insurance') || desc.includes('premium')) {
    return 'Insurance';
  }
  
  return 'Other';
}

// Mock database function
async function insertTransactions(userId: string, transactions: Array<{date: string, description: string, amount: number, category?: string}>): Promise<{inserted: number, duplicates: number}> {
  // This would normally insert into your database
  // For now, just return mock results
  console.log(`Would insert ${transactions.length} transactions for user ${userId}`);
  
  return {
    inserted: transactions.length,
    duplicates: 0
  };
}
