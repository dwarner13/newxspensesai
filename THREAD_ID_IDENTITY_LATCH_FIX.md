# Thread ID Identity Latch Fix - UnifiedAssistantChat

## Summary

Updated the engine ready latch to use `thread_id` as the primary identity key, ensuring the latch resets correctly when switching between conversations/threads.

## Problem

Previously, the latch reset used `[conversationId, effectiveEmployeeSlug, userId]`, which could miss cases where:
- `thread_id` becomes available after initial hydration
- User switches between threads with the same employee
- `thread_id` is the most stable identifier for a conversation

## Solution

Use `thread_id` as the primary identity key, with fallbacks to `sessionId` and `employee:userId:slug` when `thread_id` is not yet available.

## Implementation

### 1. Added State for Resolved Thread ID (Line 214)

```typescript
const [resolvedThreadId, setResolvedThreadId] = useState<string | null>(null); // Track resolved thread_id for identity key
```

### 2. Added Ref for Last Identity Key (Line 225)

```typescript
const lastIdentityKeyRef = useRef<string | null>(null); // Track last identity key for latch reset
```

### 3. Update Thread ID When Resolved (Lines 329, 354, 378)

**From localStorage** (line 329):
```typescript
if (storedThreadId) {
  threadId = storedThreadId;
  setResolvedThreadId(storedThreadId); // Update state for identity key
}
```

**From database query** (line 354):
```typescript
if (threadId) {
  localStorage.setItem(threadStorageKey, threadId);
  setResolvedThreadId(threadId); // Update state for identity key
}
```

**From new thread creation** (line 378):
```typescript
if (threadId) {
  localStorage.setItem(threadStorageKey, threadId);
  setResolvedThreadId(threadId); // Update state for identity key
}
```

### 4. Create Stable Chat Identity Key (Lines 531-556)

```typescript
// Create stable chat identity key (prefer threadId, fallback to sessionId/employee)
// CRITICAL: This key identifies the conversation/thread and is used to reset the latch
const chatIdentityKey = useMemo(() => {
  // Prefer resolved threadId from state (set after loadHistory resolves it)
  if (resolvedThreadId) {
    return `thread:${resolvedThreadId}`;
  }
  // Fallback: try localStorage synchronously (may be available before loadHistory runs)
  try {
    if (userId && effectiveEmployeeSlug) {
      const threadStorageKey = `chat_thread_${userId}_${effectiveEmployeeSlug}`;
      const storedThreadId = localStorage.getItem(threadStorageKey);
      if (storedThreadId) {
        return `thread:${storedThreadId}`;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  // Fallback to sessionId
  if (conversationId) {
    return `session:${conversationId}`;
  }
  // Last resort: employee + userId
  return `employee:${userId || 'anon'}:${effectiveEmployeeSlug || 'unknown'}`;
}, [resolvedThreadId, conversationId, userId, effectiveEmployeeSlug]);
```

### 5. Reset Latch When Identity Changes (Lines 558-572)

```typescript
// Reset engine ready latch when conversation identity changes
// CRITICAL: Reset latch when identity key changes (threadId resolved, sessionId changes, etc.)
// This ensures fresh latch for each new conversation/thread
useEffect(() => {
  if (lastIdentityKeyRef.current !== chatIdentityKey) {
    const oldKey = lastIdentityKeyRef.current;
    engineReadyLatchedRef.current = false;
    lastIdentityKeyRef.current = chatIdentityKey;
    if (import.meta.env.DEV) {
      console.log('[EngineReadyLatch] 🔄 Reset latch (identity changed)', {
        from: oldKey,
        to: chatIdentityKey,
      });
    }
  }
}, [chatIdentityKey]);
```

### 6. Reset Resolved Thread ID on Conversation Change (Lines 533-536)

```typescript
// Reset resolvedThreadId when employee or conversation changes (fresh start)
useEffect(() => {
  setResolvedThreadId(null);
}, [effectiveEmployeeSlug, conversationId, userId]);
```

## Thread ID Resolution Flow

1. **Initial Load**: 
   - Try localStorage: `chat_thread_${userId}_${effectiveEmployeeSlug}` → if found, set `resolvedThreadId`
   - If not found, query Supabase `chat_threads` table
   - If found in DB, store in localStorage and set `resolvedThreadId`
   - If not found, create new thread, store in localStorage and set `resolvedThreadId`

2. **Identity Key Selection**:
   - Priority 1: `resolvedThreadId` from state → `thread:${resolvedThreadId}`
   - Priority 2: localStorage `threadId` (synchronous fallback) → `thread:${storedThreadId}`
   - Priority 3: `conversationId` → `session:${conversationId}`
   - Priority 4: `employee:${userId}:${effectiveEmployeeSlug}`

3. **Latch Reset**:
   - When `chatIdentityKey` changes → reset `engineReadyLatchedRef.current = false`
   - Log old and new keys for debugging

## Verification Checklist

- ✅ Refresh page: UI does not flip between history and engine lists
- ✅ Navigate between employee chats: latch resets properly
- ✅ When threadId becomes available after hydration: identity changes → latch resets once → then latches again when engineReady is true
- ✅ No duplicates and no typing flicker
- ✅ Still only ONE message source rendered at a time

## Expected DEV Logs

**On first load (before threadId resolved)**:
```
[EngineReadyLatch] 🔄 Reset latch (identity changed) {
  from: null,
  to: 'session:abc123...'
}
```

**When threadId becomes available**:
```
[EngineReadyLatch] 🔄 Reset latch (identity changed) {
  from: 'session:abc123...',
  to: 'thread:xyz789...'
}
```

**When engine becomes ready**:
```
[EngineReadyLatch] Latched to true { 
  currentEngineReady: true, 
  engineReadyLatched: true,
  messagesLen: 5,
  historyLen: 5
}
```

**On employee switch**:
```
[EngineReadyLatch] 🔄 Reset latch (identity changed) {
  from: 'thread:xyz789...',
  to: 'thread:new-thread-id...'
}
```

## Files Modified

1. `src/components/chat/UnifiedAssistantChat.tsx` (~50 lines changed)
   - Added `resolvedThreadId` state (line 214)
   - Added `lastIdentityKeyRef` (line 225)
   - Updated threadId resolution to set state (lines 329, 354, 378)
   - Created `chatIdentityKey` useMemo (lines 531-556)
   - Updated latch reset to use identity key (lines 558-572)
   - Added reset effect for resolvedThreadId (lines 533-536)

## Thread ID Source

**Variable Used**: `resolvedThreadId` (state) + localStorage fallback

**Resolution Order**:
1. From `loadHistory` async function:
   - Reads from localStorage: `chat_thread_${userId}_${effectiveEmployeeSlug}` (line 325)
   - Queries Supabase `chat_threads` table if not in localStorage (line 337)
   - Creates new thread if not found (line 360)
   - Sets `resolvedThreadId` state when found/created (lines 329, 354, 378)

2. For identity key (synchronous):
   - First checks `resolvedThreadId` state (line 535)
   - Falls back to localStorage read (line 542)
   - Falls back to `conversationId` (line 551)
   - Last resort: `employee:${userId}:${effectiveEmployeeSlug}` (line 555)

## Summary

- **Root Cause**: Latch reset used `conversationId/employeeSlug/userId` instead of `thread_id`
- **Fix**: Use `thread_id` as primary identity key with fallbacks
- **Result**: Latch resets correctly when switching threads, prevents flip-flop, maintains single message authority




