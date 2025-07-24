# XspensesAI Backend

A comprehensive AI-powered backend for XspensesAI that provides intelligent document processing, expense categorization, and learning capabilities.

## Features

- **Smart Document Reader**: Processes PDF bank statements, CSV files, and various document formats
- **AI Expense Categorizer**: Uses OpenAI to intelligently categorize expenses
- **Learning System**: Remembers user preferences and improves over time
- **REST API**: FastAPI-based API server for frontend integration
- **Error Handling**: Comprehensive error handling and logging
- **Database Integration**: PostgreSQL for data persistence
- **Redis Caching**: Performance optimization with Redis

## Quick Start

### Prerequisites

- Python 3.9+
- PostgreSQL
- Redis
- OpenAI API key

### Installation

1. **Clone and navigate to the backend directory:**
   ```bash
   cd ai-backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize database:**
   ```bash
   alembic upgrade head
   ```

6. **Start the server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost/xspensesai
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Security
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# Logging
LOG_LEVEL=INFO
LOG_FILE=./logs/app.log
```

## API Endpoints

### Document Processing

- `POST /api/v1/documents/upload` - Upload and process documents
- `GET /api/v1/documents/{document_id}` - Get document details
- `GET /api/v1/documents/{document_id}/transactions` - Get extracted transactions

### Expense Categorization

- `POST /api/v1/categorize` - Categorize transactions
- `POST /api/v1/categorize/batch` - Categorize multiple transactions
- `PUT /api/v1/categorize/correct` - Correct categorization (learning)

### User Preferences

- `GET /api/v1/preferences` - Get user categorization preferences
- `POST /api/v1/preferences` - Update user preferences
- `GET /api/v1/preferences/learning` - Get learning progress

### Analytics

- `GET /api/v1/analytics/categories` - Category analytics
- `GET /api/v1/analytics/spending` - Spending patterns
- `GET /api/v1/analytics/accuracy` - AI accuracy metrics

## Project Structure

```
ai-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── config.py              # Configuration settings
│   ├── database.py            # Database connection
│   ├── models/                # SQLAlchemy models
│   ├── schemas/               # Pydantic schemas
│   ├── api/                   # API routes
│   ├── services/              # Business logic
│   ├── ai/                    # AI and ML components
│   └── utils/                 # Utility functions
├── alembic/                   # Database migrations
├── tests/                     # Test files
├── logs/                      # Log files
├── uploads/                   # Uploaded files
├── requirements.txt
├── .env.example
└── README.md
```

## Development

### Running Tests

```bash
pytest tests/
```

### Code Formatting

```bash
black app/
flake8 app/
mypy app/
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head
```

## AI Features

### Document Processing

The backend can process various document formats:

- **PDF Bank Statements**: Extracts transaction data using OCR and text parsing
- **CSV Files**: Direct parsing with intelligent column detection
- **Excel Files**: Supports .xlsx and .xls formats
- **Images**: OCR processing for receipt images

### Expense Categorization

Uses OpenAI's GPT models to categorize expenses with:

- **Context Awareness**: Considers transaction context and patterns
- **User Learning**: Remembers and applies user corrections
- **Confidence Scoring**: Provides confidence levels for categorizations
- **Batch Processing**: Efficient handling of multiple transactions

### Learning System

The AI learns from user interactions:

- **Preference Storage**: Remembers user categorization preferences
- **Pattern Recognition**: Identifies recurring transaction patterns
- **Accuracy Improvement**: Gets smarter over time with corrections
- **Personalization**: Adapts to individual user behavior

## Performance

- **Caching**: Redis-based caching for frequent operations
- **Async Processing**: Non-blocking document processing
- **Batch Operations**: Efficient handling of large datasets
- **Connection Pooling**: Optimized database connections

## Security

- **Authentication**: JWT-based authentication
- **File Validation**: Secure file upload handling
- **Input Sanitization**: Protection against malicious input
- **Rate Limiting**: API rate limiting for abuse prevention

## Monitoring

- **Logging**: Comprehensive logging with Loguru
- **Metrics**: Prometheus metrics for monitoring
- **Health Checks**: API health check endpoints
- **Error Tracking**: Detailed error reporting

## Support

For issues and questions, please refer to the API documentation at `/docs` when the server is running. 