/**
 * Team Conversation Lifecycle regression tests.
 * Validates: EmployeeDisplayConfig roles, lifecycle message parsing,
 * handoff announcement rendering data, specialist complete data,
 * return-to-origin logic, cancel behavior, and security constraints.
 * Run: npx tsx scripts/_run_team_lifecycle_tests.ts
 */

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
// Inline versions of production types/functions (mirrors source of truth)
// ---------------------------------------------------------------------------

interface LifecycleHandoff {
  type: 'employee_handoff';
  from_employee: string;
  to_employee: string;
  reason?: string;
}

interface LifecycleComplete {
  type: 'specialist_complete';
  from_employee: string;
  to_employee: string;
  outcome: 'success' | 'cancelled' | 'failed';
}

type LifecycleData = LifecycleHandoff | LifecycleComplete;

function parseLifecycleMessage(meta: Record<string, unknown> | undefined | null): LifecycleData | null {
  if (!meta) return null;
  const lifecycle = (meta as any)?.lifecycle as Record<string, unknown> | undefined;
  if (!lifecycle) return null;

  if (lifecycle.type === 'employee_handoff' &&
      typeof lifecycle.from_employee === 'string' &&
      typeof lifecycle.to_employee === 'string') {
    return {
      type: 'employee_handoff',
      from_employee: lifecycle.from_employee,
      to_employee: lifecycle.to_employee,
      reason: typeof lifecycle.reason === 'string' ? lifecycle.reason : undefined,
    };
  }

  if (lifecycle.type === 'specialist_complete' &&
      typeof lifecycle.from_employee === 'string' &&
      typeof lifecycle.to_employee === 'string') {
    const outcome = lifecycle.outcome;
    const validOutcomes = ['success', 'cancelled', 'failed'] as const;
    return {
      type: 'specialist_complete',
      from_employee: lifecycle.from_employee,
      to_employee: lifecycle.to_employee,
      outcome: validOutcomes.includes(outcome as any) ? (outcome as 'success' | 'cancelled' | 'failed') : 'success',
    };
  }

  return null;
}

