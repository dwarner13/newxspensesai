/**
 * Confirmation UI Regression Tests
 *
 * Validates that PrimeChatV2 and the reusable ConfirmationCard are wired
 * correctly to the confirmation state from useUnifiedChatEngine.
 *
 * Run: npx tsx scripts/test-confirmation-ui.ts
 */

import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

const primeChatV2Src = readFileSync('src/pages/PrimeChatV2/PrimeChatV2.tsx', 'utf8');
const confirmationCardSrc = readFileSync('src/components/chat/ConfirmationCard.tsx', 'utf8');
const engineSrc = readFileSync('src/hooks/useUnifiedChatEngine.ts', 'utf8');
const hookSrc = readFileSync('src/hooks/usePrimeChat.ts', 'utf8');

// ═══════════════════════════════════════════════════════════════════════════
// A: PrimeChatV2 renders confirmation controls
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== A: PrimeChatV2 confirmation wiring ===\n');

assert('A.1 PrimeChatV2 imports ConfirmationCard',
  primeChatV2Src.includes("import { ConfirmationCard }"));

assert('A.2 PrimeChatV2 destructures pendingConfirmation from engine',
  primeChatV2Src.includes('pendingConfirmation,'));

assert('A.3 PrimeChatV2 destructures confirmToolExecution from engine',
  primeChatV2Src.includes('confirmToolExecution,'));

assert('A.4 PrimeChatV2 destructures cancelToolExecution from engine',
  primeChatV2Src.includes('cancelToolExecution,'));

assert('A.5 PrimeChatV2 renders ConfirmationCard when pendingConfirmation exists',
  primeChatV2Src.includes('{pendingConfirmation && (') &&
  primeChatV2Src.includes('<ConfirmationCard'));

assert('A.6 ConfirmationCard receives pending prop',
  primeChatV2Src.includes('pending={pendingConfirmation}'));

assert('A.7 ConfirmationCard receives onConfirm prop',
  primeChatV2Src.includes('onConfirm={confirmToolExecution}'));

assert('A.8 ConfirmationCard receives onCancel prop',
  primeChatV2Src.includes('onCancel={cancelToolExecution}'));

assert('A.9 ConfirmationCard receives disabled prop tied to isStreaming',
  primeChatV2Src.includes('disabled={isStreaming}'));

// ═══════════════════════════════════════════════════════════════════════════
// B: Confirm invokes confirmToolExecution
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== B: Confirm action ===\n');

assert('B.1 ConfirmationCard calls onConfirm with pending on confirm click',
  confirmationCardSrc.includes('await onConfirm(pending)'));

assert('B.2 ConfirmationCard has confirming state to prevent double-click',
  confirmationCardSrc.includes('const [confirming, setConfirming] = useState(false)'));

assert('B.3 handleConfirm guards against double invocation',
  confirmationCardSrc.includes('if (confirming || disabled) return'));

assert('B.4 Confirm button disabled while confirming',
  confirmationCardSrc.includes('disabled={isDisabled}'));

assert('B.5 Confirm button shows processing state',
  confirmationCardSrc.includes('Confirming'));

// ═══════════════════════════════════════════════════════════════════════════
// C: Cancel invokes cancelToolExecution only
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== C: Cancel action ===\n');

assert('C.1 Cancel button calls onCancel',
  confirmationCardSrc.includes('onClick={onCancel}'));

assert('C.2 Cancel does NOT call onConfirm',
  (() => {
    // The Cancel button's onClick should not reference onConfirm
    const cancelBtnIdx = confirmationCardSrc.indexOf('data-testid="confirmation-cancel-btn"');
    const cancelBlock = confirmationCardSrc.substring(cancelBtnIdx, cancelBtnIdx + 200);
    return !cancelBlock.includes('onConfirm');
  })());

assert('C.3 cancelToolExecution clears pendingConfirmation in hook',
  hookSrc.includes('setPendingConfirmation(null)'));

// ═══════════════════════════════════════════════════════════════════════════
// D: Missing pendingConfirmation renders nothing
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== D: Conditional rendering ===\n');

assert('D.1 ConfirmationCard only rendered when pendingConfirmation is truthy',
  primeChatV2Src.includes('{pendingConfirmation && ('));

assert('D.2 ConfirmationCard is always inside a conditional block',
  (() => {
    const idx = primeChatV2Src.indexOf('<ConfirmationCard');
    if (idx < 0) return false;
    const preceding = primeChatV2Src.substring(Math.max(0, idx - 100), idx);
    return preceding.includes('pendingConfirmation &&');
  })());

