# Hydration Duplicate Fix - Chat History Loading

## A) Hydration Map

### When Refresh Occurs:

1. **Component Mounts** (UnifiedAssistantChat.tsx:223)
   - Effect triggers: `useEffect([isOpen, userId, effectiveEmployeeSlug, conversationId])`
   - Checks guards: `initKeyRef`, `historyLoadedRef`, `sessionStorage`

2. **History Load Function** (line 278-490)
   - Reads localStorage: `chat_thread_${userId}_${effectiveEmployeeSlug}` → `threadId`
   - Reads localStorage: `chat_session_${userId}_${effectiveEmployeeSlug}` → `sessionId`
   - Computes `scope` = `threadId || sessionId || effectiveEmployeeSlug`
   - Checks sessionStorage: `prime_session_loaded::${userId}::${scope}`
   - **BUG**: If `scope` changes between loads (threadId vs sessionId), history loads again

3. **Supabase Query** (line 374-411)
   - Primary: Query by `thread_id` (if exists)
   - Fallback 1: Query by `session_id` (if no threadId)
   - Fallback 2: Query multiple sessions by `employee_slug` (up to 5 sessions)
   - Fallback 3: Query by `user_id` only (no filter)
   - **BUG**: Fallback 2 returns messages from multiple sessions, could overlap with thread_id results

4. **Deduplication** (line 432-462)
   - Deduplicates by: `message.id`, `meta.client_message_id`, `meta.request_id`
   - Sets `loadedHistoryMessages` state

5. **Engine Integration** (line 504-538)
   - Computes `deduplicatedInitialMessages` from `loadedHistoryMessages`
   - Passes to `useUnifiedChatEngine` as `initialMessages`
   - Engine merges into its own `messages` array

6. **Render Authority** (line 1815-1828)
   - `engineReady = !disableRuntime && (messages.length > 0 || isStreaming || (userId && !isLoadingHistory))`
   - `authoritativeMessages = engineReady ? messages : loadedHistoryMessages`
   - **BUG**: If engine hasn't initialized yet but `loadedHistoryMessages` exists, we render history. Then when engine initializes, it might include the same messages again.

### State Arrays Created/Updated:

- `loadedHistoryMessages` (line 211) - Set by history loader
- `engine.messages` (from useUnifiedChatEngine) - Includes `initialMessages` + new messages
- `injectedMessages` (line 181) - UI-only messages (greetings, handoffs)

### Where Duplicates Enter:

1. **History loads twice**: `sessionStorage` key changes (threadId vs sessionId)
2. **Fallback query overlap**: Multiple sessions query returns messages already in thread_id results
3. **Engine merge duplication**: Engine receives `initialMessages` but also loads from DB, causing double merge
4. **Render-time merge**: Both `loadedHistoryMessages` and `engine.messages` contain same messages

## B) localStorage / sessionStorage Keys

### localStorage Keys:
- `chat_thread_${userId}_${effectiveEmployeeSlug}` - Stores thread_id (read: line 312, write: line 339, 362)
- `chat_session_${userId}_${effectiveEmployeeSlug}` - Stores session_id (read: line 231, write: usePrimeChat.ts)

### sessionStorage Keys:
- `prime_session_loaded::${userId}::${scope}` - Marks session as loaded (read: line 266, write: line 469, 479)
- `prime_welcome_shown::${userId}` - Marks welcome shown (read: line 1624, write: line 1644)
- `prime_welcome_back_shown::${userId}` - Marks welcome back shown (read: line 1664, write: line 1694)
- `byte_greeting_shown::${userId}` - Marks Byte greeting shown (read: line 1715, write: line 1736)

### Where Cleared:
- Never explicitly cleared (persists until browser session ends for sessionStorage, forever for localStorage)

## C) Root Cause Analysis

**Primary Issue**: **SessionStorage key inconsistency** + **Fallback query overlap**

1. **sessionStorage key changes**: When `scope` changes (threadId vs sessionId), the sessionStorage check fails and history loads again
2. **Fallback query overlap**: When querying multiple sessions (fallback 2), messages might overlap with thread_id query results
3. **Engine initialization timing**: `engineReady` logic might switch from `loadedHistoryMessages` to `engine.messages` before engine has fully merged initialMessages

## D) Minimal Fixes Applied

