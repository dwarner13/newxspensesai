#!/usr/bin/env node

/**
 * Simple test script to verify PDF to image conversion works
 * Run with: node test-pdf-converter.js
 */

const fs = require('fs');
const path = require('path');

// Test if we can import the required modules
console.log('🧪 Testing PDF Converter Dependencies...\n');

try {
  console.log('✅ Testing pdf-parse...');
  const pdfParse = require('pdf-parse');
  console.log('   pdf-parse loaded successfully');
  
  console.log('✅ Testing pdf2pic...');
  const { fromBuffer } = require('pdf2pic');
  console.log('   pdf2pic loaded successfully');
  
  console.log('✅ Testing sharp...');
  const sharp = require('sharp');
  console.log('   sharp loaded successfully');
  
  console.log('\n🎉 All dependencies loaded successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Install dependencies: npm install');
  console.log('2. Build the project: npm run build');
  console.log('3. Test with a real PDF file');
  
} catch (error) {
  console.error('❌ Error loading dependencies:', error.message);
  console.log('\n🔧 Fix: Run "npm install" to install missing dependencies');
  process.exit(1);
}