// ═══════════════════════════════════════════════════════════════════════════
// E: Employee=tag-ai still renders the card
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== E: Employee handoff does not clear card ===\n');

assert('E.1 setPendingConfirmation(null) only in confirm/cancel callbacks, not effects',
  (() => {
    // Find every line with setPendingConfirmation(null) and verify context
    const lines = hookSrc.split('\n');
    const clearLineNums = lines
      .map((l, i) => l.includes('setPendingConfirmation(null)') ? i : -1)
      .filter(i => i >= 0);
    // For each clear line, look backwards for the enclosing function signature
    return clearLineNums.every(lineNum => {
      const preceding = lines.slice(Math.max(0, lineNum - 30), lineNum).join('\n');
      // Should be inside confirmToolExecution or cancelToolExecution, not useEffect
      return (preceding.includes('confirmToolExecution') || preceding.includes('cancelToolExecution')) &&
             !preceding.includes('useEffect(');
    });
  })());

assert('E.2 pendingConfirmation rendering is NOT gated on employee slug',
  (() => {
    // The rendering condition should not check employee slug
    const renderIdx = primeChatV2Src.indexOf('{pendingConfirmation && (');
    const renderBlock = primeChatV2Src.substring(Math.max(0, renderIdx - 200), renderIdx);
    return !renderBlock.includes('prime-boss') || !renderBlock.includes('if (');
  })());

assert('E.3 useUnifiedChatEngine passes pendingConfirmation through without employee filter',
  engineSrc.includes('pendingConfirmation: primeChat.pendingConfirmation'));

// ═══════════════════════════════════════════════════════════════════════════
// F: Layout / mobile
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== F: Layout & mobile ===\n');

assert('F.1 ConfirmationCard uses word-break for long text',
  confirmationCardSrc.includes('wordBreak'));

assert('F.2 ConfirmationCard uses flex-wrap for buttons',
  confirmationCardSrc.includes('flexWrap'));

assert('F.3 ConfirmationCard has no fixed-width that would overflow narrow panels',
  !confirmationCardSrc.includes('minWidth: ') || confirmationCardSrc.includes('minWidth: 0'));

// ═══════════════════════════════════════════════════════════════════════════
// G: Existing PrimeChatV2 behavior unchanged
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== G: Existing behavior preserved ===\n');

assert('G.1 PrimeChatV2 still uses useUnifiedChatEngine',
  primeChatV2Src.includes('useUnifiedChatEngine('));

assert('G.2 PrimeChatV2 still renders messages',
  primeChatV2Src.includes('messages.map') || primeChatV2Src.includes('chatMessages.map'));

assert('G.3 PrimeChatV2 still renders PrimeChatInput',
  primeChatV2Src.includes('<PrimeChatInput'));

assert('G.4 PrimeChatV2 still handles file uploads',
  primeChatV2Src.includes('handleFileSelected'));

assert('G.5 ConfirmationCard is a standalone component (reusable)',
  confirmationCardSrc.includes('export function ConfirmationCard'));

// ═══════════════════════════════════════════════════════════════════════════
// H: Backend pipeline compatibility
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== H: Backend compatibility ===\n');

assert('H.1 ConfirmationCard does NOT import backend modules',
  !confirmationCardSrc.includes('netlify/') &&
  !confirmationCardSrc.includes('toolConfirmation'));

assert('H.2 ConfirmationCard does NOT construct mutation requests',
  !confirmationCardSrc.includes('__CONFIRM_TOOL__') &&
  !confirmationCardSrc.includes('fetch('));

assert('H.3 ConfirmationCard uses PendingConfirmation type from hook',
  confirmationCardSrc.includes("import type { PendingConfirmation }"));

assert('H.4 PrimeChatV2 does NOT directly call backend for confirmation',
  !primeChatV2Src.includes('__CONFIRM_TOOL__'));

assert('H.5 data-testid attributes present for integration testing',
  confirmationCardSrc.includes('data-testid="confirmation-card"') &&
  confirmationCardSrc.includes('data-testid="confirmation-confirm-btn"') &&
  confirmationCardSrc.includes('data-testid="confirmation-cancel-btn"'));

// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n${'='.repeat(60)}`);
console.log(`CONFIRMATION UI: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
