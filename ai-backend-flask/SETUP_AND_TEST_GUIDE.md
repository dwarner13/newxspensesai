# 🚀 Complete AI Backend Setup & Test Guide

Get your AI expense categorization system working with real transactions in 10 minutes!

## 📋 Prerequisites

- Python 3.8+ installed
- OpenAI API key (get one at https://platform.openai.com/)
- Basic terminal/command prompt knowledge

## 🛠️ Step 1: Quick Setup

### 1.1 Navigate to Backend Directory
```bash
cd ai-backend-flask
```

### 1.2 Run Automated Setup
```bash
python setup.py
```

### 1.3 Configure Your OpenAI API Key
```bash
# Edit the .env file
nano .env
# or
notepad .env
```

Add your API key:
```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

## 📊 Step 2: Sample Data Setup

### 2.1 Create Sample Bank Statement CSV
The system will automatically create sample data, but you can also create your own:

```csv
Date,Description,Amount,Type
2024-01-15,STARBUCKS COFFEE,5.50,DEBIT
2024-01-15,UBER RIDE TO WORK,25.00,DEBIT
2024-01-15,AMAZON PURCHASE - BOOKS,45.99,DEBIT
2024-01-15,SHELL GAS STATION,35.50,DEBIT
2024-01-15,NETFLIX SUBSCRIPTION,15.99,DEBIT
2024-01-15,GROCERY STORE - FOOD,78.45,DEBIT
2024-01-15,APPLE STORE - PHONE CASE,29.99,DEBIT
2024-01-15,COFFEE SHOP - MEETING,8.75,DEBIT
2024-01-15,PIZZA DELIVERY,22.50,DEBIT
2024-01-15,PHARMACY - MEDICINE,12.99,DEBIT
```

### 2.2 Create Sample PDF Bank Statement
Create a file `sample_statement.pdf` with this content:
```
BANK STATEMENT - JANUARY 2024

Date: 2024-01-15
Account: ****1234

TRANSACTIONS:
01/15 - STARBUCKS COFFEE - $5.50
01/15 - UBER RIDE TO WORK - $25.00
01/15 - AMAZON PURCHASE - $45.99
01/15 - SHELL GAS STATION - $35.50
01/15 - NETFLIX SUBSCRIPTION - $15.99

Total: $127.98
```

## 🧪 Step 3: Test Scripts

### 3.1 Quick Health Check
```bash
python test_backend.py
```

### 3.2 Comprehensive AI Test
```bash
python test_ai_complete.py
```

### 3.3 Learning System Test
```bash
python test_learning_system.py
```

## 🔍 Step 4: Debugging & Monitoring

### 4.1 View Real-time Logs
```bash
# In a separate terminal
tail -f logs/xspensesai.log
```

### 4.2 Check Database Contents
```bash
python check_database.py
```

### 4.3 Monitor API Requests
```bash
python debug_upload.py
```

## 🎯 Step 5: See Your AI in Action

### 5.1 Start the Server
```bash
python start.py
```

### 5.2 Test Individual Transactions
```bash
# Test 1: Coffee purchase
curl -X POST http://localhost:5000/api/categorize \
  -H "Content-Type: application/json" \
  -d '{"description": "STARBUCKS COFFEE", "amount": 5.50, "date": "2024-01-15"}'

# Test 2: Gas purchase
curl -X POST http://localhost:5000/api/categorize \
  -H "Content-Type: application/json" \
  -d '{"description": "SHELL GAS STATION", "amount": 35.50, "date": "2024-01-15"}'

# Test 3: Online purchase
curl -X POST http://localhost:5000/api/categorize \
  -H "Content-Type: application/json" \
  -d '{"description": "AMAZON PURCHASE - BOOKS", "amount": 45.99, "date": "2024-01-15"}'
```

### 5.3 Upload and Process Full Statement
```bash
# Upload CSV file
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@sample_bank_statement.csv"

# Get processed transactions
curl http://localhost:5000/api/documents/1/transactions
```

### 5.4 Test Learning System
```bash
# Correct a categorization
curl -X PUT http://localhost:5000/api/categorize/correct \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": 1,
    "original_category": "Food & Dining",
    "corrected_category": "Coffee",
    "description": "STARBUCKS COFFEE",
    "amount": 5.50
  }'

# Test the same transaction again - it should now use your preference!
curl -X POST http://localhost:5000/api/categorize \
  -H "Content-Type: application/json" \
  -d '{"description": "STARBUCKS COFFEE", "amount": 5.50, "date": "2024-01-15"}'
```

## 📈 Expected Results

### AI Categorization Examples:
- "STARBUCKS COFFEE" → "Food & Dining" (95% confidence)
- "SHELL GAS STATION" → "Transportation" (98% confidence)
- "AMAZON PURCHASE - BOOKS" → "Shopping" (92% confidence)
- "NETFLIX SUBSCRIPTION" → "Entertainment" (97% confidence)

### Learning System Results:
- After correcting "STARBUCKS COFFEE" to "Coffee"
- Next "STARBUCKS COFFEE" transaction → "Coffee" (100% confidence)
- System remembers your preference!

## 🐛 Troubleshooting

### Common Issues:

1. **OpenAI API Key Error**
   ```bash
   # Check your .env file
   cat .env
   # Make sure OPENAI_API_KEY is set correctly
   ```

2. **Port Already in Use**
   ```bash
   # Kill existing process
   lsof -ti:5000 | xargs kill -9
   # Or change port in start.py
   ```

3. **Database Issues**
   ```bash
   # Reset database
   rm data/xspensesai.db
   python setup.py
   ```

4. **Dependencies Missing**
   ```bash
   # Reinstall dependencies
   pip install -r requirements.txt
   ```

## 🎉 Success Indicators

You'll know everything is working when you see:

✅ **Server starts without errors**
```
🚀 XspensesAI Flask Backend starting...
✅ Database initialized
✅ AI categorizer ready
✅ Server running on http://localhost:5000
```

✅ **AI categorizes transactions correctly**
```json
{
  "category": "Food & Dining",
  "confidence": 0.95,
  "keywords": ["coffee", "food", "dining"],
  "explanation": "Starbucks is a coffee shop, categorized as Food & Dining"
}
```

✅ **Learning system remembers preferences**
```json
{
  "category": "Coffee",
  "confidence": 1.0,
  "keywords": ["coffee", "starbucks"],
  "explanation": "User preference: Starbucks should be categorized as Coffee"
}
```

## 🚀 Next Steps

1. **Upload your real bank statements**
2. **Train the AI with your preferences**
3. **Integrate with the frontend dashboard**
4. **Scale up with more data**

Your AI is now ready to process real financial transactions! 🎯 