# Single Message Authority Fix - UnifiedAssistantChat

## Summary

Enforced "Single Message Authority" in `UnifiedAssistantChat.tsx` to prevent duplicate messages and ensure deterministic rendering.

## Root Cause

Previously, the component was checking both `messages` (from engine) and `loadedHistoryMessages` (from hydration) separately, which could lead to:
- Duplicate assistant bubbles
- Inconsistent message counts
- Race conditions during hydration

## Fix Applied

### 1. Single Authoritative Source Logic

**File**: `src/components/chat/UnifiedAssistantChat.tsx` (line 1815-1816)

**Change**: Added `engineReady` check and `authoritativeMessages` selection:

```typescript
// CRITICAL: Single message authority - choose ONE authoritative source at render time
// Engine is ready when: runtime enabled AND (has messages OR has initialized with userId)
// When engine is ready → use engine.messages (includes loadedHistoryMessages via initialMessages)
// When engine not ready → use loadedHistoryMessages (hydration phase)
const engineReady = !disableRuntime && (messages.length > 0 || isStreaming || (userId && !isLoadingHistory));
const authoritativeMessages = engineReady ? messages : loadedHistoryMessages;
```

**Logic**:
- `engineReady` is `true` when:
  - Runtime is enabled (`!disableRuntime`)
  - AND at least one of:
    - Engine has messages (`messages.length > 0`)
    - Engine is streaming (`isStreaming`)
    - Engine has initialized (`userId && !isLoadingHistory`)
- When `engineReady` → use `engine.messages` (includes `loadedHistoryMessages` via `initialMessages`)
- When `!engineReady` → use `loadedHistoryMessages` (hydration phase)

### 2. Updated Message Array Building

**File**: `src/components/chat/UnifiedAssistantChat.tsx` (line 1820-1828)

**Change**: Replaced `...messages` with `...authoritativeMessages`:

```typescript
const allMessages = [
  ...(custodianHandoffNote ? [custodianHandoffNote] : []),
  ...(welcomeBackNote ? [welcomeBackNote] : []),
  ...(welcomeMessage ? [welcomeMessage] : []),
  ...(byteGreetingNote ? [byteGreetingNote] : []),
  ...(greetingMessage ? [greetingMessage] : []),
  ...authoritativeMessages, // CRITICAL: Single authoritative source - engine.messages OR loadedHistoryMessages (never both)
  ...injectedMessages
];
```

### 3. Updated `hasAssistantMessages` Check

**File**: `src/components/chat/UnifiedAssistantChat.tsx` (line 1488-1494)

**Change**: Updated to use single authoritative source:

```typescript
const hasAssistantMessages = useMemo(() => {
  const engineReady = !disableRuntime && (messages.length > 0 || isStreaming || (userId && !isLoadingHistory));
  const authoritativeMessages = engineReady ? messages : loadedHistoryMessages;
  return authoritativeMessages.some(m => m.role === 'assistant');
}, [disableRuntime, messages, isStreaming, userId, isLoadingHistory, loadedHistoryMessages]);
```

### 4. Updated `hasStreamingAssistantBubble` Check

**File**: `src/components/chat/UnifiedAssistantChat.tsx` (line 2216-2222)

**Change**: Updated to use single authoritative source:

```typescript
const hasStreamingAssistantBubble = useMemo(() => {
  const engineReady = !disableRuntime && (messages.length > 0 || isStreaming || (userId && !isLoadingHistory));
  const authoritativeMessages = engineReady ? messages : loadedHistoryMessages;
  return authoritativeMessages.some(
    (m) => m.role === 'assistant' && m.meta?.is_streaming === true
  );
}, [disableRuntime, messages, isStreaming, userId, isLoadingHistory, loadedHistoryMessages]);
```

### 5. Updated `welcomeBackNote` Check

**File**: `src/components/chat/UnifiedAssistantChat.tsx` (line 1657-1660)

**Change**: Updated to use single authoritative source:

```typescript
// Only show when messages are empty (first open this session)
// CRITICAL: Use single authoritative message source (same logic as renderMessages)
const engineReady = !disableRuntime && (messages.length > 0 || isStreaming || (userId && !isLoadingHistory));
const authoritativeMessages = engineReady ? messages : loadedHistoryMessages;
if (authoritativeMessages.length > 0) return null;
```

### 6. Updated `primeWelcomeNote` Check

**File**: `src/components/chat/UnifiedAssistantChat.tsx` (line 1657-1660)

**Change**: Updated to use single authoritative source (same as welcomeBackNote).

## Verification Checklist

After fix, verify:

1. **No duplicate assistant bubbles:**
   - ✅ Sending one message produces exactly: one user bubble, one assistant placeholder, one final assistant message
   - ✅ No duplicate Prime messages after refresh

2. **Typing indicator behavior:**
   - ✅ Typing indicator shows ONLY when `isStreaming === true` AND no streaming placeholder bubble exists
   - ✅ No missing or doubled typing indicator

3. **Refresh behavior:**
   - ✅ Refresh does not re-append previously loaded messages
   - ✅ Messages persist correctly after refresh

4. **Message source consistency:**
   - ✅ Only ONE message source is used at render time (`engine.messages` OR `loadedHistoryMessages`, never both)
   - ✅ Injected messages (greetings, trust notes) are inserted through ONE controlled path

## Files Modified

1. `src/components/chat/UnifiedAssistantChat.tsx` (~30 lines changed)
   - Added `engineReady` and `authoritativeMessages` logic
   - Updated `allMessages` to use `authoritativeMessages`
   - Updated `hasAssistantMessages` to use single source
   - Updated `hasStreamingAssistantBubble` to use single source
   - Updated `welcomeBackNote` and `primeWelcomeNote` to use single source

## Key Principles

1. **Single Source of Truth**: At render time, choose ONE authoritative message list
2. **Engine Priority**: When engine is ready, use `engine.messages` (includes `loadedHistoryMessages` via `initialMessages`)
3. **Hydration Fallback**: When engine not ready, use `loadedHistoryMessages` temporarily
4. **No Concatenation**: Do NOT concatenate `engine.messages + loadedHistoryMessages + injectedMessages` at render time
5. **Consistent Logic**: All message checks use the same `engineReady` logic

## Expected Behavior

- **On initial load**: Uses `loadedHistoryMessages` until engine initializes
- **After engine ready**: Uses `engine.messages` (which includes loaded history)
- **During streaming**: Uses `engine.messages` (includes streaming placeholder)
- **On refresh**: Uses `loadedHistoryMessages` until engine re-initializes, then switches to `engine.messages`

## Summary

- **Root Cause**: Multiple message sources checked separately (`messages` + `loadedHistoryMessages`)
- **Fix**: Single authoritative source selection based on `engineReady` state
- **Result**: Deterministic rendering with no duplicate messages or race conditions




