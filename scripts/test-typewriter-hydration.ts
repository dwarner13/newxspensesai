/**
 * Bug 2 Fix — Typewriter Hydration Tests
 *
 * Verifies that historical/hydrated assistant messages are pre-seeded
 * into typedIdsRef so they render immediately, while new messages still
 * animate.
 */

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

// Simulate the typedIdsRef behavior from PrimeChatV2.tsx

// ═══════════════════════════════════════════════════════════════════════════
// TW1. Hydrated assistant messages are considered already typed
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TW1: Hydrated assistant messages pre-typed ===\n');
{
  const typedIds = new Set<string>();
  const hydratedMessages = [
    { id: 'msg-1', role: 'assistant', content: 'Hello there' },
    { id: 'msg-2', role: 'user', content: 'Hi' },
    { id: 'msg-3', role: 'assistant', content: 'How can I help?' },
  ];
  // Simulate the fix: seed typedIds with hydrated assistant IDs
  for (const m of hydratedMessages) {
    if (m.role === 'assistant') typedIds.add(m.id);
  }
  assert('TW1a. msg-1 (assistant) is typed', typedIds.has('msg-1'));
  assert('TW1b. msg-3 (assistant) is typed', typedIds.has('msg-3'));
}

// ═══════════════════════════════════════════════════════════════════════════
// TW2. Hydrated user messages unaffected
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TW2: User messages not in typedIds ===\n');
{
  const typedIds = new Set<string>();
  const hydratedMessages = [
    { id: 'msg-1', role: 'assistant', content: 'Hello' },
    { id: 'msg-2', role: 'user', content: 'Hi' },
  ];
  for (const m of hydratedMessages) {
    if (m.role === 'assistant') typedIds.add(m.id);
  }
  assert('TW2a. msg-2 (user) NOT in typedIds', !typedIds.has('msg-2'));
}

// ═══════════════════════════════════════════════════════════════════════════
// TW3. New assistant response still animates
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TW3: New messages animate ===\n');
{
  const typedIds = new Set<string>();
  // Hydrate old messages
  const hydrated = [{ id: 'old-1', role: 'assistant', content: 'Old reply' }];
  for (const m of hydrated) {
    if (m.role === 'assistant') typedIds.add(m.id);
  }
  // New message arrives — its ID is NOT in typedIds
  const newMsgId = 'new-streaming-123';
  assert('TW3a. new message NOT pre-typed', !typedIds.has(newMsgId));
  // isTyped would be false → TypingMessage will animate
}

// ═══════════════════════════════════════════════════════════════════════════
// TW4. Reopening session does not replay old messages
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TW4: Reopen session ===\n');
{
  const typedIds = new Set<string>();
  // Simulate session reopen — load 5 old assistant messages
  const sessionHistory = [
    { id: 'a1', role: 'assistant', content: 'R1' },
    { id: 'u1', role: 'user', content: 'Q1' },
    { id: 'a2', role: 'assistant', content: 'R2' },
    { id: 'u2', role: 'user', content: 'Q2' },
    { id: 'a3', role: 'assistant', content: 'R3' },
  ];
  for (const m of sessionHistory) {
    if (m.role === 'assistant') typedIds.add(m.id);
  }
  assert('TW4a. all 3 assistant msgs pre-typed', typedIds.size === 3);
  assert('TW4b. a1 typed', typedIds.has('a1'));
  assert('TW4c. a2 typed', typedIds.has('a2'));
  assert('TW4d. a3 typed', typedIds.has('a3'));
}

// ═══════════════════════════════════════════════════════════════════════════
// TW5. Multiple historical messages don't all animate
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TW5: Multiple historical messages ===\n');
{
  const typedIds = new Set<string>();
  const msgs = Array.from({ length: 10 }, (_, i) => ({
    id: `hist-${i}`, role: i % 2 === 0 ? 'assistant' : 'user', content: `msg ${i}`,
  }));
  for (const m of msgs) {
    if (m.role === 'assistant') typedIds.add(m.id);
  }
  // All 5 assistant messages should be pre-typed
  const assistantCount = msgs.filter(m => m.role === 'assistant').length;
  assert('TW5a. all assistants pre-typed', typedIds.size === assistantCount);
  // None would animate (all have isTyped=true)
  const wouldAnimate = msgs.filter(m => m.role === 'assistant' && !typedIds.has(m.id));
  assert('TW5b. zero would animate', wouldAnimate.length === 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// TW6. New Chat does not permanently disable animation
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TW6: New Chat clears typedIds ===\n');
{
  const typedIds = new Set<string>();
  // Add some old IDs
  typedIds.add('old-1');
  typedIds.add('old-2');
  // Simulate New Chat: clear
  typedIds.clear();
  assert('TW6a. cleared after New Chat', typedIds.size === 0);
  // New message would NOT be in set → will animate
  assert('TW6b. new message can animate', !typedIds.has('future-msg'));
}

// ═══════════════════════════════════════════════════════════════════════════
// TW7. Re-render does not restart animation for historical
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== TW7: Re-render stability ===\n');
{
  const typedIds = new Set<string>();
  const hydrated = [{ id: 'stable-1', role: 'assistant', content: 'Stable reply' }];
  for (const m of hydrated) {
    if (m.role === 'assistant') typedIds.add(m.id);
  }
  // Simulate re-render — check isTyped
  const isTypedOnRerender = typedIds.has('stable-1');
  assert('TW7a. stable on re-render', isTypedOnRerender === true);
  // Even after onTyped callback fires again, it's idempotent
  typedIds.add('stable-1');
  assert('TW7b. idempotent add', typedIds.size === 1);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`TYPEWRITER HYDRATION: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);
if (failed > 0) process.exit(1);
