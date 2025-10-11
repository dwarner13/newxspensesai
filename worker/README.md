# XspensesAI Worker Service

A production-ready Node.js/TypeScript worker service for XspensesAI that processes uploaded documents through OCR, redaction, parsing, and categorization.

## Features

- **Document Processing**: OCR, PDF redaction, transaction parsing
- **Queue System**: BullMQ with Redis for reliable job processing
- **OCR Engines**: OCR.space (primary) + Tesseract.js (fallback)
- **PDF Redaction**: Sensitive data redaction using pdf-lib
- **AI Categorization**: Rules-first with optional LLM fallback
- **Supabase Integration**: Storage and database operations
- **Health Monitoring**: Prometheus metrics and health checks
- **Docker Ready**: Containerized deployment

## Quick Start

### Prerequisites

- Node.js 20+
- Redis server
- Supabase project
- OCR.space API key

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Start the worker:**
   ```bash
   npm start
   ```

### Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## API Endpoints

### Health Check
- `GET /healthz` - Worker health status

### Job Management
- `POST /jobs` - Enqueue document processing job
- `GET /status/:jobId` - Get job status and progress

### Job Request Schema

```json
{
  "userId": "uuid",
  "documentId": "uuid",
  "fileUrl": "string",
  "docType": "receipt|bank_statement",
  "redact": true
}
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Supabase project URL | ✅ | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ | - |
| `SUPABASE_BUCKET_ORIGINALS` | Original documents bucket | ✅ | `original_docs` |
| `SUPABASE_BUCKET_REDACTED` | Redacted documents bucket | ✅ | `redacted_docs` |
| `REDIS_URL` | Redis connection URL | ✅ | `redis://localhost:6379` |
| `OCR_ENGINE` | OCR engine to use | ✅ | `ocrspace` |
| `OCRSPACE_API_KEY` | OCR.space API key | ✅ | - |
| `USE_LLM_FALLBACK` | Enable LLM categorization fallback | ❌ | `false` |
| `OPENAI_API_KEY` | OpenAI API key (if LLM enabled) | ❌ | - |
| `PORT` | Server port | ❌ | `8080` |
| `WORKER_CONCURRENCY` | Number of concurrent workers | ❌ | `5` |
| `LOG_LEVEL` | Logging level | ❌ | `info` |
| `DELETE_ORIGINAL_ON_SUCCESS` | Delete original files after processing | ❌ | `true` |

## Processing Workflow

1. **Download**: Fetch document from Supabase Storage
2. **OCR**: Extract text using OCR.space or Tesseract.js
3. **Redact**: Remove sensitive information (PII, account numbers)
4. **Parse**: Extract transactions and financial data
5. **Categorize**: Apply rules-based categorization with optional LLM fallback
6. **Store**: Save results to Supabase database and upload redacted PDF

## Database Schema

### Documents Table
```sql
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  original_url text,
  redacted_url text,
  type text CHECK (type IN ('receipt','bank_statement')),
  status text DEFAULT 'processing',
  error text,
  created_at timestamptz DEFAULT now()
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  txn_date date,
  merchant text,
  description text,
  amount numeric(12,2),
  direction text CHECK (direction IN ('debit','credit')),
  category text,
  subcategory text,
  created_at timestamptz DEFAULT now()
);
```

## Docker Deployment

### Docker Compose
```yaml
version: '3.8'
services:
  worker:
    build: .
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://redis:6379
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Build and Run
```bash
# Build Docker image
docker build -t xspensesai-worker .

# Run with Docker Compose
docker-compose up -d
```

## Monitoring

### Health Checks
- `GET /healthz` - Basic health check
- `GET /metrics` - Prometheus metrics

### Metrics
- `jobs_processed_total` - Total jobs processed
- `jobs_failed_total` - Total failed jobs
- `job_duration_seconds` - Job processing duration
- `ocr_requests_total` - OCR API requests
- `redaction_matches_total` - PII redaction matches

## Error Handling

- **Retry Logic**: Exponential backoff with max 5 retries
- **Dead Letter Queue**: Failed jobs moved to DLQ after retries
- **Graceful Shutdown**: SIGTERM handling for clean shutdown
- **Logging**: Structured logging with PII redaction

## Security

- **PII Redaction**: Automatic redaction of sensitive data
- **RLS Policies**: Row-level security on Supabase tables
- **File Cleanup**: Optional deletion of original files
- **Input Validation**: Zod schema validation for all inputs

## Performance

- **Concurrent Processing**: Configurable worker concurrency
- **Memory Management**: Efficient buffer handling
- **Caching**: Redis-based job status caching
- **Optimization**: Sharp for image preprocessing

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis server is running
   - Verify REDIS_URL configuration

2. **Supabase Authentication Error**
   - Verify SUPABASE_SERVICE_ROLE_KEY
   - Check bucket permissions

3. **OCR API Rate Limits**
   - Monitor OCR.space usage
   - Implement request throttling

4. **Memory Issues**
   - Reduce WORKER_CONCURRENCY
   - Monitor large file processing

### Logs
```bash
# View worker logs
docker logs xspensesai-worker

# Follow logs in real-time
docker logs -f xspensesai-worker
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details






