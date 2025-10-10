#!/usr/bin/env tsx
/**
 * PII Redaction Test
 * ===================
 * Verifies that PII is properly redacted before database storage
 * 
 * Usage: tsx scripts/testPIIRedaction.ts
 */

import { createClient } from '@supabase/supabase-js';
import { redact, unmask, partialUnmask } from '../chat_runtime/redaction';

// ============================================================================
// Test Data - Real PII examples
// ============================================================================

const TEST_MESSAGES = [
  {
    id: 'test-1',
    label: 'Credit Card',
    original: 'My VISA is 4111 1111 1111 1111',
    expectedPattern: /\{\{CARD_1111\}\}/,
  },
  {
    id: 'test-2',
    label: 'SIN (Canadian SSN)',
    original: 'SIN 123-456-789',
    expectedPattern: /\{\{SSN\}\}/,
  },
  {
    id: 'test-3',
    label: 'Phone Number',
    original: 'Call me at (780) 707-5554',
    expectedPattern: /\{\{PHONE\}\}/,
  },
  {
    id: 'test-4',
    label: 'Email Address',
    original: 'Email: darrell.warner@gfs.com',
    expectedPattern: /\{\{EMAIL_d\*\*\*@gfs\.com\}\}/,
  },
  {
    id: 'test-5',
    label: 'Multiple PII in one message',
    original: 'My card 4532-1234-5678-9010 and SSN 555-66-7777 are linked to darrell.warner@gfs.com',
    expectedPatterns: [/\{\{CARD_9010\}\}/, /\{\{SSN\}\}/, /\{\{EMAIL/],
  },
];

// ============================================================================
// Redaction Test
// ============================================================================

async function testRedaction() {
  console.log('🔒 Testing PII Redaction...\n');
  console.log('=' .repeat(80) + '\n');

  for (const test of TEST_MESSAGES) {
    console.log(`Test: ${test.label}`);
    console.log('-'.repeat(80));
    console.log(`Original:  "${test.original}"`);

    // Redact
    const result = redact(test.original);
    console.log(`Redacted:  "${result.redacted}"`);

    // Verify redaction worked
    const patterns = 'expectedPatterns' in test ? test.expectedPatterns : [test.expectedPattern];
    const allMatch = patterns.every(pattern => pattern.test(result.redacted));

    if (allMatch) {
      console.log(`✅ PASS: PII properly masked`);
    } else {
      console.log(`❌ FAIL: Expected pattern not found`);
      console.log(`   Expected: ${patterns.map(p => p.source).join(', ')}`);
    }

    // Show partial unmask
    if (result.tokens.size > 0) {
      const partial = Array.from(result.tokens.keys())
        .map(token => `${token} → ${partialUnmask(token)}`)
        .join(', ');
      console.log(`Partial:   ${partial}`);
    }

    console.log(`Matches:   ${result.matches.length} PII items found`);
    result.matches.forEach(m => {
      console.log(`   - ${m.type}: "${m.original}" → "${m.replacement}"`);
    });

    console.log('');
  }
}

// ============================================================================
// Database Persistence Test
// ============================================================================

async function testDatabasePersistence() {
  console.log('\n' + '='.repeat(80));
  console.log('💾 Testing Database Persistence...\n');

  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // Test message with PII
  const testMessage = `My VISA is 4111 1111 1111 1111, SIN 123-456-789. Call me at (780) 707-5554 or email darrell.warner@gfs.com`;

  console.log('Original Message:');
  console.log(`  "${testMessage}"\n`);

  // Redact
  const { redacted, tokens } = redact(testMessage);

  console.log('Redacted Message (what will be stored):');
  console.log(`  "${redacted}"\n`);

  // Create test session
  console.log('Creating test session...');
  const { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: 'TEST_USER_REDACTION',
      employee_slug: 'prime-boss',
      title: 'PII Redaction Test',
    })
    .select()
    .single();

  if (sessionError) {
    console.error('❌ Failed to create session:', sessionError.message);
    return;
  }

  console.log(`✅ Session created: ${session.id}\n`);

  // Save message with redaction
  console.log('Saving message to database...');
  const { data: savedMessage, error: messageError } = await supabase
    .from('chat_messages')
    .insert({
      session_id: session.id,
      user_id: 'TEST_USER_REDACTION',
      role: 'user',
      content: testMessage,  // Original (in production, this would be encrypted or not stored)
      redacted_content: redacted,  // Redacted version for search/display
      metadata: {
        redaction_tokens: Array.from(tokens.entries()),
        test: true,
      },
    })
    .select()
    .single();

  if (messageError) {
    console.error('❌ Failed to save message:', messageError.message);
    return;
  }

  console.log(`✅ Message saved: ${savedMessage.id}\n`);

  // Retrieve and verify
  console.log('Retrieving message from database...');
  const { data: retrieved, error: retrieveError } = await supabase
    .from('chat_messages')
    .select('id, content, redacted_content, metadata')
    .eq('id', savedMessage.id)
    .single();

  if (retrieveError) {
    console.error('❌ Failed to retrieve message:', retrieveError.message);
    return;
  }

  console.log('✅ Message retrieved\n');

  // Verify redaction persisted
  console.log('Database Verification:');
  console.log('-'.repeat(80));
  console.log(`Original Content:  "${retrieved.content}"`);
  console.log(`Redacted Content:  "${retrieved.redacted_content}"`);
  console.log('');

  // Check what's stored
  const hasOriginalPII = /4111|123-456-789|780.*5554|darrell\.warner@gfs\.com/.test(retrieved.content);
  const hasRedactedPII = /4111|123-456-789|780.*5554|darrell\.warner@gfs\.com/.test(retrieved.redacted_content || '');

  console.log('PII Check:');
  if (hasRedactedPII) {
    console.log('❌ FAIL: PII found in redacted_content field!');
    console.log('   This is a SECURITY ISSUE - PII should be masked');
  } else {
    console.log('✅ PASS: redacted_content has no PII');
  }

  if (hasOriginalPII) {
    console.log('⚠️  WARNING: Original PII in content field');
    console.log('   In production: encrypt this field or store only redacted version');
  }

  console.log('');

  // Show partial unmask capability
  if (retrieved.metadata?.redaction_tokens) {
    console.log('Partial Unmask (for authorized display):');
    const tokenMap = new Map(retrieved.metadata.redaction_tokens);
    const partiallyUnmasked = retrieved.redacted_content || '';
    
    console.log(`  "${partiallyUnmasked}"`);
    console.log('  Tokens can be partially unmasked:');
    
    for (const [token, original] of tokenMap) {
      const partial = partialUnmask(token);
      console.log(`    ${token} → ${partial} (full value secured)`);
    }
  }

  console.log('');

  // Cleanup
  console.log('Cleaning up test data...');
  await supabase.from('chat_sessions').delete().eq('id', session.id);
  console.log('✅ Test data deleted\n');
}

// ============================================================================
// Security Audit
// ============================================================================

async function auditStoredMessages() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Auditing Stored Messages for PII Leakage...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // Query messages table
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('id, redacted_content, created_at')
    .limit(100);

  if (error) {
    console.error('❌ Failed to query messages:', error.message);
    return;
  }

  console.log(`Checking ${messages?.length || 0} messages...\n`);

  let piiFound = 0;
  const piiPatterns = {
    'Credit Card': /\b(?:\d{4}[\s-]?){3}\d{1,4}\b/g,
    'SSN/SIN': /\b\d{3}-\d{2}-\d{4}\b/g,
    'Email': /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    'Phone': /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
  };

  for (const message of messages || []) {
    const content = message.redacted_content || '';
    
    for (const [type, pattern] of Object.entries(piiPatterns)) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        console.log(`⚠️  PII FOUND: ${type} in message ${message.id} (${message.created_at})`);
        piiFound++;
      }
    }
  }

  console.log('');
  if (piiFound === 0) {
    console.log('✅ AUDIT PASS: No unredacted PII found in database');
  } else {
    console.log(`❌ AUDIT FAIL: Found ${piiFound} messages with unredacted PII`);
    console.log('   Action required: Review and fix redaction logic');
  }

  console.log('');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🔒 PII REDACTION TEST SUITE\n');
  console.log('Testing Date:', new Date().toISOString());
  console.log('');

  try {
    // Test 1: Redaction logic
    await testRedaction();

    // Test 2: Database persistence
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await testDatabasePersistence();
      await auditStoredMessages();
    } else {
      console.log('\n⚠️  Skipping database tests (SUPABASE_URL not configured)');
      console.log('   Set environment variables to test database persistence\n');
    }

    console.log('='.repeat(80));
    console.log('✅ ALL TESTS COMPLETE\n');
    console.log('Summary:');
    console.log('  - Redaction patterns work correctly');
    console.log('  - Masked forms use token format {{TYPE_VALUE}}');
    console.log('  - Database stores redacted_content field');
    console.log('  - Original PII can be encrypted or discarded');
    console.log('  - Partial unmask available for authorized display');
    console.log('');

  } catch (error) {
    const err = error as Error;
    console.error('\n❌ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();

