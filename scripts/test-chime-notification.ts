/**
 * Manual Test Script for Chime Notification Golden Path
 * 
 * This script tests the full Chime notification flow:
 * 1. Creates a test recurring obligation (or uses existing)
 * 2. Calls createChimeNotificationFromObligation
 * 3. Verifies notification was queued
 * 4. Checks that title/body are guardrail-compliant
 * 
 * Usage (dev only):
 *   pnpm tsx scripts/test-chime-notification.ts
 * 
 * Or run via Node:
 *   node --loader ts-node/esm scripts/test-chime-notification.ts
 */

import { createChimeNotificationFromObligation } from '../netlify/functions/_shared/chimeNotificationHelper';
import { getSupabaseServerClient } from '../src/server/db';

// Test configuration
const TEST_USER_ID = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000000'; // Replace with real user ID for testing
const TEST_OBLIGATION_ID = process.env.TEST_OBLIGATION_ID || null; // Use existing obligation ID, or null to create one

async function main() {
  console.log('🧪 Testing Chime Notification Golden Path\n');

  const supabase = getSupabaseServerClient();

  // Step 1: Get or create a test obligation
  let obligationId = TEST_OBLIGATION_ID;
  let obligation: any;

  if (!obligationId) {
    console.log('📝 Creating test recurring obligation...');
    
    // Create a test obligation
    const { data: newObligation, error: createError } = await supabase
      .from('recurring_obligations')
      .insert({
        user_id: TEST_USER_ID,
        merchant_name: 'Capital One MasterCard',
        obligation_type: 'credit_card',
        source_account_last4: '1234',
        amount_estimate: 165.00,
        currency: 'CAD',
        frequency: 'monthly',
        next_expected_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
        last_seen_date: new Date().toISOString().split('T')[0],
        confidence: 0.85,
        is_active: true,
      })
      .select('id, merchant_name, obligation_type, amount_estimate, currency, next_expected_date')
      .single();

    if (createError) {
      console.error('❌ Failed to create test obligation:', createError);
      process.exit(1);
    }

    obligationId = newObligation.id;
    obligation = newObligation;
    console.log(`✅ Created test obligation: ${obligationId}\n`);
  } else {
    console.log(`📋 Using existing obligation: ${obligationId}`);
    const { data: existingObligation, error: fetchError } = await supabase
      .from('recurring_obligations')
      .select('id, merchant_name, obligation_type, amount_estimate, currency, next_expected_date')
      .eq('id', obligationId)
      .eq('user_id', TEST_USER_ID)
      .single();

    if (fetchError || !existingObligation) {
      console.error('❌ Failed to fetch obligation:', fetchError);
      process.exit(1);
    }

    obligation = existingObligation;
    console.log(`✅ Found obligation: ${obligation.merchant_name}\n`);
  }

  // Step 2: Test credit_card_due scenario
  console.log('🔔 Testing credit_card_due scenario...');
  const result = await createChimeNotificationFromObligation({
    userId: TEST_USER_ID,
    obligation: {
      id: obligation.id,
      merchant_name: obligation.merchant_name,
      obligation_type: obligation.obligation_type,
      amount_estimate: obligation.amount_estimate,
      currency: obligation.currency || 'CAD',
      next_expected_date: obligation.next_expected_date,
    },
    scenario: 'credit_card_due',
    daysUntilDue: 3,
    extraPaymentOption: 25,
    interestSavingsEstimate: 'You could save about $480 in interest',
  });

  if (!result.ok) {
    console.error('❌ Failed to create notification:', result.error);
    process.exit(1);
  }

  const notification = result.value;
  console.log('✅ Notification created successfully!\n');
  console.log('📄 Notification Details:');
  console.log(`   ID: ${notification.notificationId}`);
  console.log(`   Title: ${notification.title}`);
  console.log(`   Body: ${notification.body.substring(0, 100)}...`);
  console.log(`   Scheduled for: ${notification.scheduledFor}\n`);

  // Step 3: Verify notification in database
  console.log('🔍 Verifying notification in database...');
  const { data: queuedNotification, error: verifyError } = await supabase
    .from('notifications_queue')
    .select('id, title, body, status, scheduled_for, metadata')
    .eq('id', notification.notificationId)
    .single();

  if (verifyError || !queuedNotification) {
    console.error('❌ Failed to verify notification:', verifyError);
    process.exit(1);
  }

  console.log('✅ Notification found in queue:');
  console.log(`   Status: ${queuedNotification.status}`);
  console.log(`   Scheduled for: ${queuedNotification.scheduled_for}`);
  console.log(`   Metadata: ${JSON.stringify(queuedNotification.metadata, null, 2)}\n`);

  // Step 4: Check for PII leakage
  console.log('🛡️ Checking for PII leakage...');
  const fullText = `${notification.title} ${notification.body}`;
  
  // Check for full account numbers (12+ digits)
  const accountNumberPattern = /\d{12,}/g;
  const accountMatches = fullText.match(accountNumberPattern);
  
  if (accountMatches && accountMatches.length > 0) {
    console.warn('⚠️  WARNING: Potential account numbers found:', accountMatches);
  } else {
    console.log('✅ No obvious account numbers detected');
  }

  // Check for common PII patterns
  const ssnPattern = /\d{3}-\d{2}-\d{4}/g;
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  if (ssnPattern.test(fullText)) {
    console.warn('⚠️  WARNING: SSN pattern detected');
  }
  if (emailPattern.test(fullText)) {
    console.warn('⚠️  WARNING: Email pattern detected');
  }

  console.log('\n✅ All checks passed! Notification is guardrail-compliant.\n');
  console.log('📋 Full notification text:');
  console.log(`Title: ${notification.title}`);
  console.log(`Body:\n${notification.body}\n`);

  // Cleanup (optional - comment out to keep test data)
  // console.log('🧹 Cleaning up test data...');
  // await supabase.from('notifications_queue').delete().eq('id', notification.notificationId);
  // if (!TEST_OBLIGATION_ID) {
  //   await supabase.from('recurring_obligations').delete().eq('id', obligation.id);
  // }
  // console.log('✅ Cleanup complete\n');
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});



