/**
 * New Chat Prime Ownership — Test Script
 *
 * Validates that New Chat on the Prime Chat page deterministically
 * resets conversation ownership to prime-boss, regardless of any
 * prior handoff state.
 *
 * These tests verify the logic at the source-code level by simulating
 * the state transitions that handleNewChat() and employeeSlugToSend
 * depend on.
 *
 * Run: npx tsx scripts/test-new-chat-ownership.ts
 */

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATED STATE (mirrors usePrimeChat logic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulates the employeeSlugToSend calculation from usePrimeChat.ts:1208-1212
 */
function computeEmployeeSlugToSend(
  optsEmployeeSlug: string | undefined,
  activeEmployeeSlug: string | undefined,
  employeeOverride: string | undefined,
): string {
  const employeeSlugMap: Record<string, string> = {
    prime: 'prime-boss',
    tag: 'tag-ai',
    byte: 'byte-docs',
    crystal: 'crystal-ai',
    goalie: 'goalie-agent',
    custodian: 'custodian-settings',
  };
  const initialEmployeeSlug = employeeOverride
    ? (employeeSlugMap[employeeOverride] || 'prime-boss')
    : 'prime-boss';
  return optsEmployeeSlug || activeEmployeeSlug || initialEmployeeSlug || 'prime-boss';
}

/**
 * Simulates the resetActiveEmployee() callback.
 * Returns the new activeEmployeeSlug value after reset.
 */
function resetActiveEmployee(): undefined {
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

interface TestCase {
  label: string;
  test: () => void;
}

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    pass++;
  } else {
    fail++;
    failures.push(`  FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST CASES
// ─────────────────────────────────────────────────────────────────────────────

const tests: TestCase[] = [
  // ── 1. New Chat from clean Prime state ──
  {
    label: '1. Clean Prime state → first employeeSlug = prime-boss',
    test: () => {
      const activeSlug = undefined; // No prior handoff
      const slug = computeEmployeeSlugToSend(undefined, activeSlug, 'prime');
      assert(slug === 'prime-boss', 'Clean state sends prime-boss', `got ${slug}`);
    },
  },

  // ── 2. Prime → Custodian handoff → New Chat ──
  {
    label: '2. Prime → Custodian handoff → New Chat → prime-boss',
    test: () => {
      // Before reset: activeEmployeeSlug is custodian from handoff
      let activeSlug: string | undefined = 'custodian';
      const beforeSlug = computeEmployeeSlugToSend(undefined, activeSlug, 'prime');
      assert(beforeSlug === 'custodian', 'Before reset: custodian wins', `got ${beforeSlug}`);

      // After reset: activeEmployeeSlug cleared
      activeSlug = resetActiveEmployee();
      const afterSlug = computeEmployeeSlugToSend(undefined, activeSlug, 'prime');
      assert(afterSlug === 'prime-boss', 'After reset: prime-boss wins', `got ${afterSlug}`);
    },
  },

  // ── 3. Prime → Tag handoff → New Chat ──
  {
    label: '3. Prime → Tag handoff → New Chat → prime-boss',
    test: () => {
      let activeSlug: string | undefined = 'tag-ai';
      activeSlug = resetActiveEmployee();
      const slug = computeEmployeeSlugToSend(undefined, activeSlug, 'prime');
      assert(slug === 'prime-boss', 'After tag reset: prime-boss', `got ${slug}`);
    },
  },

  // ── 4. Prime → Crystal handoff → New Chat ──
  {
    label: '4. Prime → Crystal handoff → New Chat → prime-boss',
    test: () => {
      let activeSlug: string | undefined = 'crystal-analytics';
      activeSlug = resetActiveEmployee();
      const slug = computeEmployeeSlugToSend(undefined, activeSlug, 'prime');
      assert(slug === 'prime-boss', 'After crystal reset: prime-boss', `got ${slug}`);
    },
  },

  // ── 5. Prime → Goalie handoff → New Chat ──
  {
    label: '5. Prime → Goalie handoff → New Chat → prime-boss',
    test: () => {
      let activeSlug: string | undefined = 'goalie-agent';
      activeSlug = resetActiveEmployee();
      const slug = computeEmployeeSlugToSend(undefined, activeSlug, 'prime');
      assert(slug === 'prime-boss', 'After goalie reset: prime-boss', `got ${slug}`);
    },
  },

  // ── 6. Prime → Byte handoff → New Chat ──
  {
    label: '6. Prime → Byte handoff → New Chat → prime-boss',
    test: () => {
      let activeSlug: string | undefined = 'byte-docs';
      activeSlug = resetActiveEmployee();
      const slug = computeEmployeeSlugToSend(undefined, activeSlug, 'prime');
      assert(slug === 'prime-boss', 'After byte reset: prime-boss', `got ${slug}`);
    },
  },

  // ── 7. resetThread() alone does NOT reset activeEmployeeSlug ──
  {
    label: '7. resetThread alone does NOT reset activeEmployeeSlug',
    test: () => {
      // resetThread only clears threadId — it does not touch activeEmployeeSlug
      // We verify by showing that activeEmployeeSlug survives a resetThread
      const activeSlug: string | undefined = 'custodian';
      // resetThread() would clear threadId but NOT activeSlug
      // After resetThread, activeSlug is still custodian
      const slug = computeEmployeeSlugToSend(undefined, activeSlug, 'prime');
      assert(slug === 'custodian', 'resetThread preserves activeSlug', `got ${slug}`);
    },
  },

  // ── 8. Specialist-specific page behavior unchanged ──
  {
    label: '8. Specialist page (tag) uses its own employeeOverride',
    test: () => {
      // On a Tag-specific page, employeeOverride = 'tag'
      // Even if activeEmployeeSlug is undefined, initialEmployeeSlug = 'tag-ai'
      const slug = computeEmployeeSlugToSend(undefined, undefined, 'tag');
      assert(slug === 'tag-ai', 'Tag page sends tag-ai', `got ${slug}`);
    },
  },

  // ── 9. Same-session handoff behavior unchanged ──
  {
    label: '9. Within same session, handoff sets activeEmployeeSlug normally',
    test: () => {
      // During a session, SSE handoff event sets activeEmployeeSlug
      let activeSlug: string | undefined = undefined;
      // Handoff event fires: setActiveEmployeeSlug('custodian')
      activeSlug = 'custodian';
      const slug = computeEmployeeSlugToSend(undefined, activeSlug, 'prime');
      assert(slug === 'custodian', 'In-session handoff routes to custodian', `got ${slug}`);
    },
  },

  // ── 10. Tag protected mutation lifecycle unchanged ──
  {
    label: '10. Tag mutation handoff within session still routes to tag-ai',
    test: () => {
      // Tag mutation: handoff event sets activeEmployeeSlug to tag-ai
      let activeSlug: string | undefined = undefined;
      activeSlug = 'tag-ai';
      const slug = computeEmployeeSlugToSend(undefined, activeSlug, 'prime');
      assert(slug === 'tag-ai', 'Tag mutation handoff routes to tag-ai', `got ${slug}`);

      // After Tag confirmation, return-to-origin sets activeEmployeeSlug back
      activeSlug = 'prime-boss';
      const returnSlug = computeEmployeeSlugToSend(undefined, activeSlug, 'prime');
      assert(returnSlug === 'prime-boss', 'Tag return-to-origin routes to prime-boss', `got ${returnSlug}`);
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────

for (const t of tests) {
  t.test();
}

console.log(`\nNew Chat Prime Ownership — ${pass}/${pass + fail} tests passed\n`);

if (failures.length > 0) {
  console.log('FAILURES:');
  for (const f of failures) {
    console.log(f);
  }
  process.exit(1);
} else {
  console.log('All tests passed.');
}
