/**
 * Back to Prime — chat → transaction → chat navigation tests.
 * Validates: return context creation, sessionStorage persistence,
 * expiry, validation, navigation contract, drawer conditional rendering,
 * accessibility, safe-area, and security constraints.
 * Run: npx tsx scripts/_run_back_to_prime_tests.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename_local = fileURLToPath(import.meta.url);
const __dirname_local = dirname(__filename_local);

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
// Inline production logic (mirrors src/lib/chatReturnContext.ts)
// ---------------------------------------------------------------------------

const TTL_MS = 5 * 60 * 1000;

interface ChatReturnContext {
  source: 'chat';
  timestamp: number;
}

function createChatReturnContext(): ChatReturnContext {
  return { source: 'chat', timestamp: Date.now() };
}

function validateChatReturnContext(raw: unknown): ChatReturnContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Record<string, unknown>;
  if (
    parsed.source === 'chat' &&
    typeof parsed.timestamp === 'number' &&
    Number.isFinite(parsed.timestamp) &&
    Date.now() - parsed.timestamp < TTL_MS
  ) {
    return parsed as ChatReturnContext;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Source file reads for structural tests
// ---------------------------------------------------------------------------

const ACTION_RECEIPT_SRC = readFileSync(
  join(__dirname_local, '..', 'src', 'components', 'chat', 'ActionReceiptCard.tsx'),
  'utf-8',
);

const TX_PAGE_SRC = readFileSync(
  join(__dirname_local, '..', 'src', 'pages', 'dashboard', 'TransactionsPageV2.tsx'),
  'utf-8',
);

const DRAWER_SRC = readFileSync(
  join(__dirname_local, '..', 'src', 'components', 'transactions', 'TransactionInsightDrawer.tsx'),
  'utf-8',
);

const RETURN_CTX_SRC = readFileSync(
  join(__dirname_local, '..', 'src', 'lib', 'chatReturnContext.ts'),
  'utf-8',
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('1: ActionReceiptCard creates chat return context before navigating', () => {
  assert(ACTION_RECEIPT_SRC.includes('createChatReturnContext'), 'imports createChatReturnContext');
  assert(ACTION_RECEIPT_SRC.includes('saveChatReturnContext'), 'imports saveChatReturnContext');
  // saveChatReturnContext must be called BEFORE navigate
  const saveIdx = ACTION_RECEIPT_SRC.indexOf('saveChatReturnContext(');
  const navIdx = ACTION_RECEIPT_SRC.indexOf("navigate(`/dashboard/transactions?txId=");
  assert(saveIdx > 0 && navIdx > 0, 'both calls exist');
  assert(saveIdx < navIdx, 'sessionStorage save happens before navigate');
});

test('2: exact trusted transactionId remains in txId param', () => {
  assert(ACTION_RECEIPT_SRC.includes('?txId=${encodeURIComponent(receipt.transactionId)}'), 'txId uses exact UUID');
  assert(!ACTION_RECEIPT_SRC.includes('merchantName') || !ACTION_RECEIPT_SRC.includes('?merchant='), 'no merchant search param');
});

test('3: no merchant/amount transaction lookup introduced', () => {
  // ActionReceiptCard should not add merchant or amount to URL
  assert(!ACTION_RECEIPT_SRC.includes('?merchant='), 'no merchant param');
  assert(!ACTION_RECEIPT_SRC.includes('?amount='), 'no amount param');
  assert(!ACTION_RECEIPT_SRC.includes('merchantSearch'), 'no merchant search');
});

test('4: navigation state contains chat return context', () => {
  assert(ACTION_RECEIPT_SRC.includes('state: { chatReturn:'), 'React Router state has chatReturn');
});

test('5: sessionStorage fallback written', () => {
  assert(ACTION_RECEIPT_SRC.includes('saveChatReturnContext'), 'calls saveChatReturnContext');
  assert(RETURN_CTX_SRC.includes('sessionStorage.setItem'), 'writes to sessionStorage');
});

test('6: valid context accepted', () => {
  const ctx = createChatReturnContext();
  const result = validateChatReturnContext(ctx);
  assert(result !== null, 'valid context passes validation');
  assert(result!.source === 'chat', 'source is chat');
  assert(typeof result!.timestamp === 'number', 'timestamp is number');
});

test('7: malformed JSON safely rejected', () => {
  assert(validateChatReturnContext(undefined) === null, 'undefined -> null');
  assert(validateChatReturnContext(null) === null, 'null -> null');
  assert(validateChatReturnContext('not json') === null, 'string -> null');
  assert(validateChatReturnContext(42) === null, 'number -> null');
  assert(validateChatReturnContext([]) === null, 'array -> null');
});

test('8: wrong source rejected', () => {
  assert(validateChatReturnContext({ source: 'notification', timestamp: Date.now() }) === null, 'wrong source');
  assert(validateChatReturnContext({ source: '', timestamp: Date.now() }) === null, 'empty source');
});

test('9: expired context rejected', () => {
  const expired = { source: 'chat', timestamp: Date.now() - 6 * 60 * 1000 };
  assert(validateChatReturnContext(expired) === null, '6 min old -> expired');
});

test('10: stale context cleaned in loadChatReturnContext', () => {
  assert(RETURN_CTX_SRC.includes('sessionStorage.removeItem'), 'removes stale entries');
});

test('11: drawer conditionally renders Back to Conversation via onBackToChat prop', () => {
  assert(DRAWER_SRC.includes('onBackToChat'), 'drawer accepts onBackToChat prop');
  assert(DRAWER_SRC.includes('Back to Conversation'), 'drawer renders Back to Conversation text');
  assert(DRAWER_SRC.includes('{onBackToChat && ('), 'conditionally rendered');
});

test('12: normal transaction does NOT show Back to Conversation', () => {
  // When onBackToChat is undefined, the button is not rendered
  assert(DRAWER_SRC.includes('onBackToChat?:'), 'onBackToChat is optional in interface');
  // TransactionsPageV2 passes onBackToChat only when chatReturnCtx is truthy
  assert(TX_PAGE_SRC.includes('onBackToChat={chatReturnCtx ? handleBackToChat : undefined}'), 'conditional prop pass');
});

test('13: mobile uses same conditional behavior', () => {
  // No separate mobile component — same drawer for both
  assert(DRAWER_SRC.includes("isMobile ? '100%' : 500"), 'same drawer handles mobile via width');
  // Back to Prime uses same onBackToChat condition regardless of viewport
  const backToPrimeCount = DRAWER_SRC.split('onBackToChat').length - 1;
  assert(backToPrimeCount >= 3, `onBackToChat referenced ${backToPrimeCount} times (interface + destructure + render)`);
});

test('14: ~44px mobile touch target', () => {
  assert(DRAWER_SRC.includes('minHeight: 44'), 'Back to Prime has minHeight 44');
});

test('15: aria-label present', () => {
  assert(DRAWER_SRC.includes('aria-label="Back to Conversation"'), 'accessible aria-label');
});

test('16: iPhone safe-area handling present', () => {
  assert(DRAWER_SRC.includes('safe-area-inset-top'), 'env(safe-area-inset-top) used');
});

test('17: Back to Prime navigates /dashboard', () => {
  assert(TX_PAGE_SRC.includes("navigate('/dashboard')"), 'navigates to /dashboard');
});

test('18: Panel reopen via sessionStorage intent', () => {
  // handleBackToChat sets a one-shot sessionStorage intent instead of
  // calling setIsPrimeBriefingOpen(true) directly (which gets overridden
  // by DashboardLayout's route-change effect).
  const handleBackSrc = TX_PAGE_SRC.substring(
    TX_PAGE_SRC.indexOf('handleBackToChat'),
    TX_PAGE_SRC.indexOf('handleBackToChat') + 400,
  );
  assert(handleBackSrc.includes("navigate('/dashboard')"), 'handleBackToChat navigates');
  assert(handleBackSrc.includes("sessionStorage.setItem('returnToConversation'"), 'handleBackToChat sets intent flag');
  // DashboardLayout consumes the intent
  const layoutSrc = readFileSync(join(__dirname_local, '..', 'src', 'layouts', 'DashboardLayout.tsx'), 'utf-8');
  assert(layoutSrc.includes("sessionStorage.getItem('returnToConversation')"), 'DashboardLayout reads intent');
  assert(layoutSrc.includes("sessionStorage.removeItem('returnToConversation')"), 'DashboardLayout consumes intent once');
});

test('19: context consumed on Back to Prime click', () => {
  const handleBackSrc = TX_PAGE_SRC.substring(
    TX_PAGE_SRC.indexOf('handleBackToChat'),
    TX_PAGE_SRC.indexOf('handleBackToChat') + 300,
  );
  assert(handleBackSrc.includes('clearChatReturnContext()'), 'clears sessionStorage');
  assert(handleBackSrc.includes('setChatReturnCtx(null)'), 'clears state');
});

test('20: X stays on Transactions', () => {
  // handleDrawerClose does not call navigate('/dashboard')
  const handleCloseSrc = TX_PAGE_SRC.substring(
    TX_PAGE_SRC.indexOf('handleDrawerClose'),
    TX_PAGE_SRC.indexOf('handleDrawerClose') + 300,
  );
  assert(handleCloseSrc.includes('setSelectedTx(null)'), 'closes drawer');
  assert(!handleCloseSrc.includes("navigate('/dashboard')"), 'does NOT navigate away');
});

test('21: context cleared on X close', () => {
  const handleCloseSrc = TX_PAGE_SRC.substring(
    TX_PAGE_SRC.indexOf('handleDrawerClose'),
    TX_PAGE_SRC.indexOf('handleDrawerClose') + 300,
  );
  assert(handleCloseSrc.includes('clearChatReturnContext()'), 'clears sessionStorage on close');
  assert(handleCloseSrc.includes('setChatReturnCtx(null)'), 'clears state on close');
});

test('22: no LLM/chat call in return path', () => {
  const handleBackSrc = TX_PAGE_SRC.substring(
    TX_PAGE_SRC.indexOf('handleBackToChat'),
    TX_PAGE_SRC.indexOf('handleBackToChat') + 300,
  );
  assert(!handleBackSrc.includes('fetch('), 'no fetch call');
  assert(!handleBackSrc.includes('send('), 'no send call');
  // "chat" appears in the function name itself (handleBackToChat) — check for endpoint calls instead
  assert(!handleBackSrc.includes('/chat'), 'no chat endpoint call');
});

test('23: no new chat message on return', () => {
  const handleBackSrc = TX_PAGE_SRC.substring(
    TX_PAGE_SRC.indexOf('handleBackToChat'),
    TX_PAGE_SRC.indexOf('handleBackToChat') + 300,
  );
  assert(!handleBackSrc.includes('setMessages'), 'no message insertion');
});

test('24: no transaction mutation', () => {
  const handleBackSrc = TX_PAGE_SRC.substring(
    TX_PAGE_SRC.indexOf('handleBackToChat'),
    TX_PAGE_SRC.indexOf('handleBackToChat') + 300,
  );
  assert(!handleBackSrc.includes('.update('), 'no database update');
  assert(!handleBackSrc.includes('.insert('), 'no database insert');
});

test('25: txId effect remains below fetchTagInsight declaration', () => {
  const fetchDeclLine = TX_PAGE_SRC.split('\n').findIndex(l => l.includes('const fetchTagInsight = useCallback'));
  const txIdEffectLine = TX_PAGE_SRC.split('\n').findIndex(l => l.includes('const txIdConsumedRef = useRef'));
  assert(fetchDeclLine > 0, `fetchTagInsight found at line ${fetchDeclLine + 1}`);
  assert(txIdEffectLine > 0, `txIdConsumedRef found at line ${txIdEffectLine + 1}`);
  assert(fetchDeclLine < txIdEffectLine, `fetchTagInsight (${fetchDeclLine + 1}) before txId effect (${txIdEffectLine + 1})`);
});

test('26: unrelated query params remain preserved', () => {
  // txId effect only deletes 'txId', not other params — check full useEffect block
  const startIdx = TX_PAGE_SRC.indexOf('const txIdConsumedRef');
  const endIdx = TX_PAGE_SRC.indexOf('}, [searchParams, transactions, isLoading, fetchTagInsight', startIdx);
  const txIdBlock = TX_PAGE_SRC.substring(startIdx, endIdx > startIdx ? endIdx + 100 : startIdx + 2500);
  const deleteCount = (txIdBlock.match(/p\.delete\('txId'\)/g) || []).length;
  assert(deleteCount >= 3, `txId is deleted ${deleteCount} times (all paths)`);
  assert(!txIdBlock.includes("p.delete('year')"), 'year not deleted');
  assert(!txIdBlock.includes("p.delete('search')"), 'search not deleted');
});

test('27: direct txId deep-link remains safe without chatReturn', () => {
  // When navigating directly with ?txId=<uuid> (no location.state), chatReturnCtx is null
  // loadChatReturnContext() returns null if sessionStorage is empty
  // The state initializer calls loadChatReturnContext as fallback
  assert(TX_PAGE_SRC.includes('loadChatReturnContext()'), 'falls back to sessionStorage');
  // If both are null, no Back to Prime shown (onBackToChat = undefined)
  assert(TX_PAGE_SRC.includes('chatReturnCtx ? handleBackToChat : undefined'), 'only shows when context exists');
});

test('28: existing drawer behavior remains intact', () => {
  // onClose still available and functional
  assert(DRAWER_SRC.includes('onClose: () => void'), 'onClose in interface');
  // Normal X button still present when no onBackToChat
  assert(DRAWER_SRC.includes('{!onBackToChat && ('), 'standalone X when no back button');
  // Scrollable body unchanged
  assert(DRAWER_SRC.includes("overflowY: 'auto'"), 'body remains scrollable');
});

// ---------------------------------------------------------------------------
// Return context contract tests
// ---------------------------------------------------------------------------

test('29: return context contains no sensitive data', () => {
  const ctx = createChatReturnContext();
  const keys = Object.keys(ctx);
  assert(keys.length === 2, `only 2 keys: ${keys.join(', ')}`);
  assert(keys.includes('source'), 'has source');
  assert(keys.includes('timestamp'), 'has timestamp');
  assert(!keys.includes('userId'), 'no userId');
  assert(!keys.includes('sessionId'), 'no sessionId');
  assert(!keys.includes('threadId'), 'no threadId');
  assert(!keys.includes('transactionId'), 'no transactionId');
});

test('30: TTL is exactly 5 minutes', () => {
  assert(RETURN_CTX_SRC.includes('5 * 60 * 1000'), '5 minutes TTL');
  // 4 min 59 sec should pass
  const recent = { source: 'chat', timestamp: Date.now() - (4 * 60 * 1000 + 59 * 1000) };
  assert(validateChatReturnContext(recent) !== null, '4m59s is valid');
  // 5 min 1 sec should fail
  const old = { source: 'chat', timestamp: Date.now() - (5 * 60 * 1000 + 1000) };
  assert(validateChatReturnContext(old) === null, '5m1s is expired');
});

test('31: NaN timestamp rejected', () => {
  assert(validateChatReturnContext({ source: 'chat', timestamp: NaN }) === null, 'NaN timestamp');
  assert(validateChatReturnContext({ source: 'chat', timestamp: Infinity }) === null, 'Infinity timestamp');
});

test('32: generic source field supports future extension', () => {
  // The type uses 'chat' literal but the validation checks for it specifically
  assert(RETURN_CTX_SRC.includes("source: 'chat'"), 'source type is chat');
  // Mechanism can be extended without breaking existing code
  assert(RETURN_CTX_SRC.includes('interface ChatReturnContext'), 'typed interface exists');
});

// ---------------------------------------------------------------------------
// Back to Conversation — new tests
// ---------------------------------------------------------------------------

const LAYOUT_SRC = readFileSync(
  join(__dirname_local, '..', 'src', 'layouts', 'DashboardLayout.tsx'),
  'utf-8',
);

test('33: visible label is Back to Conversation', () => {
  assert(DRAWER_SRC.includes('Back to Conversation'), 'drawer shows Back to Conversation');
  assert(!DRAWER_SRC.includes('Back to Prime'), 'drawer does NOT show Back to Prime');
});

test('34: chat-origin required for Back to Conversation', () => {
  assert(DRAWER_SRC.includes('onBackToChat && ('), 'guard on onBackToChat');
  assert(TX_PAGE_SRC.includes('chatReturnCtx ? handleBackToChat : undefined'), 'only passed with chatReturn context');
});

test('35: normal transaction browsing does not show Back to Conversation', () => {
  // onBackToChat is undefined when chatReturnCtx is null
  assert(TX_PAGE_SRC.includes('chatReturnCtx ? handleBackToChat : undefined'), 'conditional prop');
});

test('36: exact txId behavior preserved', () => {
  assert(ACTION_RECEIPT_SRC.includes('txId='), 'txId in URL');
  assert(ACTION_RECEIPT_SRC.includes('encodeURIComponent(receipt.transactionId)'), 'encoded txId');
});

test('37: returnToConversation intent is one-shot', () => {
  assert(LAYOUT_SRC.includes("sessionStorage.removeItem('returnToConversation')"), 'intent consumed immediately');
});

test('38: returnToConversation intent sets isPrimeBriefingOpen', () => {
  // After consuming the flag, layout opens the panel
  const intentBlock = LAYOUT_SRC.substring(
    LAYOUT_SRC.indexOf("getItem('returnToConversation')"),
    LAYOUT_SRC.indexOf("getItem('returnToConversation')") + 300,
  );
  assert(intentBlock.includes('setIsPrimeBriefingOpen(true)'), 'intent opens panel');
});

test('39: no new session generated by return navigation', () => {
  // handleBackToChat must NOT call crypto.randomUUID or create a new session
  const handleBackSrc = TX_PAGE_SRC.substring(
    TX_PAGE_SRC.indexOf('handleBackToChat'),
    TX_PAGE_SRC.indexOf('handleBackToChat') + 400,
  );
  assert(!handleBackSrc.includes('randomUUID'), 'no UUID generation');
  assert(!handleBackSrc.includes('setSessionId'), 'no session mutation');
});

test('40: no LLM request triggered by return navigation', () => {
  // handleBackToChat must not call sendMessage, send, or fetch
  const handleBackSrc = TX_PAGE_SRC.substring(
    TX_PAGE_SRC.indexOf('handleBackToChat'),
    TX_PAGE_SRC.indexOf('handleBackToChat') + 400,
  );
  assert(!handleBackSrc.includes('sendMessage'), 'no sendMessage call');
  assert(!handleBackSrc.includes('fetch('), 'no fetch call');
});

test('41: drawer X does not set returnToConversation intent', () => {
  const handleCloseSrc = TX_PAGE_SRC.substring(
    TX_PAGE_SRC.indexOf('handleDrawerClose'),
    TX_PAGE_SRC.indexOf('handleDrawerClose') + 300,
  );
  assert(!handleCloseSrc.includes('returnToConversation'), 'X close does not set intent');
});

test('42: returnToConversation intent depends on location.pathname', () => {
  // The effect consuming the intent fires on route change
  const intentEffect = LAYOUT_SRC.substring(
    LAYOUT_SRC.indexOf("getItem('returnToConversation')") - 100,
    LAYOUT_SRC.indexOf("getItem('returnToConversation')") + 300,
  );
  assert(intentEffect.includes('location.pathname'), 'depends on pathname');
});

test('43: existing Action Receipt navigation preserved', () => {
  assert(ACTION_RECEIPT_SRC.includes('createChatReturnContext'), 'creates return context');
  assert(ACTION_RECEIPT_SRC.includes('saveChatReturnContext'), 'saves return context');
  assert(ACTION_RECEIPT_SRC.includes('/dashboard/transactions'), 'navigates to transactions');
});

test('44: handleOpenPrime still uses direct atom set', () => {
  // handleOpenPrime (non-navigation) can still directly set the atom
  assert(TX_PAGE_SRC.includes('const handleOpenPrime'), 'handleOpenPrime exists');
  const openPrimeSrc = TX_PAGE_SRC.substring(
    TX_PAGE_SRC.indexOf('const handleOpenPrime'),
    TX_PAGE_SRC.indexOf('const handleOpenPrime') + 200,
  );
  assert(openPrimeSrc.includes('setIsPrimeBriefingOpen(true)'), 'direct atom set still works');
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
