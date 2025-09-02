/**
 * Cloud Storage API Routes
 * 
 * Handles cloud storage operations and file management
 */

const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { cloudStorageService } = require('../../src/lib/cloudStorageService');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
 * POST /api/cloud-storage/upload
 * Upload file directly to cloud storage
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { user_id } = req.headers;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!user_id) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${user_id}/${timestamp}_${sanitizedFilename}`;

    // Upload to cloud storage
    const result = await cloudStorageService.uploadFile(
      file.buffer,
      key,
      file.mimetype
    );

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Upload failed', 
        details: result.error 
      });
    }

    // Store file metadata in database
    const { data: fileRecord, error: dbError } = await supabase
      .from('uploaded_documents')
      .insert({
        user_id,
        filename: file.originalname,
        original_filename: file.originalname,
        file_type: file.originalname.split('.').pop(),
        file_size: file.size,
        storage_url: result.url,
        storage_key: result.key,
        mime_type: file.mimetype,
        processing_status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file
      await cloudStorageService.deleteFile(result.key);
      return res.status(500).json({ error: 'Failed to save file record' });
    }

    res.json({
      success: true,
      file_id: fileRecord.id,
      url: result.url,
      key: result.key,
      filename: file.originalname,
      size: file.size,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Cloud storage upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
});

/**
 * GET /api/cloud-storage/presigned-upload-url
 * Generate presigned URL for direct client uploads
 */
router.get('/presigned-upload-url', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { filename, content_type } = req.query;

    if (!user_id) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    if (!filename || !content_type) {
      return res.status(400).json({ 
        error: 'Filename and content_type are required' 
      });
    }

    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${user_id}/${timestamp}_${sanitizedFilename}`;

    // Generate presigned URL
    const presignedUrl = await cloudStorageService.generatePresignedUploadUrl(
      key,
      content_type,
      3600 // 1 hour expiry
    );

    res.json({
      presigned_url: presignedUrl,
      key,
      expires_in: 3600
    });

  } catch (error) {
    console.error('Generate presigned URL error:', error);
    res.status(500).json({ 
      error: 'Failed to generate presigned URL', 
      details: error.message 
    });
  }
});

/**
 * POST /api/cloud-storage/confirm-upload
 * Confirm file upload and create database record
 */
router.post('/confirm-upload', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { key, filename, content_type, size } = req.body;

    if (!user_id || !key || !filename || !content_type || !size) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, key, filename, content_type, size' 
      });
    }

    // Verify file exists in cloud storage
    const exists = await cloudStorageService.fileExists(key);
    if (!exists) {
      return res.status(404).json({ error: 'File not found in cloud storage' });
    }

    // Get file metadata
    const metadata = await cloudStorageService.getFileMetadata(key);
    const publicUrl = cloudStorageService.getPublicUrl(key);

    // Create database record
    const { data: fileRecord, error: dbError } = await supabase
      .from('uploaded_documents')
      .insert({
        user_id,
        filename,
        original_filename: filename,
        file_type: filename.split('.').pop(),
        file_size: parseInt(size),
        storage_url: publicUrl,
        storage_key: key,
        mime_type: content_type,
        processing_status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to save file record' });
    }

    res.json({
      success: true,
      file_id: fileRecord.id,
      url: publicUrl,
      key,
      filename,
      size: parseInt(size),
      message: 'File upload confirmed'
    });

  } catch (error) {
    console.error('Confirm upload error:', error);
    res.status(500).json({ 
      error: 'Failed to confirm upload', 
      details: error.message 
    });
  }
});

/**
 * GET /api/cloud-storage/file/:key
 * Get file from cloud storage
 */
router.get('/file/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { user_id } = req.headers;

    if (!user_id) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Verify user has access to this file
    const { data: fileRecord, error: fetchError } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('storage_key', key)
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    // Get file from cloud storage
    const fileBuffer = await cloudStorageService.getFile(key);
    if (!fileBuffer) {
      return res.status(404).json({ error: 'File not found in cloud storage' });
    }

    // Set appropriate headers
    res.set({
      'Content-Type': fileRecord.mime_type,
      'Content-Length': fileBuffer.length,
      'Content-Disposition': `inline; filename="${fileRecord.original_filename}"`
    });

    res.send(fileBuffer);

  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve file', 
      details: error.message 
    });
  }
});

/**
 * GET /api/cloud-storage/presigned-access-url/:key
 * Generate presigned URL for file access
 */
router.get('/presigned-access-url/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { user_id } = req.headers;
    const { expires_in = 3600 } = req.query;

    if (!user_id) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Verify user has access to this file
    const { data: fileRecord, error: fetchError } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('storage_key', key)
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    // Generate presigned URL
    const presignedUrl = await cloudStorageService.generatePresignedAccessUrl(
      key,
      parseInt(expires_in)
    );

    res.json({
      presigned_url: presignedUrl,
      expires_in: parseInt(expires_in),
      filename: fileRecord.original_filename
    });

  } catch (error) {
    console.error('Generate presigned access URL error:', error);
    res.status(500).json({ 
      error: 'Failed to generate presigned URL', 
      details: error.message 
    });
  }
});

/**
 * DELETE /api/cloud-storage/file/:key
 * Delete file from cloud storage and database
 */
router.delete('/file/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { user_id } = req.headers;

    if (!user_id) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Verify user has access to this file
    const { data: fileRecord, error: fetchError } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('storage_key', key)
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    // Delete from cloud storage
    const deleted = await cloudStorageService.deleteFile(key);
    if (!deleted) {
      console.warn(`Failed to delete file from cloud storage: ${key}`);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('uploaded_documents')
      .delete()
      .eq('storage_key', key)
      .eq('user_id', user_id);

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to delete file record' });
    }

    res.json({ 
      success: true, 
      message: 'File deleted successfully' 
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ 
      error: 'Failed to delete file', 
      details: error.message 
    });
  }
});

/**
 * GET /api/cloud-storage/files
 * List user's files
 */
router.get('/files', async (req, res) => {
  try {
    const { user_id } = req.headers;
    const { limit = 50, offset = 0, status } = req.query;

    if (!user_id) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    let query = supabase
      .from('uploaded_documents')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('processing_status', status);
    }

    const { data: files, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch files' });
    }

    res.json({
      files,
      count: files.length,
      has_more: files.length === limit
    });

  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

/**
 * GET /api/cloud-storage/stats
 * Get cloud storage usage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { user_id } = req.headers;

    if (!user_id) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Get file statistics
    const { data: files, error } = await supabase
      .from('uploaded_documents')
      .select('file_size, processing_status, created_at')
      .eq('user_id', user_id);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }

    const stats = {
      total_files: files.length,
      total_size: files.reduce((sum, file) => sum + file.file_size, 0),
      status_breakdown: {},
      monthly_usage: {}
    };

    // Calculate status breakdown
    files.forEach(file => {
      stats.status_breakdown[file.processing_status] = 
        (stats.status_breakdown[file.processing_status] || 0) + 1;
    });

    // Calculate monthly usage
    files.forEach(file => {
      const month = file.created_at.substring(0, 7); // YYYY-MM
      if (!stats.monthly_usage[month]) {
        stats.monthly_usage[month] = { files: 0, size: 0 };
      }
      stats.monthly_usage[month].files += 1;
      stats.monthly_usage[month].size += file.file_size;
    });

    res.json(stats);

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;
