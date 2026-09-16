/**
 * Current-Time Intent Classifier — Tests
 *
 * Verifies detectCurrentTimeIntent correctly identifies genuine
 * current-time/date queries and rejects incidental uses of "time"/"date".
 */
import { detectCurrentTimeIntent } from '../src/shared/detect-current-time-intent';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Positive: genuine current-time queries
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 1: Positive current-time queries ===\n');
{
  assert('T1. "What time is it?"', detectCurrentTimeIntent('What time is it?') === 'time');
  assert('T2. "What is the time?"', detectCurrentTimeIntent('What is the time?') === 'time');
  assert('T3. "What\'s the time?"', detectCurrentTimeIntent("What's the time?") === 'time');
  assert('T4. "current time"', detectCurrentTimeIntent('current time') === 'time');
  assert('T5. "time now"', detectCurrentTimeIntent('time now') === 'time');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Positive: genuine current-date queries
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 2: Positive current-date queries ===\n');
{
  assert('D1. "What is today\'s date?"', detectCurrentTimeIntent("What is today's date?") === 'date');
  assert('D2. "What day is it today?"', detectCurrentTimeIntent('What day is it today?') === 'date');
  assert('D3. "What date is it?"', detectCurrentTimeIntent('What date is it?') === 'date');
  assert('D4. "What is the date?"', detectCurrentTimeIntent('What is the date?') === 'date');
  assert('D5. "today\'s date"', detectCurrentTimeIntent("today's date") === 'date');
  assert('D6. "date today"', detectCurrentTimeIntent('date today') === 'date');
  assert('D7. "What is today"', detectCurrentTimeIntent('What is today') === 'date');
  assert('D8. "Which day is it?"', detectCurrentTimeIntent('Which day is it?') === 'date');
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Positive: both time and date
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 3: Datetime queries ===\n');
{
  assert('DT1. combined', detectCurrentTimeIntent("What's the time and what's the date?") === 'datetime');
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Negative: FALSE POSITIVES that must NOT trigger
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 4: Must NOT be temporal (false positive prevention) ===\n');
{
  assert('FP1. "$500K saved by the time I retire"',
    detectCurrentTimeIntent('I want to have $500,000 saved by the time I retire') === null);
  assert('FP2. "By the time I retire, what could my balance be?"',
    detectCurrentTimeIntent('By the time I retire, what could my balance be?') === null);
  assert('FP3. "What time did I make my last payment?"',
    detectCurrentTimeIntent('What time did I make my last payment?') === null);
  assert('FP4. "Over time, how much could I save?"',
    detectCurrentTimeIntent('Over time, how much could I save?') === null);
  assert('FP5. "This time I want to pay an extra $100"',
    detectCurrentTimeIntent('This time I want to pay an extra $100') === null);
  assert('FP6. "By the time I retire" (short)',
    detectCurrentTimeIntent('By the time I retire') === null);
  assert('FP7. "date of my last transaction"',
    detectCurrentTimeIntent('date of my last transaction') === null);
  assert('FP8. "What was the date of my charge?"',
    detectCurrentTimeIntent('What was the date of my charge?') === null);
  assert('FP9. "How much did I spend this time?"',
    detectCurrentTimeIntent('How much did I spend this time?') === null);
  assert('FP10. "time" alone',
    detectCurrentTimeIntent('time') === null);
  assert('FP11. "date" alone',
    detectCurrentTimeIntent('date') === null);
  assert('FP12. "It\'s about time I checked my spending"',
    detectCurrentTimeIntent("It's about time I checked my spending") === null);
  assert('FP13. "Every time I get paid"',
    detectCurrentTimeIntent('Every time I get paid') === null);
  assert('FP14. "At that time my balance was higher"',
    detectCurrentTimeIntent('At that time my balance was higher') === null);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Edge cases
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 5: Edge cases ===\n');
{
  assert('E1. empty string', detectCurrentTimeIntent('') === null);
  assert('E2. null-like', detectCurrentTimeIntent(null as any) === null);
  assert('E3. mixed case "WHAT TIME IS IT?"', detectCurrentTimeIntent('WHAT TIME IS IT?') === 'time');
  assert('E4. extra whitespace', detectCurrentTimeIntent('  What is the time?  ') === 'time');
  assert('E5. finance keyword + time (statement)', detectCurrentTimeIntent('What time was the statement generated?') === null);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`CURRENT-TIME INTENT: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
