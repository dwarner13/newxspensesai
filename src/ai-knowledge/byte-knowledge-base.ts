// Byte AI - Document Processing Specialist Knowledge Base

export const BYTE_KNOWLEDGE_BASE = {
  // Document Processing Expertise
  documentTypes: {
    creditCardStatements: {
      issuers: ['Visa', 'Mastercard', 'American Express', 'Discover', 'Capital One', 'Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Triangle', 'World Elite'],
      commonFields: ['transaction_date', 'posting_date', 'description', 'amount', 'merchant', 'category'],
      parsingPatterns: {
        transactionLine: /^(\w+\s+\d+)\s+(\w+\s+\d+)\s+(.+?)\s+([\d,]+\.?\d*)$/,
        amountPattern: /\$?([\d,]+\.?\d*)/,
        datePattern: /(\w+\s+\d+)/,
        merchantPattern: /^([^A-Z]{2,})\s+[A-Z]{2}/
      }
    },
    bankStatements: {
      commonFields: ['date', 'description', 'amount', 'balance', 'transaction_type'],
      accountTypes: ['checking', 'savings', 'business', 'joint']
    },
    receipts: {
      commonFields: ['merchant', 'date', 'items', 'subtotal', 'tax', 'total'],
      retailPatterns: ['store_name', 'itemized_list', 'pricing', 'discounts']
    }
  },

  // OCR Technology Knowledge
  ocrCapabilities: {
    supportedFormats: ['PDF', 'PNG', 'JPG', 'JPEG', 'TIFF', 'BMP', 'GIF'],
    accuracyLevels: {
      high: '95%+ for clear, well-formatted documents',
      medium: '85-95% for slightly blurry or complex layouts',
      low: '70-85% for poor quality scans or handwritten text'
    },
    processingLimits: {
      maxFileSize: '50MB',
      maxPages: '100 pages',
      timeout: '30 seconds per document'
    }
  },

  // Data Extraction Expertise
  extractionMethods: {
    textExtraction: 'Advanced OCR with multiple fallback engines',
    tableParsing: 'Intelligent table detection and cell extraction',
    fieldMapping: 'Context-aware field identification and mapping',
    validation: 'Cross-reference validation and confidence scoring'
  },

  // Quality Assurance
  qualityMetrics: {
    confidenceThresholds: {
      high: 0.9,
      medium: 0.7,
      low: 0.5
    },
    validationRules: {
      amountFormat: 'Must be numeric with proper decimal places',
      dateFormat: 'Must be valid date in recognized format',
      merchantName: 'Must be non-empty string with reasonable length'
    }
  },

  // Error Handling
  commonIssues: {
    blurryImages: 'Suggest better lighting or higher resolution',
    complexLayouts: 'Use advanced parsing algorithms',
    handwrittenText: 'Lower accuracy expected, manual review recommended',
    multipleLanguages: 'Language detection and appropriate OCR engine selection'
  }
};

// Byte's specialized responses based on document type
export const BYTE_RESPONSES = {
  processingStart: (filename: string, fileType: string) => 
    `🔍 **Processing ${filename}**\n\nDetected file type: ${fileType.toUpperCase()}\nInitializing specialized parsing engine...`,
  
  processingComplete: (confidence: number, transactionCount: number) => 
    `✅ **Processing Complete!**\n\nConfidence Score: ${(confidence * 100).toFixed(1)}%\nTransactions Extracted: ${transactionCount}\nData Quality: ${confidence > 0.9 ? 'Excellent' : confidence > 0.7 ? 'Good' : 'Fair'}`,
  
  errorHandling: (error: string) => 
    `⚠️ **Processing Issue Detected**\n\nError: ${error}\n\nAs your document processing specialist, I can help troubleshoot this. Common solutions:\n• Try a clearer image\n• Ensure file is under 50MB\n• Check document format compatibility`
};
