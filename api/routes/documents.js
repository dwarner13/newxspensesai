/**
 * Document Upload and Processing API Routes
 * 
 * Handles file uploads, document processing, and AI analysis
 */

const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { DocumentHandler } = require('../../src/lib/documentHandler');
const { MultiLayerCategorizationEngine } = require('../../src/lib/multiLayerCategorizationEngine');
const { CategoryLearningSystem } = require('../../src/lib/categoryLearningSystem');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize document processing components
const documentHandler = new DocumentHandler();
const categorizationEngine = new MultiLayerCategorizationEngine();
const learningSystem = new CategoryLearningSystem();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'image/jpeg',
      'image/png',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, CSV, JPG, PNG, XLS, XLSX, and TXT files are allowed.'), false);
    }
  }
});

/**
 * POST /api/documents/upload
 * Upload and process a document
 */
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    const { user_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop();
    const filename = `${user_id}/${timestamp}_${file.originalname}`;

    // Upload to cloud storage (will be implemented in cloud storage integration)
    const storageUrl = `https://storage.example.com/${filename}`;
    const storageKey = filename;

    // Create document record in database
    const { data: document, error: docError } = await supabase
      .from('uploaded_documents')
      .insert({
        user_id,
        filename: file.originalname,
        original_filename: file.originalname,
        file_type: fileExtension,
        file_size: file.size,
        storage_url: storageUrl,
        storage_key: storageKey,
        mime_type: file.mimetype,
        processing_status: 'processing'
      })
      .select()
      .single();

    if (docError) {
      console.error('Database error:', docError);
      return res.status(500).json({ error: 'Failed to save document record' });
    }

    // Process document asynchronously
    processDocumentAsync(document.id, file.buffer, file.mimetype, user_id);

    res.json({
      success: true,
      document_id: document.id,
      message: 'Document uploaded successfully and processing started'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

/**
 * GET /api/documents/:id/status
 * Get document processing status
 */
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    const { data: document, error } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      id: document.id,
      status: document.processing_status,
      extracted_data: document.extracted_data,
      ai_analysis: document.ai_analysis,
      created_at: document.created_at,
      updated_at: document.updated_at
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

/**
 * GET /api/documents
 * Get user's uploaded documents
 */
router.get('/', async (req, res) => {
  try {
    const { user_id, status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('uploaded_documents')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('processing_status', status);
    }

    const { data: documents, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }

    res.json({
      documents,
      count: documents.length,
      has_more: documents.length === limit
    });

  } catch (error) {
    console.error('Fetch documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // Get document info for cloud storage cleanup
    const { data: document, error: fetchError } = await supabase
      .from('uploaded_documents')
      .select('storage_key')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('uploaded_documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete document' });
    }

    // TODO: Delete from cloud storage
    // await deleteFromCloudStorage(document.storage_key);

    res.json({ success: true, message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * POST /api/documents/:id/reprocess
 * Reprocess a document
 */
router.post('/:id/reprocess', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    // Get document
    const { data: document, error: fetchError } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update status to processing
    const { error: updateError } = await supabase
      .from('uploaded_documents')
      .update({ 
        processing_status: 'processing',
        extracted_data: {},
        ai_analysis: {}
      })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update document status' });
    }

    // TODO: Get file from cloud storage and reprocess
    // const fileBuffer = await getFromCloudStorage(document.storage_key);
    // processDocumentAsync(id, fileBuffer, document.mime_type, user_id);

    res.json({ success: true, message: 'Document reprocessing started' });

  } catch (error) {
    console.error('Reprocess error:', error);
    res.status(500).json({ error: 'Failed to reprocess document' });
  }
});

/**
 * Asynchronous document processing function
 */
async function processDocumentAsync(documentId, fileBuffer, mimeType, userId) {
  try {
    console.log(`Processing document ${documentId} for user ${userId}`);

    // Process document using DocumentHandler
    const processingResult = await documentHandler.processDocument(fileBuffer, mimeType);
    
    // Categorize extracted transactions
    let categorizedTransactions = [];
    if (processingResult.transactions && processingResult.transactions.length > 0) {
      categorizedTransactions = await categorizationEngine.categorizeTransactions(
        processingResult.transactions,
        userId
      );
    }

    // Update document with extracted data
    const { error: updateError } = await supabase
      .from('uploaded_documents')
      .update({
        processing_status: 'completed',
        extracted_data: {
          transactions: categorizedTransactions,
          raw_data: processingResult.rawData,
          metadata: processingResult.metadata
        },
        ai_analysis: {
          summary: processingResult.summary,
          insights: processingResult.insights,
          confidence_score: processingResult.confidenceScore
        }
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document:', updateError);
      // Update status to failed
      await supabase
        .from('uploaded_documents')
        .update({ processing_status: 'failed' })
        .eq('id', documentId);
    } else {
      console.log(`Document ${documentId} processed successfully`);
    }

  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);
    
    // Update status to failed
    await supabase
      .from('uploaded_documents')
      .update({ 
        processing_status: 'failed',
        ai_analysis: { error: error.message }
      })
      .eq('id', documentId);
  }
}

module.exports = router;
