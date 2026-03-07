/**
 * test-process-statement.mjs
 * Sends the test PDF to the process-statement endpoint and prints the result.
 */
import fs from 'fs';
import https from 'https';
import http from 'http';

const pdfPath = './uploads/test-statement.pdf';
const userId  = '938a2e17-0e49-45ff-bb98-810db46e5e65'; // Darrell's user ID

const buf    = fs.readFileSync(pdfPath);
const base64 = buf.toString('base64');

// Quick text check to confirm it's a text-based PDF (pdf-parse confidence preview)
const textChars = (buf.toString('ascii').match(/[A-Za-z0-9 .,\-$%]/g) || []).length;
const confidence = textChars / buf.length;
console.log(`\n📄 File:       ${pdfPath}`);
console.log(`   Size:       ${(buf.length / 1024).toFixed(1)} KB`);
console.log(`   Base64:     ${(base64.length / 1024).toFixed(1)} KB`);
console.log(`   Text ratio: ${(confidence * 100).toFixed(1)}% → ${confidence >= 0.85 ? 'text-based PDF (primary path)' : 'scanned/low-quality (Claude Vision fallback)'}\n`);

const body = JSON.stringify({
  base64,
  fileName:  'test-statement.pdf',
  mimeType:  'application/pdf',
  userId,
  importId:  `test_${Date.now()}`,
});

console.log('📡 POST /.netlify/functions/process-statement ...\n');

const req = http.request({
  hostname: 'localhost',
  port: 8888,
  path: '/.netlify/functions/process-statement',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log(`HTTP ${res.statusCode}`);
    try {
      const j = JSON.parse(d);
      console.log('\n✅ Response:');
      console.log(JSON.stringify(j, null, 2));
    } catch {
      console.log('Raw:', d.slice(0, 1000));
    }
  });
});
req.on('error', e => console.error('❌ Request failed:', e.message));
req.write(body);
req.end();
