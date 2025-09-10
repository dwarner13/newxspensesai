# OCR Processing API

Complete OCR processing system for financial documents using OCR.space and OpenAI.

## 🚀 Features

- **Multi-format Support**: PDFs, JPG, PNG, WebP
- **Smart OCR**: OCR.space API with table detection
- **Text Cleaning**: Removes headers, footers, page numbers
- **AI Parsing**: OpenAI GPT-4o-mini for transaction extraction
- **Database Storage**: Automatic Supabase integration
- **Flexible Document Types**: Bank statements and receipts

## 📋 API Endpoints

### POST /api/ocr/ingest

Process uploaded documents through OCR and AI parsing.

**Query Parameters:**
- `docType`: "statement" | "receipt" (default: "statement")
- `currency`: Currency code (default: "CAD")

**Request:**
```bash
curl -X POST http://localhost:3001/api/ocr/ingest \
  -F "file=@statement.pdf" \
  -F "docType=statement" \
  -F "currency=CAD"
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "date": "2024-01-10",
      "description": "GROCERY STORE #1234",
      "amount": -45.67,
      "type": "debit",
      "category": "Groceries",
      "source_confidence": 0.95
    }
  ],
  "meta": {
    "docType": "statement",
    "currency": "CAD",
    "fileSize": 1024000,
    "fileName": "statement.pdf",
    "ocrPages": 1,
    "textLength": 2500,
    "parsedCount": 5,
    "savedCount": 5,
    "processingTime": 3500
  },
  "stats": {
    "lines": 25,
    "parsed": 5,
    "skipped": 3
  },
  "errors": [],
  "ocrTextSample": "Bank Statement\nAccount: 1234567890..."
}
```

### GET /api/ocr/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "ocrSpace": "configured",
    "openai": "configured",
    "supabase": "configured"
  }
}
```

## 🛠️ Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key
OCR_SPACE_API_KEY=your_ocr_space_api_key

# Optional (for database storage)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Schema

Run the SQL in `schema.sql` in your Supabase SQL editor:

```sql
-- Creates user_documents and transactions tables
-- See api/schema.sql for full schema
```

### 3. Install Dependencies

```bash
cd api
npm install
```

### 4. Start Server

```bash
npm start
# or for development
npm run dev
```

## 📁 File Structure

```
api/
├── routes/
│   └── ocr.js              # OCR API routes
├── src/lib/
│   ├── ocrSpace.js         # OCR.space integration
│   ├── cleanText.js        # Text cleaning utilities
│   └── openaiParse.js      # OpenAI parsing functions
├── schema.sql              # Database schema
├── test-ocr.js             # Test script
└── README-OCR.md           # This file
```

## 🔧 Configuration

### OCR.space Settings

- **Engine**: OCR Engine 2 (best accuracy)
- **Language**: Auto-detect
- **Table Detection**: Enabled
- **Scale**: Enabled
- **Orientation Detection**: Enabled

### OpenAI Settings

- **Model**: gpt-4o-mini
- **Temperature**: 0.1 (low for consistency)
- **Max Tokens**: 4000
- **Retry Logic**: Automatic JSON validation retry

## 📊 Document Types

### Bank/Card Statements

**Prompt Features:**
- Identifies transaction rows with date + description + amount
- Handles negative amounts (debits)
- Rejoins broken table lines
- Excludes running balances
- Categorizes transactions

**Categories:**
- Meals, Groceries, Fuel, Travel
- Utilities, Fees, Income, Transfer
- null for unknown

### Receipts

**Prompt Features:**
- Extracts merchant name, date, total
- Ignores line items (single transaction per receipt)
- Includes tips/gratuity in amount
- Always debit type

## 🧪 Testing

### Run Test Script

```bash
cd api
node test-ocr.js
```

### Manual Testing

```bash
# Health check
curl http://localhost:3001/api/ocr/health

# Process statement
curl -X POST http://localhost:3001/api/ocr/ingest \
  -F "file=@statement.pdf" \
  -F "docType=statement"

# Process receipt
curl -X POST http://localhost:3001/api/ocr/ingest \
  -F "file=@receipt.jpg" \
  -F "docType=receipt" \
  -F "currency=USD"
```

## 🔍 Error Handling

**Common Errors:**
- `400`: Invalid file type or missing file
- `500`: OCR processing failed
- `500`: AI parsing failed
- `500`: Database save failed (non-blocking)

**Error Response:**
```json
{
  "error": "Processing failed",
  "message": "Specific error message",
  "details": "Stack trace (development only)"
}
```

## 📈 Performance

**Typical Processing Times:**
- 1-page PDF: 2-4 seconds
- Multi-page PDF: 3-6 seconds
- Image files: 1-3 seconds

**File Limits:**
- Max file size: 20MB
- Supported formats: PDF, JPG, PNG, WebP

## 🔒 Security

- File type validation
- File size limits
- API key validation
- Error message sanitization
- CORS protection

## 🚀 Production Deployment

1. Set all environment variables
2. Run database migrations
3. Configure reverse proxy (nginx)
4. Set up monitoring
5. Configure rate limiting
6. Enable HTTPS

## 📝 Notes

- OCR.space has rate limits (free tier: 25,000 requests/month)
- OpenAI has usage costs per token
- Supabase storage is optional but recommended
- All timestamps are in UTC
- Amounts are stored as numeric values
