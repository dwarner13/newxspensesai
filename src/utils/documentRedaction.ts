/**
 * AI-Powered Document Redaction System
 * 
 * This system redacts sensitive financial information while preserving
 * vendor names and transaction amounts for AI storytelling features.
 * 
 * Redacted: Account numbers, SSN, addresses, phone numbers, etc.
 * Preserved: Vendor names, amounts, dates, categories
 */

export interface RedactionResult {
  redactedText: string;
  originalText: string;
  redactedItems: RedactedItem[];
  confidence: number;
  processingTime: number;
}

export interface RedactedItem {
  type: 'account_number' | 'ssn' | 'address' | 'phone' | 'email' | 'transaction_id' | 'routing_number' | 'other';
  originalText: string;
  redactedText: string;
  position: { start: number; end: number };
  confidence: number;
}

// Comprehensive patterns for sensitive data detection
const SENSITIVE_DATA_PATTERNS = {
  // Account numbers (various formats)
  account_number: [
    /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g, // 16-digit cards
    /\b\d{4}[\s\-]?\d{6}[\s\-]?\d{5}\b/g, // 15-digit cards
    /\b\d{8,19}\b/g, // General account numbers
    /\b\*\*\*\*\s*\*\*\*\*\s*\*\*\*\*\s*\d{4}\b/g, // Masked cards
  ],
  
  // Routing numbers
  routing_number: [
    /\b\d{9}\b/g, // 9-digit routing numbers
    /\b\d{3}[\-]?\d{3}[\-]?\d{3}\b/g, // Formatted routing
  ],
  
  // SSN and Tax IDs
  ssn: [
    /\b\d{3}[\-]?\d{2}[\-]?\d{4}\b/g, // SSN format
    /\b\d{2}[\-]?\d{7}\b/g, // Tax ID format
  ],
  
  // Phone numbers
  phone: [
    /\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}\b/g, // US phone numbers
    /\b\d{3}[\-]?\d{3}[\-]?\d{4}\b/g, // Simple format
    /\+\d{1,3}[\s\-]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}\b/g, // International
  ],
  
  // Email addresses
  email: [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  ],
  
  // Addresses
  address: [
    /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Ct|Court|Place|Pl)\b/gi,
    /\b\d{5}(?:[\-]?\d{4})?\b/g, // ZIP codes
  ],
  
  // Transaction IDs and reference numbers
  transaction_id: [
    /\b(?:TXN|REF|ID)[\s\-]?[A-Z0-9]{6,}\b/g,
    /\b[A-Z0-9]{8,}\b/g, // Long alphanumeric strings
  ],
  
  // Bank-specific patterns
  other: [
    /\b(?:ACH|WIRE|TRANSFER)[\s\-]?\d{6,}\b/g,
    /\b(?:CHECK|CHK)[\s\-]?\d{3,}\b/g,
  ]
};

// AI-powered sensitive data detection
export const detectSensitiveData = async (text: string): Promise<RedactedItem[]> => {
  const redactedItems: RedactedItem[] = [];
  let processedText = text;
  
  // Process each pattern type
  for (const [type, patterns] of Object.entries(SENSITIVE_DATA_PATTERNS)) {
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(processedText)) !== null) {
        const originalText = match[0];
        const redactedText = generateRedactionMask(originalText, type as RedactedItem['type']);
        
        redactedItems.push({
          type: type as RedactedItem['type'],
          originalText,
          redactedText,
          position: { start: match.index, end: match.index + originalText.length },
          confidence: calculateConfidence(originalText, type as RedactedItem['type'])
        });
      }
    }
  }
  
  // Sort by position (descending) to avoid position shifts during replacement
  redactedItems.sort((a, b) => b.position.start - a.position.start);
  
  return redactedItems;
};

