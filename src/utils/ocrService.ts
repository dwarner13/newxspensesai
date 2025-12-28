// ⚠️ DEPRECATED: Use server-side pipeline instead (smart-import-* + normalize-transactions)
// This exposes API key in browser and bypasses guardrails
// 
// 🚫 HARD DEPRECATION: All functions in this file throw errors in DEV mode
// Use src/lib/ocr/requestOcrProcessing.ts instead (canonical backend pipeline)
const OCR_API_KEY = "K82312040988957"; // Your new OCR.space API key

const DEPRECATION_MESSAGE = `DEPRECATED: Frontend OCR bypasses guardrails. Use backend smart-import-ocr pipeline.
  
Import and use:
  import { requestOcrProcessing } from '@/lib/ocr/requestOcrProcessing';
  
This ensures:
  ✅ Guardrails are applied (PII masking, moderation)
  ✅ OCR text is redacted before storage
  ✅ Consistent pipeline across all entry points
  ✅ Idempotency support (requestId parameter)`;

function throwIfDeprecated() {
  if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
    throw new Error(DEPRECATION_MESSAGE);
  }
  // In production, log warning but don't throw (fail gracefully)
  console.error('[DEPRECATED OCR]', DEPRECATION_MESSAGE);
}

// OpenAI Vision API fallback (like ChatGPT uses)
export const extractTextWithOpenAIVision = async (imageFile: File): Promise<OCRResult> => {
  throwIfDeprecated(); // 🚫 Hard deprecation - throws in DEV
  
  try {
    console.log('🔍 Using OpenAI Vision API for text extraction...');
    
    // Convert file to base64
    const base64Image = await convertFileToBase64(imageFile);
    
    const response = await fetch('/.netlify/functions/openai-vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        prompt: "Extract all text from this document. If it's a financial document like a credit card statement or receipt, identify the vendor name, amounts, dates, and any transaction details."
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI Vision API error');
    }

    const data = await response.json();
    const extractedText = data.text || '';
    
    console.log('OpenAI Vision extracted text length:', extractedText.length);
    console.log('First 500 chars from OpenAI Vision:', extractedText.substring(0, 500));

    return {
      text: extractedText,
      confidence: 0.9 // OpenAI Vision is generally more accurate
    };
  } catch (error) {
    console.error('OpenAI Vision API error:', error);
    throw error;
  }
};

export interface OCRResult {
  text: string;
  confidence: number;
}

