# XspensesAI Worker Environment Setup Guide

## 🔧 **Environment Variables Required**

The worker service runs **independently from Netlify** - it's a separate Node.js service that processes documents in the background.

### **📋 Required Variables (Copy these to your `.env` file):**

```env
# Supabase Configuration (REQUIRED)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_PUBLIC_ANON_KEY=your_supabase_anon_key

# Storage Buckets (REQUIRED)
SUPABASE_BUCKET_ORIGINALS=original_docs
SUPABASE_BUCKET_REDACTED=redacted_docs

# Redis Configuration (REQUIRED for local development)
REDIS_URL=redis://localhost:6379

# OCR Configuration (REQUIRED)
OCR_ENGINE=ocrspace
OCRSPACE_API_KEY=your_ocr_space_api_key

# AI Configuration (OPTIONAL)
USE_LLM_FALLBACK=false
OPENAI_API_KEY=your_openai_api_key

# Worker Configuration
PORT=8080
WORKER_CONCURRENCY=5
LOG_LEVEL=info

# Security
DELETE_ORIGINAL_ON_SUCCESS=true
```

## 🚀 **Setup Steps:**

### **1. Get Your Supabase Credentials**
- Go to your Supabase project dashboard
- Navigate to Settings → API
- Copy:
  - `Project URL` → `SUPABASE_URL`
  - `anon public` key → `SUPABASE_PUBLIC_ANON_KEY`
  - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### **2. Get OCR.space API Key**
- Go to [OCR.space](https://ocr.space/ocrapi)
- Sign up for a free account
- Get your API key → `OCRSPACE_API_KEY`

### **3. Set Up Redis (Local Development)**
```bash
# Install Redis (Windows)
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

### **4. Create Supabase Storage Buckets**
Run this SQL in your Supabase SQL editor:
```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('original_docs', 'original_docs', false),
  ('redacted_docs', 'redacted_docs', true)
ON CONFLICT (id) DO NOTHING;
```

### **5. Set Up Database Schema**
Run the schema from `src/db/schema.sql` in your Supabase SQL editor.

## 🔄 **How It Works:**

1. **Frontend (Netlify)** → Uploads files to Supabase Storage
2. **Frontend** → Calls worker API: `POST /jobs`
3. **Worker** → Processes document (OCR, redaction, parsing, categorization)
4. **Worker** → Stores results in Supabase database
5. **Frontend** → Polls `GET /status/:jobId` for results

## 🐳 **Deployment Options:**

### **Option 1: Local Development**
```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Start worker
npm run dev
```

### **Option 2: Docker Compose**
```bash
# Start everything
docker-compose up -d
```

### **Option 3: VPS Deployment**
- Deploy to any VPS (DigitalOcean, Linode, etc.)
- Set up Redis server
- Run worker with PM2 or Docker

## 🔗 **Integration with Frontend:**

Your frontend can call the worker API:

```javascript
// Enqueue a job
const response = await fetch('http://localhost:8080/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    fileUrl: 'https://supabase-storage-url',
    docType: 'bank_statement',
    redact: true
  })
});

const { jobId } = await response.json();

// Poll for status
const status = await fetch(`http://localhost:8080/status/${jobId}`);
const result = await status.json();
```

## ⚠️ **Important Notes:**

- **Worker runs separately** from Netlify
- **Redis is required** for job queuing
- **Supabase Storage** is used for file storage
- **OCR.space** is the primary OCR engine
- **Environment variables** must be set in the worker's `.env` file

## 🧪 **Testing:**

```bash
# Check health
curl http://localhost:8080/healthz

# Test job
npm run dev
# Then run: node scripts/enqueue-example.ts
```


