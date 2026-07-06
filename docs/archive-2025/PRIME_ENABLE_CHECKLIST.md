# Prime Delegation Enable Checklist
**Date**: October 10, 2025  
**Purpose**: Verify Prime's delegation setup

## 1. Delegate Tool Registration

### ✅ Tool Code Exists
- **File**: `chat_runtime/tools/delegate.ts`
- **Status**: ✅ **Created** (stub)
- **Export**: `export { delegateTool }`
- **Handler**: `async function delegateTool(params: DelegateParams): Promise<DelegateResponse>`

### ✅ Tool Registered in Registry
- **Table**: `tools_registry`
- **SQL**: 
  ```sql
  INSERT INTO public.tools_registry (name, description, handler_path, auth_scope, config)
  VALUES (
    'delegate',
    'Delegate task to another AI employee',
    'chat_runtime/tools/delegate.ts',
    'service',
    '{"max_depth": 2, "max_fan_out": 3}'::jsonb
  );
  ```
- **Status**: ✅ **Defined** (in migration `000_centralized_chat_runtime.sql`)

### ✅ Tool Parameters Defined
```typescript
interface DelegateParams {
  targetEmployee: string;        // e.g., 'byte-doc', 'ledger-tax'
  objective: string;              // What to ask the target employee
  context?: string;               // Optional context to pass
  maxDepth?: number;              // Default: 2
  timeoutMs?: number;             // Default: 15000
}
```

## 2. Prime Employee Configuration

### ✅ Prime Profile in Database
- **Table**: `employee_profiles`
- **Required Row**:
  ```sql
  INSERT INTO public.employee_profiles (slug, title, system_prompt, capabilities, tools_allowed)
  VALUES (
    'prime-boss',
    'Prime - CEO & Orchestrator',
    '<FULL SYSTEM PROMPT FROM docs/PRIME_PROMPT.md>',
    ARRAY['routing', 'orchestration', 'strategy', 'delegation', 'multi-agent'],
    ARRAY['delegate']  -- <-- CRITICAL: Must include 'delegate'
  );
  ```
- **Status**: ✅ **Defined** (in migration)

### ✅ Prime's tools_allowed Includes "delegate"
- **Verification Query**:
  ```sql
  SELECT slug, tools_allowed
  FROM public.employee_profiles
  WHERE slug = 'prime-boss';
  ```
- **Expected**: `tools_allowed` contains `'delegate'`
- **Status**: ✅ **Configured**

## 3. Agent Bridge (Server-Side Calling)

### ✅ Agent Bridge Module Exists
- **File**: `chat_runtime/internal/agentBridge.ts`
- **Status**: ✅ **Created** (stub)
- **Key Function**: `async function callEmployee(params: AgentBridgeParams): Promise<AgentBridgeResponse>`
- **Features**:
  - Cycle detection (by `origin + target + objective`)
  - Depth limiting (max depth = 2)
  - Timeout enforcement (default 15s)
  - Headers: `x-agent-depth`, `x-request-id`

### ✅ Agent Bridge Parameters
```typescript
interface AgentBridgeParams {
  employeeSlug: string;           // Target employee
  message: string;                // Message to send
  userId: string;                 // User context
  parentSessionId: string;        // For threading
  depth?: number;                 // Current depth
  requestId?: string;             // For cycle detection
  originEmployee?: string;        // Originating employee
}
```

## 4. Tool-Calling Loop in Runtime

### ✅ Tool Call Detection
- **File**: `netlify/functions/chat.ts` (or `chat_runtime/router.ts`)
- **Logic**:
  1. Model generates response with `tool_calls`
  2. Runtime detects `tool_calls` in OpenAI response
  3. For each tool call:
     - Lookup tool in `tools_registry`
     - Validate tool is in `employee.tools_allowed`
     - Execute tool (e.g., `delegate`)
     - Send `tool_result` back to model
  4. Model continues with tool results in context
- **Status**: ⚠️ **Needs Implementation** (currently chat.ts streams directly without tool loop)

### ✅ Tool Loop Pseudocode
```typescript
// In chat handler:
while (true) {
  const completion = await openai.chat.completions.create({
    messages: [...context],
    tools: enabledTools,  // From employee.tools_allowed
  });

  const toolCalls = completion.choices[0].message.tool_calls;
  
  if (!toolCalls || toolCalls.length === 0) {
    // No tools, just stream response
    break;
  }

  // Execute each tool
  for (const toolCall of toolCalls) {
    const tool = await getToolFromRegistry(toolCall.function.name);
    const result = await executeTool(tool, toolCall.function.arguments);
    
    // Add tool result to messages
    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    });
  }

  // Continue loop with tool results
}
```