export const extractTextFromImage = async (imageUrl: string): Promise<OCRResult> => {
  throwIfDeprecated(); // 🚫 Hard deprecation - throws in DEV
  
  try {
    const formData = new FormData();
    formData.append("url", imageUrl);
    formData.append("isOverlayRequired", "false");
    formData.append("language", "eng");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2"); // Use OCR Engine 2 for better accuracy

    console.log('Sending OCR request for image:', imageUrl);
    
    const response = await fetch("https://api.ocr.space/parse/imageurl", {
      method: "POST",
      headers: {
        apikey: OCR_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OCR API error response:', errorText);
      throw new Error(`OCR API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('OCR API response:', result);
    console.log('OCR API response structure:', {
      IsErroredOnProcessing: result.IsErroredOnProcessing,
      ErrorMessage: result.ErrorMessage,
      ParsedResults: result.ParsedResults?.length || 0,
      FirstResult: result.ParsedResults?.[0] ? {
        ParsedText: result.ParsedResults[0].ParsedText?.substring(0, 200) + '...',
        TextOverlay: result.ParsedResults[0].TextOverlay
      } : null});
    
    if (result.IsErroredOnProcessing) {
      console.error('OCR processing error:', result.ErrorMessage);
      throw new Error(result.ErrorMessage || 'OCR processing failed');
    }

    const extractedText = result?.ParsedResults?.[0]?.ParsedText || "";
    const confidence = result?.ParsedResults?.[0]?.TextOverlay?.HasOverlay ? 0.8 : 0.6;
    
    console.log('Extracted text length:', extractedText.length);
    console.log('First 500 chars of extracted text:', extractedText.substring(0, 500));

    // If no text was extracted, throw an error
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text was extracted from the image. The image may be too blurry, poorly lit, or not contain readable text.');
    }

    return {
      text: extractedText,
      confidence
    };
  } catch (error) {
    console.error('OCR extraction error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('OCR API key is invalid or missing');
      } else if (error.message.includes('429')) {
        throw new Error('OCR API rate limit exceeded. Please try again later.');
      } else if (error.message.includes('No text')) {
        throw new Error('No text could be extracted. Try improving image quality with better lighting and a flat surface.');
      }
    }
    
    throw new Error('Failed to extract text from image. Please check your internet connection and try again.');
  }
};

export interface ParsedReceiptData {
  vendor?: string;
  date?: string;
  total?: number;
  items?: Array<{
    description: string;
    amount: number;
  }>;
  category?: string;
  confidence?: number;
  // Enhanced for credit card statements
  isCreditCardStatement?: boolean;
  individualTransactions?: Array<{
    transactionDate: string;
    postingDate: string;
    description: string;
    amount: number;
    merchant?: string;
  }>;
  statementPeriod?: {
    startDate: string;
    endDate: string;
  };
  accountSummary?: {
    previousBalance: number;
    payments: number;
    purchases: number;
    newBalance: number;
    availableCredit: number;
  };
}

export const parseReceiptText = (text: string): ParsedReceiptData => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  let vendor = '';
  let date = '';
  let total = 0;
  let category = 'Uncategorized';
  const items: Array<{ description: string; amount: number }> = [];
  let isCreditCardStatement = false;
  const individualTransactions: Array<{
    transactionDate: string;
    postingDate: string;
    description: string;
    amount: number;
    merchant?: string;
  }> = [];
  let statementPeriod = { startDate: '', endDate: '' };
  let accountSummary = {
    previousBalance: 0,
    payments: 0,
    purchases: 0,
    newBalance: 0,
    availableCredit: 0
  };

  console.log('🔍 Parsing OCR text:', text);

  // First, detect if this is a credit card statement
  const textLower = text.toLowerCase();
  isCreditCardStatement = textLower.includes('credit card') || 
                         textLower.includes('mastercard') || 
                         textLower.includes('visa') || 
                         textLower.includes('statement') ||
                         textLower.includes('account summary') ||
                         textLower.includes('balance from your last statement') ||
                         textLower.includes('purchases') ||
                         textLower.includes('payments received');

  console.log('📄 Is credit card statement:', isCreditCardStatement);

  if (isCreditCardStatement) {
    return parseCreditCardStatement(text, lines);
  }

  // Enhanced vendor extraction for financial documents
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    
    // Skip lines that are clearly not vendor names
    if (line.match(/^\d+[-/]\d+[-/]\d+/) || // Date patterns
        line.match(/^\$?\d+\.?\d*$/) || // Just amounts
        line.match(/^(total|subtotal|tax|change|balance|amount|due|paid)/i) ||
        line.match(/^(store|address|phone|website|email)/i) ||
        line.match(/^(thank|receipt|copy|original|void)/i) ||
        line.match(/^(statement|account|card|number)/i) ||
        line.length < 3) {
      continue;
    }
    
    // Look for financial institution names or merchant names
    if (line.length > 3 && line.length < 100 && !line.match(/^[0-9\s\-\(\)]+$/)) {
      // Check if it looks like a financial institution or merchant
      const financialKeywords = ['bank', 'credit', 'card', 'mastercard', 'visa', 'amex', 'chase', 'wells', 'fargo', 'bank of america', 'citibank', 'capital one', 'discover', 'triangle', 'world elite'];
      const isFinancial = financialKeywords.some(keyword => line.toLowerCase().includes(keyword));
      
      if (isFinancial || (!vendor && line.length > 5)) {
        vendor = line.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
        console.log('🏦 Found vendor:', vendor);
        break;
      }
    }
  }

  // Fallback to first line if no vendor found
  if (!vendor && lines.length > 0) {
    vendor = lines[0].replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
  }

  // Extract date
  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    if (dateMatch && !date) {
      let dateStr = dateMatch[1];
      // Convert to YYYY-MM-DD format
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts[2].length === 2) {
          parts[2] = '20' + parts[2]; // Assume 20xx for 2-digit years
        }
        if (parts[0].length <= 2 && parts[1].length <= 2) {
          // MM/DD/YYYY or DD/MM/YYYY - assume MM/DD/YYYY for US
          dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
      }
      date = dateStr;
      break;
    }
  }

  // Enhanced amount extraction for financial documents
  const totalPatterns = [
    /total[:\s]*\$?(\d+\.?\d*)/i,
    /amount[:\s]*\$?(\d+\.?\d*)/i,
    /balance[:\s]*\$?(\d+\.?\d*)/i,
    /current[:\s]*balance[:\s]*\$?(\d+\.?\d*)/i,
    /new[:\s]*balance[:\s]*\$?(\d+\.?\d*)/i,
    /statement[:\s]*balance[:\s]*\$?(\d+\.?\d*)/i,
    /\$(\d+\.\d{2})\s*$/,
    /(\d+\.\d{2})\s*$/, // Last number with 2 decimals
    /\$(\d{1,3}(?:,\d{3})*\.\d{2})/, // Formatted amounts like $1,234.56
    /(\d{1,3}(?:,\d{3})*\.\d{2})/ // Formatted amounts without $ sign
  ];

  // Look for amounts in the text
  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        let amountStr = match[1].replace(/,/g, ''); // Remove commas
        const amount = parseFloat(amountStr);
        if (amount > 0 && amount < 100000) { // Expanded range for credit card statements
          total = amount;
          console.log('💰 Found amount:', total, 'from line:', line);
          break;
        }
      }
    }
    if (total > 0) break;
  }

  // If no total found, look for any reasonable amount in the document
  if (total === 0) {
    for (const line of lines) {
      const amountMatch = line.match(/\$?(\d{1,3}(?:,\d{3})*\.\d{2})/);
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (amount > 0 && amount < 100000) {
          total = amount;
          console.log('💰 Found fallback amount:', total, 'from line:', line);
          break;
        }
      }
    }
  }

  // Extract line items - be more selective to avoid false positives
  for (const line of lines) {
    // Skip lines that are likely headers, footers, or noise
    const skipPatterns = [
      /^(total|subtotal|tax|change|balance|amount|due|paid)/i,
      /^(store|address|phone|website|email)/i,
      /^(thank|receipt|copy|original|void)/i,
      /^[0-9\s\-\(\)]+$/, // Just numbers and symbols
      /^[A-Z\s\-\(\)]+$/, // Just uppercase letters (likely headers)
    ];
    
    if (skipPatterns.some(pattern => pattern.test(line))) {
      continue;
    }
    
    // Look for actual item patterns
    const itemMatch = line.match(/^(.+?)\s+\$?(\d+\.?\d*)\s*$/);
    if (itemMatch) {
      const description = itemMatch[1].trim();
      const amount = parseFloat(itemMatch[2]);
      
      // More strict validation
      if (amount > 0 && 
          amount < total && 
          description.length > 3 && 
          description.length < 50 && // Not too long
          !description.match(/^(total|subtotal|tax|change|balance|amount|due|paid)/i) &&
          !description.match(/^[0-9\s\-\(\)]+$/) &&
          !description.match(/^[A-Z\s\-\(\)]+$/)) {
        
        items.push({
          description: description.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim(),
          amount});
      }
    }
  }

  // Enhanced category detection for financial documents
  const vendorLower = vendor.toLowerCase();
  
  // Check for financial document types first
  if (vendorLower.includes('credit') || vendorLower.includes('card') || vendorLower.includes('mastercard') || 
      vendorLower.includes('visa') || vendorLower.includes('amex') || vendorLower.includes('discover') ||
      vendorLower.includes('triangle') || vendorLower.includes('world elite')) {
    category = 'Credit Card Statement';
  } else if (vendorLower.includes('bank') || textLower.includes('bank statement') || textLower.includes('account statement')) {
    category = 'Bank Statement';
  } else if (vendorLower.includes('grocery') || vendorLower.includes('market') || vendorLower.includes('food')) {
    category = 'Groceries';
  } else if (vendorLower.includes('gas') || vendorLower.includes('fuel') || vendorLower.includes('shell') || vendorLower.includes('exxon')) {
    category = 'Transportation';
  } else if (vendorLower.includes('restaurant') || vendorLower.includes('cafe') || vendorLower.includes('pizza') || vendorLower.includes('burger')) {
    category = 'Dining';
  } else if (vendorLower.includes('target') || vendorLower.includes('walmart') || vendorLower.includes('store')) {
    category = 'Shopping';
  } else if (vendorLower.includes('pharmacy') || vendorLower.includes('cvs') || vendorLower.includes('walgreens')) {
    category = 'Healthcare';
  } else if (textLower.includes('statement') || textLower.includes('balance') || textLower.includes('account')) {
    category = 'Financial Document';
  }

  const result = {
    vendor: vendor || 'Unknown Vendor',
    date: date || new Date().toISOString().split('T')[0],
    total: total || 0,
    items: items.slice(0, 10), // Limit to 10 items
    category,
    confidence: 0.75
  };

  console.log('📊 Parsed result:', result);
  return result;
};

// Specialized parser for credit card statements
const parseCreditCardStatement = (text: string, lines: string[]): ParsedReceiptData => {
  console.log('💳 Parsing credit card statement...');
  
  let vendor = '';
  let date = '';
  let total = 0;
  let category = 'Credit Card Statement';
  const individualTransactions: Array<{
    transactionDate: string;
    postingDate: string;
    description: string;
    amount: number;
    merchant?: string;
  }> = [];
  let statementPeriod = { startDate: '', endDate: '' };
  let accountSummary = {
    previousBalance: 0,
    payments: 0,
    purchases: 0,
    newBalance: 0,
    availableCredit: 0
  };

  // Extract vendor from header
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    if (line.includes('Triangle') || line.includes('Mastercard') || line.includes('World Elite')) {
      vendor = line.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
      break;
    }
  }

  // Extract statement period
  for (const line of lines) {
    if (line.includes('For the period:')) {
      const periodMatch = line.match(/For the period:\s*(\w+\s+\d+,\s+\d+)\s+to\s+(\w+\s+\d+,\s+\d+)/);
      if (periodMatch) {
        statementPeriod.startDate = periodMatch[1];
        statementPeriod.endDate = periodMatch[2];
      }
    }
  }

  // Extract account summary
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Previous balance
    if (line.includes('Balance from your last statement')) {
      const amountMatch = line.match(/\$?([\d,]+\.?\d*)/);
      if (amountMatch) {
        accountSummary.previousBalance = parseFloat(amountMatch[1].replace(/,/g, ''));
      }
    }
    
    // Payments
    if (line.includes('Payments received') && line.includes('Total payments received')) {
      const amountMatch = line.match(/\$?([\d,]+\.?\d*)/);
      if (amountMatch) {
        accountSummary.payments = parseFloat(amountMatch[1].replace(/,/g, ''));
      }
    }
    
    // Purchases
    if (line.includes('Total purchases') && line.includes('for')) {
      const amountMatch = line.match(/\$?([\d,]+\.?\d*)/);
      if (amountMatch) {
        accountSummary.purchases = parseFloat(amountMatch[1].replace(/,/g, ''));
      }
    }
    
    // New balance
    if (line.includes('Your New Balance')) {
      const amountMatch = line.match(/\$?([\d,]+\.?\d*)/);
      if (amountMatch) {
        accountSummary.newBalance = parseFloat(amountMatch[1].replace(/,/g, ''));
        total = accountSummary.newBalance;
      }
    }
    
    // Available credit
    if (line.includes('Available credit')) {
      const amountMatch = line.match(/\$?([\d,]+\.?\d*)/);
      if (amountMatch) {
        accountSummary.availableCredit = parseFloat(amountMatch[1].replace(/,/g, ''));
      }
    }
  }

  // Extract individual transactions - look for various patterns
  let inTransactionSection = false;
  let transactionHeadersFound = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for transaction section headers (multiple variations)
    if ((line.includes('TRANSACTION DATE') && line.includes('POSTING DATE')) || 
        (line.includes('Date') && line.includes('Description') && line.includes('Amount')) ||
        line.includes('Transaction Details') ||
        line.includes('Purchase Details') ||
        line.includes('Purchases - Card #')) {
      inTransactionSection = true;
      transactionHeadersFound = true;
      continue;
    }
    
    // Look for "Purchases" section or similar
    if (line.includes('Purchases') || line.includes('Transactions') || line.includes('Activity')) {
      inTransactionSection = true;
      continue;
    }
    
    // Stop at end of transaction section
    if (inTransactionSection && (line.includes('Total purchases') || line.includes('WAYS TO PAY') || 
        line.includes('Information about') || line.includes('Payment Information') || 
        line.includes('Statement date') || line.includes('Page 1 of') || 
        line.includes('Interest charges') || line.includes('Other details'))) {
      inTransactionSection = false;
      break;
    }
    
    // Parse transaction lines with multiple patterns
    if (inTransactionSection) {
      // Pattern 1: "Nov 09", "Nov 11", "RMI-SPORTSNET.CA/NOW 416-637-1499 ON", "20.99"
      let transactionMatch = line.match(/^(\w+\s+\d+)\s+(\w+\s+\d+)\s+(.+?)\s+([\d,]+\.?\d*)$/);
      
      // Pattern 2: "Nov 09", "RMI-SPORTSNET.CA/NOW 416-637-1499 ON", "20.99" (no posting date)
      if (!transactionMatch) {
        transactionMatch = line.match(/^(\w+\s+\d+)\s+(.+?)\s+([\d,]+\.?\d*)$/);
        if (transactionMatch) {
          // Add empty posting date
          transactionMatch = [transactionMatch[0], transactionMatch[1], transactionMatch[1], transactionMatch[2], transactionMatch[3]];
        }
      }
      
      // Pattern 3: Look for lines with amounts at the end (more flexible)
      if (!transactionMatch) {
        const amountMatch = line.match(/(.+?)\s+([\d,]+\.?\d*)$/);
        if (amountMatch && amountMatch[2] && parseFloat(amountMatch[2].replace(/,/g, '')) > 0) {
          const description = amountMatch[1].trim();
          const amount = parseFloat(amountMatch[2].replace(/,/g, ''));
          
          // Skip if it looks like a summary line or header
          if (!description.includes('Total') && !description.includes('Balance') && 
              !description.includes('Payment') && !description.includes('Credit') &&
              !description.includes('TRANSACTION') && !description.includes('POSTING') &&
              !description.includes('DATE') && !description.includes('AMOUNT') &&
              !description.includes('Purchases') && !description.includes('Card #') &&
              description.length > 3 && amount > 0) {
            
            // Extract merchant name (first part before location codes)
            let merchant = description;
            const merchantMatch = description.match(/^([^A-Z]{2,})\s+[A-Z]{2}/);
            if (merchantMatch) {
              merchant = merchantMatch[1].trim();
            } else {
              // Take first few words as merchant
              merchant = description.split(' ').slice(0, 3).join(' ');
            }
            
            individualTransactions.push({
              transactionDate: 'Unknown',
              postingDate: 'Unknown',
              description,
              amount,
              merchant});
            
            console.log('💳 Found transaction (pattern 3):', { description, amount, merchant});
          }
        }
      }
      
      // Pattern 4: Look for lines that start with dates and have amounts
      if (!transactionMatch) {
        const dateAmountMatch = line.match(/^(\w+\s+\d+)\s+(.+?)\s+([\d,]+\.?\d*)$/);
        if (dateAmountMatch) {
          const date = dateAmountMatch[1];
          const description = dateAmountMatch[2].trim();
          const amount = parseFloat(dateAmountMatch[3].replace(/,/g, ''));
          
          if (amount > 0 && !description.includes('Total') && !description.includes('Balance')) {
            let merchant = description;
            const merchantMatch = description.match(/^([^A-Z]{2,})\s+[A-Z]{2}/);
            if (merchantMatch) {
              merchant = merchantMatch[1].trim();
            }
            
            individualTransactions.push({
              transactionDate: date,
              postingDate: date,
              description,
              amount,
              merchant});
            
            console.log('💳 Found transaction (pattern 4):', { date, description, amount, merchant});
          }
        }
      }
      
      if (transactionMatch && transactionMatch.length >= 4) {
        const transactionDate = transactionMatch[1];
        const postingDate = transactionMatch[2] || transactionMatch[1];
        const description = transactionMatch[3].trim();
        const amount = parseFloat(transactionMatch[4].replace(/,/g, ''));
        
        // Extract merchant name (first part before location)
        let merchant = description;
        const merchantMatch = description.match(/^([^A-Z]{2,})\s+[A-Z]{2}/);
        if (merchantMatch) {
          merchant = merchantMatch[1].trim();
        }
        
        individualTransactions.push({
          transactionDate,
          postingDate,
          description,
          amount,
          merchant});
        
        console.log('💳 Found transaction:', { transactionDate, postingDate, merchant, amount});
      }
    }
  }

  console.log(`💳 Extracted ${individualTransactions.length} individual transactions`);
  console.log('💳 Account summary:', accountSummary);

  return {
    vendor: vendor || 'Credit Card Statement',
    date: statementPeriod.endDate || new Date().toISOString().split('T')[0],
    total,
    category,
    confidence: 0.9,
    isCreditCardStatement: true,
    individualTransactions,
    statementPeriod,
    accountSummary
  };
};

// Function to convert file to base64
export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Function to directly process an image file with OCR
export const processImageWithOCR = async (imageFile: File): Promise<OCRResult> => {
  throwIfDeprecated(); // 🚫 Hard deprecation - throws in DEV
  
  try {
    // Check if it's a PDF file
    if (imageFile.type === 'application/pdf') {
      console.log('Processing PDF file:', imageFile.name);
      
      // For PDF files, use the file upload endpoint
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("language", "eng");
      formData.append("isOverlayRequired", "false");
      formData.append("scale", "true");
      formData.append("OCREngine", "2");
      
      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: {
          "apikey": OCR_API_KEY,
        },
        body: formData});
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OCR API error response:', errorText);
        throw new Error(`OCR API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('OCR API response for PDF:', result);
      console.log('PDF OCR response structure:', {
        IsErroredOnProcessing: result.IsErroredOnProcessing,
        ErrorMessage: result.ErrorMessage,
        ParsedResults: result.ParsedResults?.length || 0,
        FirstResult: result.ParsedResults?.[0] ? {
          ParsedText: result.ParsedResults[0].ParsedText?.substring(0, 200) + '...',
          TextOverlay: result.ParsedResults[0].TextOverlay
        } : null});
      
      if (result.IsErroredOnProcessing) {
        console.error('PDF OCR processing error:', result.ErrorMessage);
        throw new Error(result.ErrorMessage || 'OCR processing failed');
      }

      // Combine text from all pages
      let extractedText = '';
      let confidence = 0.6;
      
      if (result.ParsedResults && result.ParsedResults.length > 0) {
        for (const page of result.ParsedResults) {
          if (page.ParsedText) {
            extractedText += page.ParsedText + '\n';
          }
          if (page.TextOverlay?.HasOverlay) {
            confidence = Math.max(confidence, 0.8);
          }
        }
      }
      
      console.log('PDF extracted text length:', extractedText.length);
      console.log('First 500 chars of PDF extracted text:', extractedText.substring(0, 500));

      return {
        text: extractedText,
        confidence
      };
    } else {
      // For image files, use base64
      const base64Image = await convertFileToBase64(imageFile);
      
      // Send to OCR.space API
      const formData = new FormData();
      formData.append("base64Image", base64Image.split(',')[1]);
      formData.append("language", "eng");
      formData.append("isOverlayRequired", "false");
      formData.append("scale", "true");
      formData.append("OCREngine", "2");
      
      console.log('Sending OCR request for image file:', imageFile.name);
      
      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: {
          "apikey": OCR_API_KEY,
        },
        body: formData});

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OCR API error response:', errorText);
        throw new Error(`OCR API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('OCR API response:', result);
      
      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage || 'OCR processing failed');
      }

      const extractedText = result?.ParsedResults?.[0]?.ParsedText || "";
      const confidence = result?.ParsedResults?.[0]?.TextOverlay?.HasOverlay ? 0.8 : 0.6;

      return {
        text: extractedText,
        confidence
      };
    }
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
};