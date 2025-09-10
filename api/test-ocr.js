/**
 * OCR Endpoint Test Script
 * 
 * Test the OCR ingestion endpoint with sample data
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001';

async function testOCRHealth() {
  try {
    console.log('🔍 Testing OCR health endpoint...');
    const response = await fetch(`${API_BASE}/api/ocr/health`);
    const data = await response.json();
    
    console.log('✅ Health check response:', data);
    return data;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return null;
  }
}

async function testOCRWithSampleFile() {
  try {
    console.log('📄 Testing OCR with sample file...');
    
    // Create a simple test image (you would replace this with actual file upload)
    const form = new FormData();
    
    // For testing, we'll create a simple text file that simulates OCR output
    const testText = `
    Bank Statement
    Account: 1234567890
    Statement Date: 2024-01-15
    
    2024-01-10  GROCERY STORE #1234     -$45.67
    2024-01-11  GAS STATION             -$32.10
    2024-01-12  RESTAURANT ABC          -$28.50
    2024-01-13  SALARY DEPOSIT          +$2500.00
    2024-01-14  UTILITIES               -$120.00
    `;
    
    // Create a temporary file for testing
    const testFilePath = path.join(__dirname, 'test-statement.txt');
    fs.writeFileSync(testFilePath, testText);
    
    form.append('file', fs.createReadStream(testFilePath), 'test-statement.txt');
    form.append('docType', 'statement');
    form.append('currency', 'CAD');
    
    const response = await fetch(`${API_BASE}/api/ocr/ingest`, {
      method: 'POST',
      body: form
    });
    
    const data = await response.json();
    
    console.log('✅ OCR test response:', JSON.stringify(data, null, 2));
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    return data;
  } catch (error) {
    console.error('❌ OCR test failed:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting OCR endpoint tests...\n');
  
  // Test 1: Health check
  const health = await testOCRHealth();
  if (!health) {
    console.log('❌ Health check failed, stopping tests');
    return;
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: OCR processing (mock)
  const ocrResult = await testOCRWithSampleFile();
  if (!ocrResult) {
    console.log('❌ OCR test failed');
    return;
  }
  
  console.log('\n🎉 All tests completed!');
  console.log('\nTo test with real files, use:');
  console.log('curl -X POST http://localhost:3001/api/ocr/ingest \\');
  console.log('  -F "file=@your-statement.pdf" \\');
  console.log('  -F "docType=statement" \\');
  console.log('  -F "currency=CAD"');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testOCRHealth,
  testOCRWithSampleFile,
  runTests
};
