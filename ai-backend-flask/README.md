# XspensesAI Flask Backend

A production-ready AI backend for the XspensesAI fintech entertainment platform. This backend provides intelligent document processing, AI-powered expense categorization, and a learning system that gets smarter over time.

## 🚀 Features

### Core Capabilities
- **Smart Document Reader**: Handles PDF, CSV, Excel, and image bank statements from any bank (Chase, Wells Fargo, etc.)
- **AI Expense Categorizer**: Uses OpenAI GPT to intelligently categorize transactions
- **Learning System**: Remembers user preferences and learns from corrections
- **REST API**: Flask-based API server with CORS support for React frontend
- **SQLite Database**: Lightweight database for storing documents, transactions, and learning data

### Smart Features
- **Universal Bank Support**: Reads statements from any bank format
- **Intelligent Extraction**: Extracts date, description, and amount from various formats
- **AI Categorization**: Categorizes transactions (Food, Transportation, Bills, etc.)
- **Learning Memory**: Remembers corrections (e.g., "Starbucks = Coffee" forever)
- **Batch Processing**: Handle multiple transactions efficiently
- **Error Handling**: Robust error handling for malformed documents

## 📁 Project Structure

```
ai-backend-flask/
├── api_server.py          # Main Flask API server
├── document_reader.py     # Smart document reader (PDF/CSV/image)
├── ai_categorizer.py      # OpenAI-powered categorization
├── learning_system.py     # User preference learning system
├── database.py           # SQLite database operations
├── setup.py              # Setup and installation script
├── test_backend.py       # Testing script
├── requirements.txt      # Python dependencies
├── env.example          # Environment variables template
├── README.md            # This file
├── data/                # SQLite database files
├── uploads/             # Uploaded documents
│   ├── pdf/
│   ├── csv/
│   └── images/
└── logs/                # Application logs
```

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.8 or higher
- OpenAI API key
- pip (Python package manager)

### Quick Setup

1. **Clone or navigate to the project directory**
   ```bash
   cd ai-backend-flask
   ```

2. **Run the setup script**
   ```bash
   python setup.py
   ```

3. **Configure environment variables**
   ```bash
   # Edit .env file with your OpenAI API key
   nano .env
   ```

4. **Start the server**
   ```bash
   python api_server.py
   ```

5. **Test the backend**
   ```bash
   python test_backend.py
   ```

### Manual Setup (Alternative)

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Create directories**
   ```bash
   mkdir -p data uploads/pdf uploads/csv uploads/images logs
   ```

3. **Set up environment**
   ```bash
   cp env.example .env
   # Edit .env with your OpenAI API key
   ```

4. **Initialize database**
   ```bash
   python -c "from database import XspensesDatabase; XspensesDatabase()"
   ```

## 🔧 Configuration

### Environment Variables (.env)

```ini
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.1

# Database Configuration
DATABASE_PATH=./data/xspensesai.db

# File Storage
UPLOAD_FOLDER=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# Server Configuration
FLASK_ENV=development
FLASK_DEBUG=True
PORT=5000

# Logging
LOG_LEVEL=INFO
LOG_FILE=./logs/app.log

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000
```

### Endpoints

#### 1. Upload Document
**POST** `/api/documents/upload`

Upload a bank statement for processing.

**Request:**
- Content-Type: `multipart/form-data`
- Body: File upload (PDF, CSV, Excel, or image)

**Response:**
```json
{
  "document_id": 1,
  "status": "completed",
  "filename": "bank_statement.pdf",
  "total_transactions": 25,
  "extraction_confidence": 0.95,
  "message": "Document processed successfully"
}
```

