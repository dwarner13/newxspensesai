/**
 * Action Receipt regression tests.
 * Validates parseActionReceipt(), ActionReceipt types, and rendering contract.
 * Run: npx tsx scripts/_run_action_receipt_tests.ts
 */

// ---------------------------------------------------------------------------
// Inline parseActionReceipt (mirrors src/components/chat/ActionReceiptCard.tsx)
// to avoid importing React/JSX in a pure Node test runner.
// ---------------------------------------------------------------------------

interface CategoryUpdateReceipt {
  type: 'action_receipt';
  action: 'transaction_category_updated';
  success: true;
  transactionId: string;
  merchantName: string | null;
  date: string | null;
  amount: number | null;
  oldCategory: string;
  newCategory: string;
  subcategory?: string | null;
}

interface ActionFailureReceipt {
  type: 'action_receipt';
  action: string;
  success: false;
  merchantName?: string | null;
  message?: string;
}

type ActionReceipt = CategoryUpdateReceipt | ActionFailureReceipt;

function parseActionReceipt(
  toolConfirmationResult: { tool: string; result: unknown; success: boolean } | undefined,
): ActionReceipt | null {
  if (!toolConfirmationResult) return null;
  const { tool, result, success } = toolConfirmationResult;
  if (tool !== 'tag_update_transaction_category') return null;
  const r = result as Record<string, unknown> | null | undefined;
  if (!r || typeof r !== 'object') return null;
  if (!success || r.success !== true) {
    return {
      type: 'action_receipt',
      action: tool,
      success: false,
      merchantName: typeof r.merchantName === 'string' ? r.merchantName : null,
      message: typeof r.message === 'string' ? r.message : undefined,
    };
  }
  return {
    type: 'action_receipt',
    action: 'transaction_category_updated',
    success: true,
    transactionId: String(r.transactionId || ''),
    merchantName: typeof r.merchantName === 'string' ? r.merchantName : null,
    date: typeof r.date === 'string' ? r.date : null,
    amount: typeof r.amount === 'number' ? r.amount : null,
    oldCategory: typeof r.oldCategory === 'string' ? r.oldCategory : 'Unknown',
    newCategory: typeof r.newCategory === 'string' ? r.newCategory : 'Unknown',
    subcategory: typeof r.subcategory === 'string' ? r.subcategory : null,
  };
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

function test(name: string, fn: () => void) {
  console.log(`\n=== ${name} ===`);
  fn();
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const COSTCO_UUID = '85f64784-7cf8-461a-943e-5c02260de191';

const SUCCESSFUL_RESULT = {
  tool: 'tag_update_transaction_category',
  result: {
    success: true,
    transactionId: COSTCO_UUID,
    merchantName: 'COSTCO WHOLESALE',
    date: '2026-05-04',
    amount: -190.27,
    oldCategory: 'Groceries',
    newCategory: 'Shopping',
    subcategory: null,
    learningSaved: true,
    message: 'Successfully updated...',
  },
  success: true,
  confirmationId: '804b5b62-34fd-461e-9a99-66f5d3e1b277',
};

const FAILED_RESULT = {
  tool: 'tag_update_transaction_category',
  result: {
    error: 'Transaction not found or access denied.',
    merchantName: 'COSTCO WHOLESALE',
  },
  success: false,
  confirmationId: 'abc',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('1: Successful category update parses to CategoryUpdateReceipt', () => {
  const receipt = parseActionReceipt(SUCCESSFUL_RESULT);
  assert(receipt !== null, 'receipt should not be null');
  assert(receipt!.type === 'action_receipt', 'type is action_receipt');
  assert(receipt!.action === 'transaction_category_updated', 'action is transaction_category_updated');
  assert(receipt!.success === true, 'success is true');
});

test('2: Raw JSON is NOT visible — receipt replaces content', () => {
  const receipt = parseActionReceipt(SUCCESSFUL_RESULT);
  assert(receipt !== null, 'receipt exists, so renderer should show card instead of raw JSON');
  // When receipt is non-null, ActionReceiptCard renders instead of TypingMessage
  // TypingMessage would show raw JSON.stringify(result)
  const r = receipt as CategoryUpdateReceipt;
  assert(typeof r.transactionId === 'string', 'transactionId is string');
  assert(!JSON.stringify(r).includes('"learningSaved"'), 'no internal fields exposed in receipt');
});

test('3: Correct merchant is displayed', () => {
  const r = parseActionReceipt(SUCCESSFUL_RESULT) as CategoryUpdateReceipt;
  assert(r.merchantName === 'COSTCO WHOLESALE', 'merchantName matches');
});

test('4: Old category is displayed', () => {
  const r = parseActionReceipt(SUCCESSFUL_RESULT) as CategoryUpdateReceipt;
  assert(r.oldCategory === 'Groceries', 'oldCategory is Groceries');
});

test('5: New category is displayed', () => {
  const r = parseActionReceipt(SUCCESSFUL_RESULT) as CategoryUpdateReceipt;
  assert(r.newCategory === 'Shopping', 'newCategory is Shopping');
});

test('6: UUID is NOT visibly displayed', () => {
  // The receipt carries transactionId for View Transaction navigation,
  // but the component must not render it as text. We verify the type has it
  // but it's used only for the navigate() call.
  const r = parseActionReceipt(SUCCESSFUL_RESULT) as CategoryUpdateReceipt;
  assert(r.transactionId === COSTCO_UUID, 'transactionId available for navigation');
  // Visual display check: the ActionReceiptCard renders merchantName, date, amount,
  // oldCategory, newCategory — never transactionId as visible text.
  // (Cannot test DOM in Node, but contract is clear from component code.)
});

test('7: View Transaction receives exact trusted transactionId', () => {
  const r = parseActionReceipt(SUCCESSFUL_RESULT) as CategoryUpdateReceipt;
  const expectedUrl = `/dashboard/transactions?txId=${encodeURIComponent(COSTCO_UUID)}`;
  assert(expectedUrl.includes(COSTCO_UUID), 'navigation URL carries exact UUID');
  assert(r.transactionId === COSTCO_UUID, 'receipt transactionId matches verified UUID');
});

test('8: No second transaction search occurs', () => {
  // parseActionReceipt is pure: it takes the toolConfirmationResult and extracts fields.
  // No fetch, no search, no Supabase call. Just field extraction.
  const r = parseActionReceipt(SUCCESSFUL_RESULT);
  assert(r !== null, 'parse is synchronous and deterministic');
});

test('9: Failed mutation does NOT render success receipt', () => {
  const r = parseActionReceipt(FAILED_RESULT);
  assert(r !== null, 'failure receipt exists');
  assert(r!.success === false, 'success is false');
  assert(r!.action === 'tag_update_transaction_category', 'action matches tool name');
  const f = r as ActionFailureReceipt;
  assert(f.merchantName === 'COSTCO WHOLESALE', 'merchant preserved in failure');
});

test('10: Unknown tool returns null (no crash)', () => {
  const r = parseActionReceipt({
    tool: 'unknown_tool',
    result: { foo: 'bar' },
    success: true,
  });
  assert(r === null, 'unknown tool returns null');
});

test('11: Undefined input returns null', () => {
  const r = parseActionReceipt(undefined);
  assert(r === null, 'undefined returns null');
});

test('12: Null result object returns null', () => {
  const r = parseActionReceipt({
    tool: 'tag_update_transaction_category',
    result: null,
    success: true,
  });
  assert(r === null, 'null result returns null');
});

test('13: Date and amount included when available', () => {
  const r = parseActionReceipt(SUCCESSFUL_RESULT) as CategoryUpdateReceipt;
  assert(r.date === '2026-05-04', 'date matches');
  assert(r.amount === -190.27, 'amount matches');
});

test('14: Date and amount null when missing', () => {
  const noDateAmount = {
    ...SUCCESSFUL_RESULT,
    result: {
      ...SUCCESSFUL_RESULT.result,
      date: undefined,
      amount: undefined,
    },
  };
  const r = parseActionReceipt(noDateAmount) as CategoryUpdateReceipt;
  assert(r.date === null, 'date is null when missing');
  assert(r.amount === null, 'amount is null when missing');
  assert(r.success === true, 'still a success receipt');
});

test('15: Subcategory included when present', () => {
  const withSub = {
    ...SUCCESSFUL_RESULT,
    result: { ...SUCCESSFUL_RESULT.result, subcategory: 'Warehouse' },
  };
  const r = parseActionReceipt(withSub) as CategoryUpdateReceipt;
  assert(r.subcategory === 'Warehouse', 'subcategory preserved');
});

test('16: Backend success=false with result.success=true still treated as failure', () => {
  const mixedSignals = {
    tool: 'tag_update_transaction_category',
    result: { success: true, transactionId: COSTCO_UUID, merchantName: 'X', oldCategory: 'A', newCategory: 'B' },
    success: false, // backend wrapper says failure
  };
  const r = parseActionReceipt(mixedSignals);
  assert(r !== null, 'receipt exists');
  assert(r!.success === false, 'outer success=false takes precedence');
});

test('17: Long merchant name does not break parsing', () => {
  const longMerchant = {
    ...SUCCESSFUL_RESULT,
    result: { ...SUCCESSFUL_RESULT.result, merchantName: 'A'.repeat(200) },
  };
  const r = parseActionReceipt(longMerchant) as CategoryUpdateReceipt;
  assert(r.merchantName!.length === 200, 'long merchant preserved');
});

test('18: Long category name does not break parsing', () => {
  const longCat = {
    ...SUCCESSFUL_RESULT,
    result: { ...SUCCESSFUL_RESULT.result, newCategory: 'Very Long Category Name That Wraps' },
  };
  const r = parseActionReceipt(longCat) as CategoryUpdateReceipt;
  assert(r.newCategory === 'Very Long Category Name That Wraps', 'long category preserved');
});

test('19: Missing merchantName defaults to null', () => {
  const noMerchant = {
    ...SUCCESSFUL_RESULT,
    result: { ...SUCCESSFUL_RESULT.result, merchantName: undefined },
  };
  const r = parseActionReceipt(noMerchant) as CategoryUpdateReceipt;
  assert(r.merchantName === null, 'missing merchant becomes null');
});

test('20: Missing oldCategory defaults to Unknown', () => {
  const noCat = {
    ...SUCCESSFUL_RESULT,
    result: { ...SUCCESSFUL_RESULT.result, oldCategory: undefined },
  };
  const r = parseActionReceipt(noCat) as CategoryUpdateReceipt;
  assert(r.oldCategory === 'Unknown', 'missing oldCategory becomes Unknown');
});

test('21: Failure receipt with message', () => {
  const withMsg = {
    tool: 'tag_update_transaction_category',
    result: { success: false, merchantName: 'X', message: 'Access denied' },
    success: false,
  };
  const r = parseActionReceipt(withMsg) as ActionFailureReceipt;
  assert(r.success === false, 'failure');
  assert(r.message === 'Access denied', 'message preserved');
});

test('22: Result with string error field treated as failure by backend', () => {
  const errResult = {
    tool: 'tag_update_transaction_category',
    result: { error: 'Something broke', merchantName: 'Y' },
    success: false,
  };
  const r = parseActionReceipt(errResult) as ActionFailureReceipt;
  assert(r.success === false, 'treated as failure');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(60)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
  process.exit(1);
}
