import { Transaction } from '../types/database.types';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface OpenAITransaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
}

export const parsePDF = async (file: File): Promise<Partial<Transaction>[]> => {
  try {
    // Step 1: Extract text from PDF using pdf-parse
    const pdfText = await extractTextFromPDF(file);
    
    if (!pdfText || pdfText.trim().length < 50) {
      throw new Error('Could not extract sufficient text from PDF. The file may be image-based or corrupted.');
    }

    // Step 2: Send to OpenAI for intelligent parsing
    const transactions = await parseTransactionsWithAI(pdfText);
    
    if (!transactions || transactions.length === 0) {
      throw new Error('No transactions could be identified in the PDF. Please try uploading as CSV or check if this is a valid bank statement.');
    }

    // Step 3: Convert to our Transaction format
    return transactions.map(tx => ({
      date: tx.date,
      description: tx.description.trim(),
      amount: Math.abs(tx.amount), // Ensure positive amount
      type: tx.type === 'credit' ? 'Credit' : 'Debit',
    }));

  } catch (error) {
    console.error('PDF parsing error:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('OpenAI')) {
        throw new Error('AI parsing service is temporarily unavailable. Please try uploading as CSV or try again later.');
      }
      throw error;
    }
    
    throw new Error('Failed to parse PDF file. Please ensure this is a valid bank statement and try again, or upload as CSV.');
  }
};

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document using PDF.js
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine all text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    // Clean up the text
    const cleanedText = fullText
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
    
    if (!cleanedText || cleanedText.length < 50) {
      throw new Error('Could not extract sufficient text from PDF. The file may be image-based or corrupted.');
    }
    
    console.log('Successfully extracted text from PDF:', cleanedText.substring(0, 200) + '...');
    return cleanedText;
    
  } catch (error) {
    console.error('PDF.js extraction error:', error);
    
    // Fallback to simple text reading for some PDFs
    try {
      const text = await readAsText(file);
      if (text && text.length > 100 && text.includes(' ')) {
        console.log('Fallback text extraction successful');
        return text;
      }
    } catch (fallbackError) {
      console.error('Fallback extraction also failed:', fallbackError);
    }
    
    throw new Error('Could not extract text from PDF. The file may be password-protected, corrupted, or contain only images.');
  }
}

async function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}



