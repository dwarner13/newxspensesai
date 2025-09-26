const OCR_API_KEY = "K82312040988957"; // Your new OCR.space API key

// OpenAI Vision API fallback (like ChatGPT uses)
export const extractTextWithOpenAIVision = async (imageFile: File): Promise<OCRResult> => {
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
      } : null
    });
    
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
}

export const parseReceiptText = (text: string): ParsedReceiptData => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  let vendor = '';
  let date = '';
  let total = 0;
  let category = 'Uncategorized';
  const items: Array<{ description: string; amount: number }> = [];

  console.log('🔍 Parsing OCR text:', text);

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
          amount
        });
      }
    }
  }

  // Enhanced category detection for financial documents
  const vendorLower = vendor.toLowerCase();
  const textLower = text.toLowerCase();
  
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
        body: formData
      });
      
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
        } : null
      });
      
      if (result.IsErroredOnProcessing) {
        console.error('PDF OCR processing error:', result.ErrorMessage);
        throw new Error(result.ErrorMessage || 'OCR processing failed');
      }

      const extractedText = result?.ParsedResults?.[0]?.ParsedText || "";
      const confidence = result?.ParsedResults?.[0]?.TextOverlay?.HasOverlay ? 0.8 : 0.6;
      
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
        body: formData
      });

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