/**
 * OCR Processing API Routes
 * 
 * Handles file uploads, OCR processing, text cleaning, and AI parsing
 * 
 * cURL Example:
 * curl -X POST http://localhost:3001/api/ocr/ingest \
 *   -F "file=@statement.pdf" \
 *   -F "docType=statement" \
 *   -F "currency=CAD"
 */

const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { ocrFile } = require('../../src/lib/ocrSpace');
const { cleanOcrText } = require('../../src/lib/cleanText');
const { parseTransactions } = require('../../src/lib/openaiParse');
const { saveTransactions } = require('../../src/lib/supabase');

const router = express.Router();

// Initialize Supabase client (if configured)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDFs and images
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, PNG, and WebP files are allowed.'), false);
    }
  }
});

/**
 * POST /api/ocr/ingest
 * 
 * Processes uploaded files through OCR and AI parsing
 * 
 * Query Parameters:
 * - docType: "statement" | "receipt" (default: "statement")
 * - currency: string (default: "CAD")
 * 
 * Body:
 * - file: multipart file upload
 */
router.post('/ingest', upload.single('file'), async (req, res) => {
  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a PDF or image file'
      });
    }

    // Get query parameters
    const docType = req.query.docType || 'statement';
    const currency = req.query.currency || 'CAD';

    // Validate docType
    if (!['statement', 'receipt'].includes(docType)) {
      return res.status(400).json({
        error: 'Invalid docType',
        message: 'docType must be either "statement" or "receipt"'
      });
    }

    console.log(`🔍 Processing ${docType} file: ${req.file.originalname}`);

    // Step 1: OCR Processing
    console.log('📄 Running OCR...');
    const ocrResult = await ocrFile(req.file.buffer, req.file.originalname);
    
    if (!ocrResult || !ocrResult.text) {
      return res.status(500).json({
        error: 'OCR failed',
        message: 'Could not extract text from the uploaded file'
      });
    }

    console.log(`✅ OCR completed. Extracted ${ocrResult.text.length} characters`);

    // Step 2: Text Cleaning
    console.log('🧹 Cleaning OCR text...');
    const cleanedText = cleanOcrText(ocrResult.text);
    
    if (!cleanedText || cleanedText.trim().length === 0) {
      return res.status(500).json({
        error: 'Text cleaning failed',
        message: 'No usable text found after cleaning'
      });
    }

    console.log(`✅ Text cleaned. ${cleanedText.length} characters remaining`);

    // Step 3: AI Parsing
    console.log('🤖 Parsing with OpenAI...');
    const parseResult = await parseTransactions(cleanedText, {
      docType,
      currency
    });

    if (!parseResult || !parseResult.transactions) {
      return res.status(500).json({
        error: 'AI parsing failed',
        message: 'Could not parse transactions from the text'
      });
    }

    console.log(`✅ AI parsing completed. Found ${parseResult.transactions.length} transactions`);

    // Step 4: Save to Supabase (if configured)
    let savedTransactions = [];
    if (supabase && parseResult.transactions.length > 0) {
      try {
        console.log('💾 Saving transactions to Supabase...');
        savedTransactions = await saveTransactions(parseResult.transactions);
        console.log(`✅ Saved ${savedTransactions.length} transactions to database`);
      } catch (dbError) {
        console.warn('⚠️ Database save failed:', dbError.message);
        // Continue without failing the request
      }
    }

    // Prepare response
    const response = {
      success: true,
      transactions: parseResult.transactions,
      meta: {
        docType,
        currency,
        fileSize: req.file.size,
        fileName: req.file.originalname,
        ocrPages: ocrResult.pages?.length || 1,
        textLength: cleanedText.length,
        parsedCount: parseResult.transactions.length,
        savedCount: savedTransactions.length,
        processingTime: Date.now() - req.startTime
      },
      stats: parseResult.stats || {},
      errors: parseResult.errors || [],
      ocrTextSample: cleanedText.substring(0, 500) + (cleanedText.length > 500 ? '...' : '')
    };

    console.log('🎉 OCR processing completed successfully');
    res.json(response);

  } catch (error) {
    console.error('❌ OCR processing failed:', error);
    
    res.status(500).json({
      error: 'Processing failed',
      message: error.message || 'An unexpected error occurred during processing',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/ocr/health
 * 
 * Health check endpoint for OCR service
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      ocrSpace: process.env.OCR_SPACE_API_KEY ? 'configured' : 'not configured',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
      supabase: supabase ? 'configured' : 'not configured'
    }
  });
});

module.exports = router;