async function parseTransactionsWithAI(pdfText: string): Promise<OpenAITransaction[]> {
  const openAIKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!openAIKey) {
    // Fallback to pattern-based parsing if no OpenAI key
    console.warn('OpenAI API key not found, using fallback parsing');
    return parseTransactionsWithPatterns(pdfText);
  }

  try {
    // Limit the text to avoid excessive token usage
    // Extract only the most relevant parts (usually the transaction section)
    const limitedText = extractTransactionSection(pdfText);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a financial document parser. Extract all transactions from bank/credit card statements.

IMPORTANT RULES:
1. Only return valid JSON array of transactions
2. Date format must be YYYY-MM-DD
3. Amount must be positive number (no currency symbols)
4. Type must be exactly "credit" or "debit"
5. Description should be clean merchant/transaction name
6. Ignore headers, footers, account info, balances
7. If you can't parse clearly, return empty array []
8. LIMIT TO MAXIMUM 20 TRANSACTIONS to save tokens

Response format:
[
  {
    "date": "2024-11-01",
    "description": "Grocery Store",
    "amount": 85.47,
    "type": "debit"
  }
]`
          },
          {
            role: 'user',
            content: `Extract transactions from this bank statement text (limit to 20 max):\n\n${limitedText}`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const transactions = JSON.parse(content);
    
    // Validate the response
    if (!Array.isArray(transactions)) {
      throw new Error('Invalid response format from AI');
    }

    // Validate each transaction
    const validTransactions = transactions.filter(tx => {
      return tx.date && tx.description && 
             typeof tx.amount === 'number' && tx.amount > 0 &&
             (tx.type === 'credit' || tx.type === 'debit');
    });

    return validTransactions;

  } catch (error) {
    console.error('OpenAI parsing error:', error);
    
    // Fallback to pattern-based parsing
    console.warn('Falling back to pattern-based parsing');
    return parseTransactionsWithPatterns(pdfText);
  }
}

function extractTransactionSection(text: string): string {
  // Try to identify the transaction section in the PDF
  // This is a heuristic approach that looks for common patterns in bank statements
  
  const lines = text.split('\n');
  let transactionLines: string[] = [];
  let inTransactionSection = false;
  
  // Look for transaction section markers
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check for section headers
    if (lowerLine.includes('transaction') && 
        (lowerLine.includes('detail') || lowerLine.includes('history') || lowerLine.includes('list'))) {
      inTransactionSection = true;
      continue;
    }
    
    // Check for end of transaction section
    if (inTransactionSection && 
        (lowerLine.includes('balance summary') || lowerLine.includes('ending balance') || 
         lowerLine.includes('total') || lowerLine.includes('summary'))) {
      inTransactionSection = false;
      break;
    }
    
    // Collect transaction lines
    if (inTransactionSection) {
      transactionLines.push(line);
    }
  }
  
  // If we couldn't identify a clear transaction section, use a different approach
  if (transactionLines.length < 5) {
    // Look for lines that match transaction patterns
    transactionLines = lines.filter(line => {
      // Look for date patterns
      const hasDate = /\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(line);
      // Look for amount patterns
      const hasAmount = /\$?\d+\.\d{2}/.test(line);
      // Look for words (description)
      const hasWords = /[a-zA-Z]{3,}/.test(line);
      
      return hasDate && hasAmount && hasWords && line.length > 10;
    });
  }
  
  // Limit to 20 lines to save tokens
  return transactionLines.slice(0, 20).join('\n');
}

function parseTransactionsWithPatterns(text: string): OpenAITransaction[] {
  const transactions: OpenAITransaction[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Pattern to match common transaction formats
    // Date (various formats) + Description + Amount + Type
    const patterns = [
      // MM/DD/YYYY format
      /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([-+]?\$?\d+\.?\d*)\s+(CREDIT|DEBIT|CR|DR)/i,
      // YYYY-MM-DD format
      /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([-+]?\$?\d+\.?\d*)\s+(CREDIT|DEBIT|CR|DR)/i,
      // DD/MM/YYYY format
      /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([-+]?\$?\d+\.?\d*)/i,
      // Month name format
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\s+(.+?)\s+([-+]?\$?\d+\.?\d*)/i,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          let dateStr, description, amountStr, typeStr;
          
          if (pattern.toString().includes('Jan|Feb|Mar')) {
            // Month name format
            const [, month, desc, amt] = match;
            dateStr = month;
            description = desc;
            amountStr = amt;
            typeStr = amountStr.startsWith('+') || amountStr.startsWith('$+') ? 'CREDIT' : 'DEBIT';
          } else {
            // Standard format
            [, dateStr, description, amountStr, typeStr] = match;
            if (!typeStr) {
              typeStr = amountStr.startsWith('+') || amountStr.startsWith('$+') ? 'CREDIT' : 'DEBIT';
            }
          }
          
          // Parse date
          let date: string;
          if (dateStr.includes('-')) {
            date = dateStr; // Already in YYYY-MM-DD format
          } else if (dateStr.includes('/')) {
            // Convert MM/DD/YYYY to YYYY-MM-DD
            const [month, day, year] = dateStr.split('/');
            date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            // Handle month name format (approximate)
            const currentYear = new Date().getFullYear();
            date = `${currentYear}-01-01`; // Placeholder
          }

          // Parse amount
          const amount = Math.abs(parseFloat(amountStr.replace(/[$,+]/g, '')));
          
          // Determine type
          let type: 'credit' | 'debit' = 'debit';
          if (typeStr) {
            type = typeStr.toLowerCase().includes('cr') || typeStr.toLowerCase().includes('credit') ? 'credit' : 'debit';
          } else {
            // Infer from amount sign or keywords
            type = amountStr.startsWith('+') || description.toLowerCase().includes('deposit') || description.toLowerCase().includes('payroll') ? 'credit' : 'debit';
          }

          transactions.push({
            date,
            description: description.trim(),
            amount,
            type
          });
          
          break; // Found a match, move to next line
        } catch (error) {
          console.warn('Failed to parse transaction line:', line);
        }
      }
    }
    
    // Limit to 20 transactions
    if (transactions.length >= 20) break;
  }

  return transactions;
}