## 5. Verification Steps

### Step 1: Database Check
```sql
-- 1. Verify Prime exists
SELECT slug, title, tools_allowed
FROM public.employee_profiles
WHERE slug = 'prime-boss';

-- Expected: tools_allowed = ['delegate']

-- 2. Verify delegate tool registered
SELECT name, handler_path, auth_scope
FROM public.tools_registry
WHERE name = 'delegate';

-- Expected: 1 row returned
```

### Step 2: Code Check
```bash
# 1. Verify delegate tool exists
ls -la chat_runtime/tools/delegate.ts

# 2. Verify agent bridge exists
ls -la chat_runtime/internal/agentBridge.ts

# 3. Check if tool loop implemented
grep -n "tool_calls" netlify/functions/chat.ts
```

### Step 3: Manual Test
1. Open Prime chat: `http://localhost:8888/prime-test` (or similar)
2. Send message: "Prime, ask Byte to extract data from a receipt."
3. Expected behavior:
   - Prime receives message
   - Prime decides to use `delegate` tool
   - Prime calls `delegateTool({ targetEmployee: 'byte-doc', objective: 'extract data from receipt' })`
   - Agent bridge calls Byte's chat endpoint
   - Byte responds
   - Prime receives Byte's response
   - Prime synthesizes final answer
4. Check logs for:
   - `[TOOL] Calling delegate with target: byte-doc`
   - `[AGENT_BRIDGE] Calling employee byte-doc`
   - `[AGENT_BRIDGE] Received response from byte-doc`
   - `[TOOL] Delegate completed successfully`

## 6. Status Summary

| Item | Status | Notes |
|------|--------|-------|
| Delegate tool code | ✅ Created | Stub in `chat_runtime/tools/delegate.ts` |
| Tool registry entry | ✅ Defined | In migration SQL |
| Prime profile with tools_allowed | ✅ Defined | In migration SQL |
| Agent bridge code | ✅ Created | Stub in `chat_runtime/internal/agentBridge.ts` |
| Tool-calling loop | ⚠️ **TODO** | **Needs implementation in chat.ts** |

## 7. Implementation Priorities

### 🔴 Critical (Required for Delegation)
1. **Implement tool-calling loop** in `netlify/functions/chat.ts`
   - Detect `tool_calls` in OpenAI response
   - Execute tools (delegate, etc.)
   - Return tool results to model
   - Continue until no more tool calls

2. **Complete delegate tool implementation**
   - Currently a stub, needs full logic
   - Should call `agentBridge.callEmployee()`
   - Handle errors gracefully

3. **Complete agent bridge implementation**
   - Currently a stub, needs full HTTP client logic
   - Implement cycle detection
   - Implement depth tracking
   - Implement timeout enforcement

### 🟡 Important (Recommended)
1. Add tool execution monitoring/logging
2. Add tool call rate limiting
3. Add tool call depth metrics
4. Create delegation test suite

### 🟢 Nice to Have
1. Tool call visualization in UI
2. Delegation chain diagram
3. Performance metrics dashboard

## 8. Testing Checklist

### Unit Tests
- [ ] Test `delegateTool` with valid params
- [ ] Test `delegateTool` with invalid employee
- [ ] Test `agentBridge.callEmployee` with valid params
- [ ] Test cycle detection (A → B → A)
- [ ] Test depth limiting (A → B → C → D should fail at D)
- [ ] Test timeout enforcement

### Integration Tests
- [ ] Prime calls Byte via delegate tool
- [ ] Prime calls Ledger via delegate tool
- [ ] Prime calls multiple employees in sequence
- [ ] Prime receives and synthesizes multiple responses
- [ ] Error handling when target employee fails

### End-to-End Tests
- [ ] User asks Prime to delegate → Prime delegates → Response returned
- [ ] User asks Prime complex question → Prime delegates to 2 employees → Merged response
- [ ] User asks Prime to delegate to non-existent employee → Graceful error

---

**Current Status**: ⚠️ **PARTIALLY COMPLETE**  
**Blockers**: Tool-calling loop implementation required  
**Next Step**: Implement tool detection and execution in `netlify/functions/chat.ts`

