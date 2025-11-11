#!/usr/bin/env tsx
/**
 * Header Audit Tool
 * 
 * Day 16: Header Telemetry Validation
 * 
 * Audits headers across all employees and routes.
 * Usage: pnpm tsx scripts/headers_audit.ts
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8888/.netlify/functions';

const EMPLOYEES = ['prime', 'byte', 'tag', 'crystal'] as const;

const CORE_HEADERS = [
  'X-Guardrails',
  'X-PII-Mask',
  'X-Memory-Hit',
  'X-Memory-Count',
  'X-Session-Summary',
  'X-Session-Summarized',
  'X-Employee',
  'X-Route-Confidence',
  'X-Memory-Verified',
];

const OCR_HEADERS = [
  'X-OCR-Provider',
  'X-OCR-Parse',
  'X-Transactions-Saved',
  'X-Categorizer',
  'X-Vendor-Matched',
  'X-XP-Awarded',
];

const STREAMING_HEADERS = [
  'X-Stream-Chunk-Count',
  'Content-Type',
];

async function auditHeaders() {
  console.log('🔍 XspensesAI Header Audit\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results: Array<{
    employee: string;
    route: string;
    status: number;
    headers: Record<string, string>;
    missingHeaders: string[];
  }> = [];

  for (const employee of EMPLOYEES) {
    console.log(`\n=== ${employee.toUpperCase()} ===`);

    // Test non-streaming
    try {
      const res = await fetch(`${BASE_URL}/chat?nostream=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Employee-Override': employee,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'header audit test' }],
          userId: 'audit-test-user',
          sessionId: `audit-${Date.now()}`,
        }),
      });

      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const missingCore = CORE_HEADERS.filter(h => !headers[h] && !headers[h.toLowerCase()]);
      
      results.push({
        employee,
        route: 'non-stream',
        status: res.status,
        headers,
        missingHeaders: missingCore,
      });

      console.log(`  Status: ${res.status}`);
      console.log(`  Core Headers:`);
      for (const h of CORE_HEADERS) {
        const value = headers[h] || headers[h.toLowerCase()];
        console.log(`    ${h}: ${value || '❌ MISSING'}`);
      }

      // Check for OCR headers (for Byte)
      if (employee === 'byte') {
        console.log(`  OCR Headers:`);
        for (const h of OCR_HEADERS) {
          const value = headers[h] || headers[h.toLowerCase()];
          if (value) {
            console.log(`    ${h}: ${value}`);
          }
        }
      }

      if (missingCore.length > 0) {
        console.log(`  ⚠️ Missing: ${missingCore.join(', ')}`);
      }

    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
    }

    // Test streaming (SSE)
    try {
      const res = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'X-Employee-Override': employee,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'header audit streaming test' }],
          userId: 'audit-test-user',
          sessionId: `audit-stream-${Date.now()}`,
        }),
      });

      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const missingCore = CORE_HEADERS.filter(h => !headers[h] && !headers[h.toLowerCase()]);
      
      results.push({
        employee,
        route: 'stream',
        status: res.status,
        headers,
        missingHeaders: missingCore,
      });

      console.log(`\n  [SSE] Status: ${res.status}`);
      console.log(`  [SSE] Content-Type: ${headers['content-type'] || headers['Content-Type'] || '❌ MISSING'}`);
      console.log(`  [SSE] X-Stream-Chunk-Count: ${headers['x-stream-chunk-count'] || headers['X-Stream-Chunk-Count'] || '0 (initial)'}`);
      
      if (missingCore.length > 0) {
        console.log(`  [SSE] ⚠️ Missing: ${missingCore.join(', ')}`);
      }

      // Consume stream to completion (don't leave hanging)
      if (res.body) {
        const reader = res.body.getReader();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }

    } catch (error: any) {
      console.error(`  [SSE] ❌ Error: ${error.message}`);
    }
  }

  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('='.repeat(60));

  let totalChecks = 0;
  let passedChecks = 0;

  for (const result of results) {
    const corePresent = CORE_HEADERS.length - result.missingHeaders.length;
    totalChecks += CORE_HEADERS.length;
    passedChecks += corePresent;

    const status = result.missingHeaders.length === 0 ? '✅' : '⚠️';
    console.log(`${status} ${result.employee} (${result.route}): ${corePresent}/${CORE_HEADERS.length} headers`);
  }

  console.log(`\nOverall: ${passedChecks}/${totalChecks} header checks passed`);

  if (passedChecks === totalChecks) {
    console.log('\n✅ All headers present!');
  } else {
    console.log('\n⚠️ Some headers missing. See details above.');
  }

  // Test OCR endpoint separately
  console.log('\n\n=== OCR Endpoint ===');
  try {
    // Note: This is a minimal test - actual OCR requires file upload
    const res = await fetch(`${BASE_URL}/ocr`, {
      method: 'OPTIONS',
    });

    console.log(`  Status: ${res.status}`);
    
    if (res.status === 200 || res.status === 204) {
      console.log('  ✅ OCR endpoint accessible');
    }
  } catch (error: any) {
    console.error(`  ❌ OCR endpoint error: ${error.message}`);
  }
}

// Run audit
auditHeaders().catch((error) => {
  console.error('\n❌ Audit failed:', error);
  process.exit(1);
});