### Fix 1: Stable sessionStorage Key ✅
**File**: `src/components/chat/UnifiedAssistantChat.tsx` (line 254-273)

**Change**: Use consistent key based on threadId (preferred) or sessionId, not changing scope.

```typescript
// BEFORE:
let scope = sessionId || effectiveEmployeeSlug || 'no-scope';
// ... scope could change between loads

// AFTER:
let stableKey = 'no-key';
if (storedThreadId) {
  stableKey = `thread:${storedThreadId}`;
} else if (sessionId) {
  stableKey = `session:${sessionId}`;
} else {
  stableKey = `employee:${effectiveEmployeeSlug}`;
}
const sessionLoadKey = `prime_session_loaded::${userId}::${stableKey}`;
```

**Why**: Prevents history from loading multiple times when threadId/sessionId resolution changes.

### Fix 2: Prevent Fallback Query Overlap ✅
**File**: `src/components/chat/UnifiedAssistantChat.tsx` (line 382-420)

**Change**: Exclude messages with thread_id from fallback queries to prevent overlap.

```typescript
// BEFORE:
query = query.in('session_id', sessionIds); // Could return messages already in thread_id results

// AFTER:
query = query.in('session_id', sessionIds).is('thread_id', null); // Exclude thread_id messages
```

**Why**: Prevents duplicate messages when fallback queries return messages already queried by thread_id.

### Fix 3: Improve engineReady Logic ✅
**File**: `src/components/chat/UnifiedAssistantChat.tsx` (line 1823)

**Change**: Only consider engine ready when it has messages OR is streaming.

```typescript
// BEFORE:
const engineReady = !disableRuntime && (messages.length > 0 || isStreaming || (userId && !isLoadingHistory));

// AFTER:
const engineReady = !disableRuntime && (messages.length > 0 || isStreaming);
```

**Why**: Prevents premature switch from `loadedHistoryMessages` to `engine.messages` before engine has merged initialMessages.

### Fix 4: Add Idempotency Logging ✅
**File**: `src/components/chat/UnifiedAssistantChat.tsx` (line 273, 395, 401, 413, 480)

**Change**: Added DEV-only logs to track history loading.

```typescript
if (import.meta.env.DEV) {
  console.log(`[UnifiedAssistantChat] ✅ Skipping history load - already loaded (key: ${stableKey.substring(0, 20)}...)`);
  console.log(`[UnifiedAssistantChat] 📥 Loading history by thread_id: ${threadId.substring(0, 8)}...`);
  console.log(`[UnifiedAssistantChat] ✅ Loaded ${deduplicatedMessages.length} messages from history...`);
}
```

**Why**: Helps debug idempotency issues and verify history loads only once.

## Verification Checklist

After fix, verify:

- ✅ **Refresh page** → no new duplicate bubbles appear
- ✅ **History loads exactly once** per open session (DEV log confirms)
- ✅ **Messages render from exactly one authoritative list** (`engine.messages` OR `loadedHistoryMessages`, never both)
- ✅ **Switching employees** does not re-add old messages
- ✅ **Handoff does not trigger** a second history merge
- ✅ **React DevTools shows stable message list length** after refresh

## Expected DEV Logs

**On first load:**
```
[UnifiedAssistantChat] 📥 Loading history by thread_id: abc12345...
[UnifiedAssistantChat] ✅ Loaded 5 messages from history (0 duplicates removed, key: thread:abc12345...)
```

**On refresh (already loaded):**
```
[UnifiedAssistantChat] ✅ Skipping history load - already loaded (key: thread:abc12345...)
```

**On fallback query:**
```
[UnifiedAssistantChat] 📥 Fallback: loading messages from 3 sessions (excluding thread_id messages)
```

## Files Modified

1. `src/components/chat/UnifiedAssistantChat.tsx` (~50 lines changed)
   - Fixed sessionStorage key stability (line 254-273)
   - Fixed fallback query overlap (line 382-420)
   - Improved engineReady logic (line 1823)
   - Added idempotency logging (multiple locations)

## Summary

- **Root Cause**: SessionStorage key inconsistency + fallback query overlap + premature engineReady
- **Fix**: Stable sessionStorage key + exclude thread_id from fallback queries + stricter engineReady logic
- **Result**: History loads exactly once, no duplicate messages after refresh