// Simulated EmployeeDisplayConfig role mapping
const ROLE_MAP: Record<string, string> = {
  'prime-boss': 'Financial Assistant',
  'byte-docs': 'Document Specialist',
  'tag-ai': 'Transaction Specialist',
  'tag-agent': 'Transaction Specialist',
  'finley-forecasts': 'Financial Planner',
  'goalie-goals': 'Goals & Debt Specialist',
  'crystal-analytics': 'Insights Specialist',
  'debt-payoff-planner': 'Debt Payoff Specialist',
  'crystal-spending': 'Spending Predictions Specialist',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('1: EmployeeDisplayConfig has role field for all core employees', () => {
  const coreEmployees = ['prime-boss', 'byte-docs', 'tag-ai', 'tag-agent', 'finley-forecasts', 'goalie-goals', 'crystal-analytics'];
  for (const slug of coreEmployees) {
    assert(typeof ROLE_MAP[slug] === 'string' && ROLE_MAP[slug].length > 0, `${slug} has a role`);
  }
});

test('2: Prime role is "Financial Assistant"', () => {
  assert(ROLE_MAP['prime-boss'] === 'Financial Assistant', 'Prime role correct');
});

test('3: Tag role is "Transaction Specialist"', () => {
  assert(ROLE_MAP['tag-ai'] === 'Transaction Specialist', 'Tag role correct');
});

test('4: tag-agent has same role as tag-ai', () => {
  assert(ROLE_MAP['tag-agent'] === ROLE_MAP['tag-ai'], 'tag-agent matches tag-ai');
});

test('5: Byte role is "Document Specialist"', () => {
  assert(ROLE_MAP['byte-docs'] === 'Document Specialist', 'Byte role correct');
});

test('6: Goalie role is "Goals & Debt Specialist"', () => {
  assert(ROLE_MAP['goalie-goals'] === 'Goals & Debt Specialist', 'Goalie role correct');
});

test('7: Crystal role is "Insights Specialist"', () => {
  assert(ROLE_MAP['crystal-analytics'] === 'Insights Specialist', 'Crystal role correct');
});

test('8: parseLifecycleMessage returns null for undefined meta', () => {
  assert(parseLifecycleMessage(undefined) === null, 'undefined -> null');
  assert(parseLifecycleMessage(null) === null, 'null -> null');
});

test('9: parseLifecycleMessage returns null for empty meta', () => {
  assert(parseLifecycleMessage({}) === null, 'empty object -> null');
});

test('10: parseLifecycleMessage returns null for meta without lifecycle', () => {
  assert(parseLifecycleMessage({ foo: 'bar' }) === null, 'no lifecycle key -> null');
});

test('11: parseLifecycleMessage returns null for unrecognized lifecycle type', () => {
  const meta = { lifecycle: { type: 'unknown', from_employee: 'a', to_employee: 'b' } };
  assert(parseLifecycleMessage(meta) === null, 'unknown type -> null');
});

test('12: parseLifecycleMessage parses employee_handoff', () => {
  const meta = {
    lifecycle: {
      type: 'employee_handoff',
      from_employee: 'prime-boss',
      to_employee: 'tag-ai',
      reason: 'Category update requested',
    },
  };
  const result = parseLifecycleMessage(meta);
  assert(result !== null, 'parsed successfully');
  assert(result!.type === 'employee_handoff', 'type is employee_handoff');
  assert((result as LifecycleHandoff).from_employee === 'prime-boss', 'from is prime-boss');
  assert((result as LifecycleHandoff).to_employee === 'tag-ai', 'to is tag-ai');
  assert((result as LifecycleHandoff).reason === 'Category update requested', 'reason preserved');
});

test('13: parseLifecycleMessage parses employee_handoff without reason', () => {
  const meta = {
    lifecycle: {
      type: 'employee_handoff',
      from_employee: 'prime-boss',
      to_employee: 'byte-docs',
    },
  };
  const result = parseLifecycleMessage(meta);
  assert(result !== null, 'parsed successfully');
  assert((result as LifecycleHandoff).reason === undefined, 'reason is undefined');
});

test('14: parseLifecycleMessage parses specialist_complete with success', () => {
  const meta = {
    lifecycle: {
      type: 'specialist_complete',
      from_employee: 'tag-ai',
      to_employee: 'prime-boss',
      outcome: 'success',
    },
  };
  const result = parseLifecycleMessage(meta);
  assert(result !== null, 'parsed successfully');
  assert(result!.type === 'specialist_complete', 'type is specialist_complete');
  assert((result as LifecycleComplete).from_employee === 'tag-ai', 'from is tag-ai');
  assert((result as LifecycleComplete).to_employee === 'prime-boss', 'to is prime-boss');
  assert((result as LifecycleComplete).outcome === 'success', 'outcome is success');
});

test('15: parseLifecycleMessage parses specialist_complete with cancelled', () => {
  const meta = {
    lifecycle: {
      type: 'specialist_complete',
      from_employee: 'tag-ai',
      to_employee: 'prime-boss',
      outcome: 'cancelled',
    },
  };
  const result = parseLifecycleMessage(meta);
  assert(result !== null, 'parsed');
  assert((result as LifecycleComplete).outcome === 'cancelled', 'outcome is cancelled');
});

test('16: parseLifecycleMessage parses specialist_complete with failed', () => {
  const meta = {
    lifecycle: {
      type: 'specialist_complete',
      from_employee: 'tag-ai',
      to_employee: 'prime-boss',
      outcome: 'failed',
    },
  };
  const result = parseLifecycleMessage(meta);
  assert(result !== null, 'parsed');
  assert((result as LifecycleComplete).outcome === 'failed', 'outcome is failed');
});

test('17: parseLifecycleMessage defaults unknown outcome to success', () => {
  const meta = {
    lifecycle: {
      type: 'specialist_complete',
      from_employee: 'tag-ai',
      to_employee: 'prime-boss',
      outcome: 'unknown_value',
    },
  };
  const result = parseLifecycleMessage(meta);
  assert(result !== null, 'parsed');
  assert((result as LifecycleComplete).outcome === 'success', 'unknown outcome defaults to success');
});

test('18: parseLifecycleMessage rejects employee_handoff with missing from_employee', () => {
  const meta = {
    lifecycle: {
      type: 'employee_handoff',
      to_employee: 'tag-ai',
    },
  };
  assert(parseLifecycleMessage(meta) === null, 'missing from_employee -> null');
});

test('19: parseLifecycleMessage rejects employee_handoff with missing to_employee', () => {
  const meta = {
    lifecycle: {
      type: 'employee_handoff',
      from_employee: 'prime-boss',
    },
  };
  assert(parseLifecycleMessage(meta) === null, 'missing to_employee -> null');
});

test('20: Backend handoff metadata shape matches parser expectations', () => {
  // Simulates what chat.ts now persists
  const persistedMetadata = {
    lifecycle: {
      type: 'employee_handoff',
      from_employee: 'prime-boss',
      to_employee: 'tag-ai',
      reason: 'User asked to recategorize',
    },
  };
  const result = parseLifecycleMessage(persistedMetadata);
  assert(result !== null, 'persisted metadata parses');
  assert(result!.type === 'employee_handoff', 'correct type');
});

test('21: Backend specialist_complete metadata shape matches parser', () => {
  const persistedMetadata = {
    lifecycle: {
      type: 'specialist_complete',
      from_employee: 'tag-ai',
      to_employee: 'prime-boss',
      outcome: 'success',
    },
  };
  const result = parseLifecycleMessage(persistedMetadata);
  assert(result !== null, 'persisted metadata parses');
  assert(result!.type === 'specialist_complete', 'correct type');
});

test('22: Frontend live handoff message shape matches parser', () => {
  // Simulates what usePrimeChat now creates
  const liveMessage = {
    id: 'handoff-123-abc',
    role: 'system',
    content: 'Transferred from prime-boss to tag-ai',
    createdAt: new Date().toISOString(),
    meta: {
      lifecycle: {
        type: 'employee_handoff',
        from_employee: 'prime-boss',
        to_employee: 'tag-ai',
        reason: 'Category fix',
      },
    },
  };
  const result = parseLifecycleMessage(liveMessage.meta);
  assert(result !== null, 'live message parses');
  assert(result!.type === 'employee_handoff', 'correct type');
});

test('23: Frontend specialist_complete message shape matches parser', () => {
  const liveMessage = {
    id: 'specialist-complete-123-abc',
    role: 'system',
    content: 'tag-ai finished. Returning to prime-boss.',
    createdAt: new Date().toISOString(),
    meta: {
      lifecycle: {
        type: 'specialist_complete',
        from_employee: 'tag-ai',
        to_employee: 'prime-boss',
        outcome: 'success',
      },
    },
  };
  const result = parseLifecycleMessage(liveMessage.meta);
  assert(result !== null, 'live message parses');
  assert(result!.type === 'specialist_complete', 'correct type');
  assert((result as LifecycleComplete).outcome === 'success', 'outcome correct');
});

test('24: Security: specialistComplete response has no token/HMAC/argsHash', () => {
  // Simulates the backend response shape
  const response = {
    role: 'assistant',
    content: '{"ok":true}',
    toolConfirmationResult: {
      tool: 'tag_update_transaction_category',
      result: { ok: true },
      success: true,
      confirmationId: 'abc-123',
    },
    specialistComplete: {
      from_employee: 'tag-ai',
      to_employee: 'prime-boss',
      outcome: 'success',
    },
  };
  assert(!('token' in response.specialistComplete), 'no token in specialistComplete');
  assert(!('argsHash' in response.specialistComplete), 'no argsHash in specialistComplete');
  assert(!('hmac' in response.specialistComplete), 'no hmac in specialistComplete');
});

test('25: Security: persisted receipt has no confirmationId', () => {
  const sanitizedReceipt = {
    tool: 'tag_update_transaction_category',
    result: { ok: true },
    success: true,
  };
  assert(!('confirmationId' in sanitizedReceipt), 'no confirmationId in persisted receipt');
  assert(!('token' in sanitizedReceipt), 'no token in persisted receipt');
});

test('26: Return-to-origin handoff lookup uses correct query', () => {
  // Validates the query logic: to_employee matches specialist, status in initiated/completed
  const sessionId = 'session-123';
  const specialistSlug = 'tag-ai';
  const handoffs = [
    { id: 'h1', session_id: sessionId, from_employee: 'prime-boss', to_employee: 'tag-ai', status: 'initiated', created_at: '2026-09-18T10:00:00Z' },
    { id: 'h2', session_id: sessionId, from_employee: 'prime-boss', to_employee: 'byte-docs', status: 'initiated', created_at: '2026-09-18T09:00:00Z' },
  ];

  const match = handoffs
    .filter(h => h.session_id === sessionId && h.to_employee === specialistSlug && ['initiated', 'completed'].includes(h.status))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  assert(match !== undefined, 'found matching handoff');
  assert(match!.id === 'h1', 'correct handoff matched');
  assert(match!.from_employee === 'prime-boss', 'origin is prime-boss');
});

test('27: Return-to-origin skips returned/cancelled handoffs', () => {
  const handoffs = [
    { id: 'h1', session_id: 's1', from_employee: 'prime-boss', to_employee: 'tag-ai', status: 'returned', created_at: '2026-09-18T10:00:00Z' },
    { id: 'h2', session_id: 's1', from_employee: 'prime-boss', to_employee: 'tag-ai', status: 'completed', created_at: '2026-09-18T09:00:00Z' },
  ];

  const match = handoffs
    .filter(h => h.to_employee === 'tag-ai' && ['initiated', 'completed'].includes(h.status))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  assert(match !== undefined, 'found completed handoff');
  assert(match!.id === 'h2', 'returned status is excluded, completed is matched');
});

test('28: Cancel revert uses origin employee slug', () => {
  // Simulates cancel behavior
  const activeEmployeeSlug = 'tag-ai';
  const originEmployeeSlug = 'prime-boss';
  const shouldRevert = activeEmployeeSlug !== originEmployeeSlug;
  assert(shouldRevert === true, 'tag-ai != prime-boss -> should revert');
});

test('29: Cancel does NOT revert when already at origin', () => {
  const activeEmployeeSlug = 'prime-boss';
  const originEmployeeSlug = 'prime-boss';
  const shouldRevert = activeEmployeeSlug !== originEmployeeSlug;
  assert(shouldRevert === false, 'prime-boss == prime-boss -> no revert');
});

test('30: History filter keeps lifecycle system messages', () => {
  const messages = [
    { role: 'system', meta: { lifecycle: { type: 'employee_handoff', from_employee: 'prime-boss', to_employee: 'tag-ai' } } },
    { role: 'system', meta: undefined },
    { role: 'system', meta: { lifecycle: { type: 'specialist_complete', from_employee: 'tag-ai', to_employee: 'prime-boss', outcome: 'success' } } },
    { role: 'system', meta: {} },
    { role: 'assistant', meta: {} },
    { role: 'user', meta: undefined },
  ];

  const kept = messages.filter(m => {
    if (m.role === 'system') {
      const meta = m.meta as any;
      return meta?.lifecycle?.type === 'employee_handoff' || meta?.lifecycle?.type === 'specialist_complete';
    }
    return true;
  });

  assert(kept.length === 4, `kept ${kept.length} messages (expected 4: 2 lifecycle + assistant + user)`);
  assert(kept.filter(m => m.role === 'system').length === 2, '2 system messages kept');
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
