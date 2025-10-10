# 📨 Inter-Agent Communication Protocol

**Version**: 1.0  
**Status**: Design Specification  
**Date**: 2025-10-09

---

## 🎯 Purpose

Define a standardized protocol for AI employees to communicate, delegate tasks, and share context within the XspensesAI system.

**Goals**:
- Enable Prime to delegate to specialists
- Preserve context across employee boundaries
- Prevent infinite loops and resource exhaustion
- Track delegation chains for debugging
- Maintain security and user privacy

---

## 📋 Protocol Specification

### Request Envelope

```typescript
interface DelegationRequest {
  // Identity
  request_id: string;           // UUID v4
  origin_employee: string;      // e.g., "prime-boss"
  target_employee: string;      // e.g., "byte-doc"
  user_id: string;              // User making the request
  
  // Session threading
  parent_session_id: string;    // Origin employee's session UUID
  child_session_id?: string | null;  // Target's session (null = create new)
  
  // Task definition
  objective: string;            // Short goal: "Extract receipt data"
  input: string;                // Full message to target employee
  
  // Safety & performance
  constraints: {
    max_tokens: number;         // Default: 1200
    max_depth: number;          // Default: 2
    deadline_ms: number;        // Default: 15000 (15s)
  };
  
  // Context sharing
  context_hints: string[];      // ['receipt', 'tax', 'canadian']
  handoff_data: {
    facts?: string[];           // Relevant user facts
    references?: Array<{        // Links to documents/data
      owner_scope: string;
      source_id: string;
    }>;
    intermediate_results?: any; // Results from previous delegates
  };
  
  // Metadata
  current_depth?: number;       // Delegation depth (0 = user→Prime)
  created_at?: string;          // ISO timestamp
}
```

### Response Envelope

```typescript
interface DelegationResponse {
  // Identity
  request_id: string;           // Matches request
  target_employee: string;      // Confirms who responded
  
  // Results
  summary: string;              // 1-3 sentence overview
  result: string;               // Full assistant-style response
  
  // Artifacts (structured data)
  artifacts?: Array<{
    type: 'table' | 'json' | 'url' | 'id' | 'file';
    value: any;
    label?: string;
  }>;
  
  // Learning
  new_facts?: string[];         // Facts to save to user_memory_facts
  used_sources?: Array<{        // Sources consulted
    owner_scope: string;
    source_id: string;
    relevance?: number;
  }>;
  
  // Metrics
  token_usage: {
    prompt: number;
    completion: number;
    total: number;
  };
  
  // Metadata
  duration_ms?: number;
  child_session_id?: string;    // Where conversation is stored
  confidence?: number;          // 0-100
  requires_followup?: boolean;
  
  // Status
  status: 'success' | 'partial' | 'failed';
  error?: string;
}
```

---

## 🔒 Safety Mechanisms

### 1. Depth Limiting

**Rule**: `current_depth <= MAX_DEPTH` (default: 2)

```typescript
const MAX_DEPTH = 2;

function validateDepth(request: DelegationRequest): void {
  const depth = request.current_depth || 0;
  
  if (depth >= MAX_DEPTH) {
    throw new Error(
      `Delegation depth limit reached (${depth}/${MAX_DEPTH}). ` +
      `Cannot delegate further. Return results to parent.`
    );
  }
}
```

**Example**:
```
User → Prime (depth 0)
  └→ Byte (depth 1) ✅ Allowed
      └→ Tag (depth 2) ❌ BLOCKED
```

### 2. Fan-Out Limiting

**Rule**: `concurrent_delegates <= MAX_FAN_OUT` (default: 3)

```typescript
const MAX_FAN_OUT = 3;

function validateFanOut(employees: string[]): void {
  if (employees.length > MAX_FAN_OUT) {
    throw new Error(
      `Too many concurrent delegates (${employees.length}/${MAX_FAN_OUT}). ` +
      `Choose top ${MAX_FAN_OUT} most relevant employees.`
    );
  }
}
```

**Example**:
```
Prime → [Byte, Tag, Crystal] ✅ 3 employees (allowed)
Prime → [Byte, Tag, Crystal, Ledger] ❌ 4 employees (blocked)
```

### 3. Cycle Detection

**Rule**: Detect `(origin, target, objective_hash)` loops

```typescript
const seen = new Set<string>();

function detectCycle(request: DelegationRequest): void {
  const key = `${request.origin_employee}→${request.target_employee}:${hash(request.objective)}`;
  
  if (seen.has(key)) {
    throw new Error(
      `Cycle detected: ${request.origin_employee} → ${request.target_employee} ` +
      `with same objective already in progress.`
    );
  }
  
  seen.add(key);
}

function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').substring(0, 8);
}
```

**Example**:
```
Prime → Byte [objective: "extract receipt"] ✅
Prime → Byte [objective: "extract receipt"] ❌ CYCLE (same objective)
Prime → Byte [objective: "analyze document"] ✅ (different objective)
```

### 4. Timeout Protection

**Rule**: Each delegation must complete within deadline

```typescript
async function callWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Delegation timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    )
  ]);
}

// Usage
const result = await callWithTimeout(
  callEmployee(request),
  request.constraints.deadline_ms
);
```

### 5. Token Budget

**Rule**: Each delegation has a token budget

```typescript
function validateTokenBudget(request: DelegationRequest, estimated: number): void {
  if (estimated > request.constraints.max_tokens) {
    throw new Error(
      `Estimated tokens (${estimated}) exceeds budget (${request.constraints.max_tokens}). ` +
      `Simplify task or increase budget.`
    );
  }
}
```