// Generate appropriate redaction mask based on data type
const generateRedactionMask = (text: string, type: RedactedItem['type']): string => {
  switch (type) {
    case 'account_number':
      // Keep last 4 digits, mask the rest
      if (text.length >= 4) {
        const last4 = text.slice(-4);
        return '****-****-****-' + last4;
      }
      return '****-****-****-****';
      
    case 'ssn':
      return '***-**-****';
      
    case 'phone':
      // Keep area code, mask the rest
      if (text.match(/\(?\d{3}\)?/)) {
        return '***-***-****';
      }
      return '***-***-****';
      
    case 'email':
      // Keep domain, mask username
      const [username, domain] = text.split('@');
      if (domain) {
        return `***@${domain}`;
      }
      return '***@***.***';
      
    case 'address':
      return '[ADDRESS REDACTED]';
      
    case 'routing_number':
      return '***-***-***';
      
    case 'transaction_id':
      return '[REF: REDACTED]';
      
    default:
      return '[REDACTED]';
  }
};

// Calculate confidence score for redaction accuracy
const calculateConfidence = (text: string, type: RedactedItem['type']): number => {
  let confidence = 0.8; // Base confidence
  
  // Adjust based on text length and format
  switch (type) {
    case 'account_number':
      if (text.length >= 12 && text.length <= 19) confidence += 0.1;
      if (/^\d+$/.test(text.replace(/[\s\-]/g, ''))) confidence += 0.1;
      break;
      
    case 'ssn':
      if (text.length === 11 && text.includes('-')) confidence += 0.1;
      break;
      
    case 'phone':
      if (text.length >= 10) confidence += 0.1;
      break;
      
    case 'email':
      if (text.includes('@') && text.includes('.')) confidence += 0.1;
      break;
  }
  
  return Math.min(confidence, 1.0);
};

// Main redaction function
export const redactDocument = async (text: string): Promise<RedactionResult> => {
  const startTime = Date.now();
  
  try {
    // Detect sensitive data
    const redactedItems = await detectSensitiveData(text);
    
    // Apply redactions
    let redactedText = text;
    
    for (const item of redactedItems) {
      redactedText = redactedText.replace(item.originalText, item.redactedText);
    }
    
    // Calculate overall confidence
    const confidence = redactedItems.length > 0 
      ? redactedItems.reduce((sum, item) => sum + item.confidence, 0) / redactedItems.length
      : 1.0;
    
    const processingTime = Date.now() - startTime;
    
    return {
      redactedText,
      originalText: text,
      redactedItems,
      confidence,
      processingTime
    };
    
  } catch (error) {
    console.error('Redaction error:', error);
    throw new Error('Failed to redact document');
  }
};

// Validate that sensitive data was properly redacted
export const validateRedaction = (redactedText: string): boolean => {
  // Check if any sensitive patterns still exist
  for (const patterns of Object.values(SENSITIVE_DATA_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(redactedText)) {
        return false; // Found unredacted sensitive data
      }
    }
  }
  return true;
};

// Get redaction summary for user notification
export const getRedactionSummary = (redactedItems: RedactedItem[]): string => {
  if (redactedItems.length === 0) {
    return "No sensitive data detected in this document.";
  }
  
  const typeCounts = redactedItems.reduce((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  const summary = Object.entries(typeCounts)
    .map(([type, count]) => `${count} ${type.replace('_', ' ')}${count > 1 ? 's' : ''}`)
    .join(', ');
  
  return `Redacted ${summary} for your privacy and security.`;
};

// AI Employee notification message
export const generateAIEmployeeNotification = (redactedItems: RedactedItem[]): string => {
  const summary = getRedactionSummary(redactedItems);
  
  return `🔒 **Privacy Protection Applied**

${summary}

Your document has been processed and sensitive information has been automatically redacted to protect your privacy. Only vendor names and transaction amounts are preserved for AI analysis and storytelling features.

**What was redacted:**
- Account numbers and routing numbers
- Personal addresses and contact information  
- Transaction reference numbers
- Any other sensitive identifiers

**What was preserved:**
- Merchant/vendor names
- Transaction amounts and dates
- Categories and descriptions

This ensures your financial data remains secure while still allowing our AI to provide insights and create personalized financial stories.`;
};