**Example (cURL):**
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@bank_statement.pdf"
```

#### 2. Get Document Details
**GET** `/api/documents/{document_id}`

Get information about a processed document.

**Response:**
```json
{
  "id": 1,
  "filename": "bank_statement.pdf",
  "original_filename": "bank_statement.pdf",
  "file_size": 1024000,
  "file_type": "pdf",
  "status": "completed",
  "total_transactions": 25,
  "extraction_confidence": 0.95,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### 3. Get Document Transactions
**GET** `/api/documents/{document_id}/transactions`

Get all transactions from a document.

**Response:**
```json
{
  "document_id": 1,
  "transactions": [
    {
      "id": 1,
      "date": "2024-01-15",
      "description": "STARBUCKS COFFEE",
      "amount": 5.50,
      "category": "Food & Dining",
      "confidence": 0.95,
      "is_corrected": false
    }
  ],
  "total": 25
}
```

#### 4. Categorize Single Transaction
**POST** `/api/categorize`

Categorize a single transaction using AI.

**Request:**
```json
{
  "description": "STARBUCKS COFFEE",
  "amount": 5.50,
  "date": "2024-01-15"
}
```

**Response:**
```json
{
  "category": "Food & Dining",
  "confidence": 0.95,
  "keywords": ["coffee", "food", "dining"],
  "explanation": "Starbucks is a coffee shop, categorized as Food & Dining"
}
```

#### 5. Batch Categorization
**POST** `/api/categorize/batch`

Categorize multiple transactions at once.

**Request:**
```json
{
  "transactions": [
    {
      "description": "STARBUCKS COFFEE",
      "amount": 5.50,
      "date": "2024-01-15"
    },
    {
      "description": "UBER RIDE",
      "amount": 25.00,
      "date": "2024-01-15"
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "description": "STARBUCKS COFFEE",
      "category": "Food & Dining",
      "confidence": 0.95
    },
    {
      "description": "UBER RIDE",
      "category": "Transportation",
      "confidence": 0.98
    }
  ]
}
```

#### 6. Correct Categorization
**POST** `/api/categorize/correct`

Teach the AI system by correcting a categorization.

**Request:**
```json
{
  "transaction_id": 1,
  "original_category": "Food & Dining",
  "corrected_category": "Coffee",
  "description": "STARBUCKS COFFEE",
  "amount": 5.50
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Learning updated successfully",
  "impact_score": 0.85,
  "new_preference": {
    "pattern": "starbucks",
    "category": "Coffee",
    "confidence": 0.95
  }
}
```

#### 7. Get User Preferences
**GET** `/api/preferences`

Get learned user preferences and patterns.

**Response:**
```json
{
  "preferences": [
    {
      "pattern": "starbucks",
      "category": "Coffee",
      "confidence": 0.95,
      "usage_count": 15,
      "last_used": "2024-01-15T10:30:00Z"
    }
  ],
  "total_preferences": 25
}
```

#### 8. Get Analytics
**GET** `/api/analytics`

Get learning system analytics and insights.

**Response:**
```json
{
  "total_documents": 10,
  "total_transactions": 250,
  "total_preferences": 25,
  "learning_accuracy": 0.92,
  "most_common_categories": [
    {"category": "Food & Dining", "count": 45},
    {"category": "Transportation", "count": 30}
  ],
  "recent_corrections": [
    {
      "description": "STARBUCKS COFFEE",
      "from": "Food & Dining",
      "to": "Coffee",
      "date": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## 🧪 Testing

### Quick Test
```bash
python test_backend.py
```

### Manual Testing with cURL

1. **Test server health**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Upload a document**
   ```bash
   curl -X POST http://localhost:5000/api/documents/upload \
     -F "file=@your_bank_statement.pdf"
   ```

3. **Get transactions**
   ```bash
   curl http://localhost:5000/api/documents/1/transactions
   ```

4. **Categorize a transaction**
   ```bash
   curl -X POST http://localhost:5000/api/categorize \
     -H "Content-Type: application/json" \
     -d '{"description": "STARBUCKS COFFEE", "amount": 5.50, "date": "2024-01-15"}'
   ```

## 📊 Supported File Formats

### PDF Documents
- Bank statements from any bank
- Multi-page documents
- Tables and structured data
- Text-based PDFs

### CSV Files
- Comma-separated values
- Bank export files
- Custom delimiters
- Headers and data rows

### Excel Files
- .xlsx and .xls formats
- Multiple sheets
- Formatted data
- Charts and tables

### Images
- JPG, JPEG, PNG formats
- OCR text extraction
- Screenshots of statements
- Mobile app screenshots

## 🎯 AI Categories

The system categorizes transactions into these main categories:

- **Food & Dining**: Restaurants, cafes, food delivery
- **Transportation**: Uber, Lyft, gas, parking
- **Shopping**: Retail stores, online shopping
- **Bills & Utilities**: Electricity, water, internet
- **Entertainment**: Movies, games, streaming
- **Healthcare**: Medical expenses, prescriptions
- **Travel**: Flights, hotels, vacation expenses
- **Education**: Books, courses, tuition
- **Personal Care**: Salons, gym memberships
- **Other**: Uncategorized transactions

## 🔄 Learning System

The AI learns from user corrections:

1. **Pattern Recognition**: Identifies merchant patterns
2. **Preference Storage**: Saves user preferences in database
3. **Confidence Scoring**: Calculates learning confidence
4. **Automatic Application**: Applies learned patterns to future transactions
5. **Decay Factor**: Reduces impact of old corrections over time

### Example Learning
```
User corrects: "STARBUCKS COFFEE" from "Food & Dining" to "Coffee"
System learns: Pattern "starbucks" → Category "Coffee" (confidence: 0.95)
Future transactions: Any "STARBUCKS" transaction automatically categorized as "Coffee"
```

## 🚨 Error Handling

The system handles various error scenarios:

- **Invalid file formats**: Returns error with supported formats
- **Corrupted documents**: Attempts recovery, logs errors
- **OpenAI API errors**: Graceful fallback, retry mechanisms
- **Database errors**: Transaction rollback, error logging
- **Network issues**: Timeout handling, connection retries

## 📝 Logging

Logs are stored in `./logs/app.log` with different levels:

- **INFO**: Normal operations, successful processing
- **WARNING**: Non-critical issues, fallback scenarios
- **ERROR**: Critical errors, failed operations
- **DEBUG**: Detailed debugging information

## 🔧 Development

### Running in Development Mode
```bash
export FLASK_ENV=development
export FLASK_DEBUG=True
python api_server.py
```

### Adding New Features
1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Submit pull request

### Code Structure
- **Modular Design**: Each component is self-contained
- **Error Handling**: Comprehensive error handling throughout
- **Type Hints**: Python type hints for better code quality
- **Documentation**: Docstrings for all functions and classes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review error logs
- Test with sample data
- Contact the development team

---

**XspensesAI Flask Backend** - Making expense management intelligent and fun! 🚀 