---

## 🔀 Delegation Modes

### Mode 1: Simple Delegation (1 employee)

```typescript
const request: DelegationRequest = {
  request_id: generateUUID(),
  origin_employee: 'prime-boss',
  target_employee: 'byte-doc',
  user_id: ctx.userId,
  parent_session_id: ctx.sessionId,
  objective: 'Extract receipt data',
  input: 'User uploaded receipt.jpg - extract all fields',
  constraints: { max_tokens: 1200, max_depth: 2, deadline_ms: 15000 },
  context_hints: ['receipt', 'ocr'],
  handoff_data: {}
};

const response = await callEmployee(request);
```

### Mode 2: Sequential Chain (A→B→C)

```typescript
// Step 1: Byte extracts
const byteResult = await callEmployee({
  ...baseRequest,
  target_employee: 'byte-doc',
  objective: 'Extract receipt data'
});

// Step 2: Tag categorizes (using Byte's output)
const tagResult = await callEmployee({
  ...baseRequest,
  target_employee: 'tag-ai',
  objective: 'Categorize extracted transactions',
  input: JSON.stringify(byteResult.artifacts),
  handoff_data: {
    intermediate_results: byteResult
  }
});

// Step 3: Prime merges
const finalResult = mergeResults([byteResult, tagResult]);
```

### Mode 3: Parallel Fan-Out ([A,B,C])

```typescript
const tasks = [
  { employee: 'crystal-analytics', objective: 'Analyze spending patterns' },
  { employee: 'tag-ai', objective: 'Review categorization accuracy' },
  { employee: 'ledger-tax', objective: 'Identify deductions' }
];

const results = await Promise.all(
  tasks.map(task =>
    callEmployee({
      ...baseRequest,
      target_employee: task.employee,
      objective: task.objective,
      input: userInput
    })
  )
);

const aggregated = synthesizeResults(results);
```

---

## 📊 Request Headers (HTTP)

When making internal employee-to-employee calls:

```http
POST /.netlify/functions/chat-internal
Content-Type: application/json
X-Agent-Request-ID: 550e8400-e29b-41d4-a716-446655440000
X-Agent-Origin: prime-boss
X-Agent-Depth: 1
X-Agent-Parent-Session: uuid-of-prime-session
Authorization: Bearer <service-role-token>
```

**Note**: Use service role, NOT user tokens, to prevent user impersonation.

---

## 🧪 Testing Protocol Compliance

### Test 1: Depth Limit

```typescript
// Should succeed (depth 1)
await callEmployee({
  current_depth: 0,
  target_employee: 'byte-doc',
  ...
});

// Should fail (depth 2)
await callEmployee({
  current_depth: 2,
  target_employee: 'byte-doc',
  ...
});
// Expected: Error("Max delegation depth exceeded")
```

### Test 2: Cycle Detection

```typescript
// First call
await callEmployee({
  origin: 'prime',
  target: 'byte',
  objective: 'extract receipt',
  ...
});

// Second call (same objective)
await callEmployee({
  origin: 'prime',
  target: 'byte',
  objective: 'extract receipt',  // Same!
  ...
});
// Expected: Error("Cycle detected")
```

### Test 3: Timeout

```typescript
// Simulate slow employee (mock OpenAI with 20s delay)
await callEmployee({
  constraints: { deadline_ms: 5000 },
  ...
});
// Expected: Error("Delegation timeout after 5000ms")
```

---

## 🔐 Security Considerations

### 1. User Isolation

**Rule**: Delegates can only access delegator's user data

```typescript
// Validate user_id matches in child session
if (childSession.user_id !== request.user_id) {
  throw new Error('User ID mismatch - security violation');
}
```

### 2. Tool Authorization

**Rule**: Target employee must have tool in `tools_allowed`

```typescript
function validateToolUsage(employee: string, toolName: string): void {
  const profile = getEmployee(employee);
  
  if (!profile.tools_allowed.includes(toolName)) {
    throw new Error(
      `Employee ${employee} not authorized to use tool ${toolName}`
    );
  }
}
```

### 3. PII Handling

**Rule**: Redact PII before delegation (same as user messages)

```typescript
// Always redact before calling target employee
const { redacted, tokens } = redact(request.input);

const response = await callEmployee({
  ...request,
  input: redacted  // Use redacted version
});
```

### 4. Audit Trail

**Rule**: Log all delegations for security audit

```sql
CREATE TABLE delegation_audit_log (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL,
  origin_employee TEXT,
  target_employee TEXT,
  user_id TEXT,
  objective TEXT,
  success BOOLEAN,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 📐 Protocol Versioning

**Current**: v1.0

**Changes require**:
- Version bump in request envelope
- Backward compatibility for 2 versions
- Migration guide for employees

**Future versions might add**:
- Streaming delegation responses
- Parallel handoff to multiple targets
- Conditional delegation (if-then logic)
- Delegation cancellation

---

## ✅ Compliance Checklist

Before deploying inter-agent protocol:

- [ ] Max depth enforced (≤ 2)
- [ ] Fan-out enforced (≤ 3)
- [ ] Cycle detection active
- [ ] Timeouts configured
- [ ] Token budgets set
- [ ] PII redaction applied
- [ ] Audit logging enabled
- [ ] User isolation verified
- [ ] Tool authorization checked
- [ ] Error handling complete

---

**Protocol Specification Complete** | Ready for Implementation

