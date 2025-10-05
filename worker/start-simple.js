// Simple worker that works without Redis for testing
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Simple in-memory job storage (for testing only)
const jobs = new Map();
let jobCounter = 1;

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create job endpoint
app.post('/jobs', (req, res) => {
  try {
    const jobId = `job-${jobCounter++}`;
    const jobData = {
      id: jobId,
      state: 'waiting',
      progress: 0,
      data: req.body,
      createdAt: new Date().toISOString()
    };
    
    jobs.set(jobId, jobData);
    
    // Simulate processing
    setTimeout(() => {
      const job = jobs.get(jobId);
      if (job) {
        job.state = 'active';
        job.progress = 20;
        jobs.set(jobId, job);
        
        setTimeout(() => {
          const job = jobs.get(jobId);
          if (job) {
            job.state = 'completed';
            job.progress = 100;
            job.result = {
              documentId: jobData.data.documentId || 'doc-123',
              transactionCount: 5,
              processingTime: 3000,
              redactedUrl: 'https://example.com/redacted.pdf'
            };
            jobs.set(jobId, job);
          }
        }, 3000);
      }
    }, 1000);
    
    res.json({
      jobId,
      status: 'created',
      message: 'Job created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get job status endpoint
app.get('/status/:jobId', (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = jobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Queue stats endpoint
app.get('/queue/stats', (req, res) => {
  res.json({
    waiting: Array.from(jobs.values()).filter(j => j.state === 'waiting').length,
    active: Array.from(jobs.values()).filter(j => j.state === 'active').length,
    completed: Array.from(jobs.values()).filter(j => j.state === 'completed').length,
    failed: Array.from(jobs.values()).filter(j => j.state === 'failed').length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple Worker Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/healthz`);
  console.log(`📝 Jobs endpoint: http://localhost:${PORT}/jobs`);
  console.log(`📈 Status endpoint: http://localhost:${PORT}/status/:jobId`);
});
