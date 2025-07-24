# 🚀 Quick Start Guide - XspensesAI Flask Backend

Get your AI backend running in 5 minutes! This guide will help you set up and test the complete AI expense categorization system.

## ⚡ 5-Minute Setup

### Step 1: Prerequisites
- Python 3.8+ installed
- OpenAI API key (get one at https://platform.openai.com/)

### Step 2: Run Setup Script
```bash
cd ai-backend-flask
python setup.py
```

### Step 3: Configure OpenAI API Key
```bash
# Edit the .env file and add your OpenAI API key
nano .env
```
Set: `OPENAI_API_KEY=your_actual_api_key_here`

### Step 4: Start the Server
```bash
python start.py
```

### Step 5: Test Everything
```bash
python test_backend.py
```

## 🧪 Quick Testing

### Test 1: Health Check
```bash
curl http://localhost:5000/api/health
```
Expected response:
```json
{
  "status": "healthy",
  "service": "XspensesAI Flask Backend",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### Test 2: Categorize a Transaction
```bash
curl -X POST http://localhost:5000/api/categorize \
  -H "Content-Type: application/json" \
  -d '{"description": "STARBUCKS COFFEE", "amount": 5.50, "date": "2024-01-15"}'
```
Expected response:
```json
{
  "category": "Food & Dining",
  "confidence": 0.95,
  "keywords": ["coffee", "food", "dining"],
  "explanation": "Starbucks is a coffee shop, categorized as Food & Dining"
}
```

### Test 3: Upload a Sample CSV
Create a file `sample.csv`:
```csv
Date,Description,Amount
2024-01-15,STARBUCKS COFFEE,5.50
2024-01-15,UBER RIDE,25.00
2024-01-15,AMAZON PURCHASE,45.99
```

Upload it:
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@sample.csv"
```

### Test 4: View Transactions
```bash
# Replace {document_id} with the ID from the upload response
curl http://localhost:5000/api/documents/1/transactions
```

### Test 5: Correct a Categorization
```bash
curl -X PUT http://localhost:5000/api/categorize/correct \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": 1,
    "original_category": "Food & Dining",
    "corrected_category": "Coffee",
    "description": "STARBUCKS COFFEE",
    "amount": 5.50
  }'
```

## 📊 Sample Data for Testing

### Sample Bank Statement (CSV)
```csv
Date,Description,Amount
2024-01-15,STARBUCKS COFFEE,5.50
2024-01-15,UBER RIDE,25.00
2024-01-15,AMAZON PURCHASE,45.99
2024-01-16,NETFLIX SUBSCRIPTION,15.99
2024-01-16,GROCERY STORE,78.45
2024-01-17,GAS STATION,45.00
2024-01-17,RESTAURANT DINNER,65.00
2024-01-18,PHARMACY,12.50
2024-01-18,GYM MEMBERSHIP,29.99
2024-01-19,ONLINE SHOPPING,89.99
```

### Sample Bank Statement (JSON for API testing)
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
    },
    {
      "description": "AMAZON PURCHASE",
      "amount": 45.99,
      "date": "2024-01-15"
    }
  ]
}
```

## 🔧 Common Issues & Solutions

### Issue: "OPENAI_API_KEY not found"
**Solution**: Make sure you've set your API key in the `.env` file:
```bash
echo "OPENAI_API_KEY=your_key_here" >> .env
```

### Issue: "Server is not running"
**Solution**: Start the server:
```bash
python start.py
```

### Issue: "Database connection failed"
**Solution**: Run the setup script again:
```bash
python setup.py
```

### Issue: "File upload failed"
**Solution**: Check file format and size:
- Supported: PDF, CSV, Excel, JPG, PNG
- Max size: 10MB
- Make sure file is not corrupted

### Issue: "OpenAI connection failed"
**Solution**: 
1. Check your API key is valid
2. Ensure you have credits in your OpenAI account
3. Check internet connection

## 📱 Frontend Integration

### React/JavaScript Example
```javascript
// Upload document
const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://localhost:5000/api/documents/upload', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};

// Categorize transaction
const categorizeTransaction = async (transaction) => {
  const response = await fetch('http://localhost:5000/api/categorize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(transaction)
  });
  
  return response.json();
};

// Get transactions
const getTransactions = async (documentId) => {
  const response = await fetch(`http://localhost:5000/api/documents/${documentId}/transactions`);
  return response.json();
};
```

### Python Example
```python
import requests

# Upload document
with open('bank_statement.csv', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:5000/api/documents/upload', files=files)
    result = response.json()
    print(f"Document ID: {result['document_id']}")

# Categorize transaction
transaction = {
    "description": "STARBUCKS COFFEE",
    "amount": 5.50,
    "date": "2024-01-15"
}
response = requests.post('http://localhost:5000/api/categorize', json=transaction)
result = response.json()
print(f"Category: {result['category']}")
```

## 🎯 What You Can Do Now

✅ **Upload bank statements** (PDF, CSV, Excel, images)  
✅ **Extract transactions** automatically  
✅ **Categorize expenses** using AI  
✅ **Learn from corrections** (gets smarter over time)  
✅ **View analytics** and insights  
✅ **Integrate with frontend** via REST API  

## 📚 Next Steps

1. **Read the full documentation**: `README.md`
2. **Explore the API**: All endpoints documented in README
3. **Test with real data**: Upload your actual bank statements
4. **Integrate with frontend**: Use the API examples above
5. **Customize categories**: Modify `ai_categorizer.py` for your needs

## 🆘 Need Help?

- Check the logs: `./logs/app.log`
- Run tests: `python test_backend.py`
- Review error messages in the console
- Check the full documentation in `README.md`

---

**🎉 You're all set! Your AI expense categorization system is ready to use!** 