# Engine Ready Latch Fix - UnifiedAssistantChat

## Summary

Added a latch mechanism to prevent flip-flopping between `loadedHistoryMessages` and `engine.messages` during hydration, eliminating flicker and timing issues.

## Problem

Previously, `engineReady` was computed on every render:
```typescript
const engineReady = !disableRuntime && (messages.length > 0 || isStreaming);
const authoritativeMessages = engineReady ? messages : loadedHistoryMessages;
```

This could cause flip-flopping:
- On refresh: `loadedHistoryMessages` loads first → UI shows history
- Engine initializes: `messages.length > 0` → UI switches to `engine.messages`
- If engine temporarily has 0 messages: UI switches back to `loadedHistoryMessages`
- Result: Message "jumping" and typing flicker

## Solution

Added a latch that:
1. **Latches once**: When `engineReady` becomes `true`, it stays `true` until conversation changes
2. **Prevents flip-flop**: Once latched, always uses `engine.messages` (even if temporarily empty)
3. **Resets on conversation change**: Latch resets when `conversationId`, `effectiveEmployeeSlug`, or `userId` changes

## Implementation

### 1. Added Ref (Line 222)

```typescript
// PART 3: Engine ready latch - prevents flip-flop between history and engine messages
const engineReadyLatchedRef = useRef<boolean>(false);
```

### 2. Compute Current Engine Ready (Line 1846)

```typescript
const currentEngineReady = !disableRuntime && (messages.length > 0 || isStreaming);
```

### 3. Latch Effect (Line 1850-1862)

```typescript
// Latch engineReady once it becomes true to prevent flip-flop during hydration
// CRITICAL: Once engine is ready, keep using engine.messages until conversation changes
useEffect(() => {
  if (currentEngineReady) {
    engineReadyLatchedRef.current = true;
    if (import.meta.env.DEV) {
      console.log('[EngineReadyLatch] Latched to true', { 
        currentEngineReady, 
        engineReadyLatched: engineReadyLatchedRef.current,
        messagesLen: messages.length,
        historyLen: loadedHistoryMessages.length 
      });
    }
  }
}, [currentEngineReady, messages.length, loadedHistoryMessages.length]);
```

### 4. Use Latched Value (Line 1864-1865)

```typescript
const engineReadyLatched = engineReadyLatchedRef.current;
const authoritativeMessages = engineReadyLatched ? messages : loadedHistoryMessages;
```

### 5. Reset Latch on Conversation Change (Line 510-517)

```typescript
// Reset engine ready latch when conversation identity changes
// CRITICAL: Reset latch when conversationId, employeeSlug, or userId changes
// This ensures fresh latch for each new conversation/thread
useEffect(() => {
  engineReadyLatchedRef.current = false;
  if (import.meta.env.DEV) {
    console.log('[EngineReadyLatch] Reset latch', { conversationId, effectiveEmployeeSlug, userId });
  }
}, [conversationId, effectiveEmployeeSlug, userId]);
```

### 6. Updated Other Message Checks

Updated `hasAssistantMessages` (line 1517-1521) and `hasStreamingAssistantBubble` (line 2250-2256) to use latched value:

```typescript
const hasAssistantMessages = useMemo(() => {
  const engineReadyLatched = engineReadyLatchedRef.current;
  const authoritativeMessages = engineReadyLatched ? messages : loadedHistoryMessages;
  return authoritativeMessages.some(m => m.role === 'assistant');
}, [messages, loadedHistoryMessages]);
```

### 7. DEV Logging (Line 1868-1878)

```typescript
// DEV: Log latch state for debugging
if (import.meta.env.DEV) {
  if (currentEngineReady !== engineReadyLatched) {
    console.log('[EngineReadyLatch] State', { 
      currentEngineReady, 
      engineReadyLatched, 
      messagesLen: messages.length, 
      historyLen: loadedHistoryMessages.length,
      using: engineReadyLatched ? 'engine.messages' : 'loadedHistoryMessages'
    });
  }
}
```

## Latch Reset Key

**Key**: `[conversationId, effectiveEmployeeSlug, userId]`

**Why Stable**:
- `conversationId`: Unique per conversation/thread (changes when switching threads)
- `effectiveEmployeeSlug`: Unique per employee (changes on handoff)
- `userId`: Unique per user (changes on login/logout)

**Why Not Include `location.pathname`**:
- Pathname can change without conversation changing (e.g., navigating between dashboard pages)
- Conversation identity is more stable and meaningful for message source selection

## Verification Checklist

- ✅ On refresh: UI does not flip between history and engine lists
- ✅ No message "jumping" or typing flicker
- ✅ Still only ONE message source rendered at a time
- ✅ Latch resets when conversation changes (conversationId/employeeSlug/userId)
- ✅ Latch persists during hydration phase

## Expected DEV Logs

**On first load (before engine ready)**:
```
[EngineReadyLatch] State { 
  currentEngineReady: false, 
  engineReadyLatched: false, 
  messagesLen: 0, 
  historyLen: 5,
  using: 'loadedHistoryMessages'
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

**After latch (engine temporarily empty, but still using engine.messages)**:
```
[EngineReadyLatch] State { 
  currentEngineReady: false, 
  engineReadyLatched: true, 
  messagesLen: 0, 
  historyLen: 5,
  using: 'engine.messages'  // Still using engine even though temporarily empty
}
```

**On conversation change**:
```
[EngineReadyLatch] Reset latch { conversationId: 'new-id', effectiveEmployeeSlug: 'prime-boss', userId: 'user-123' }
```

## Files Modified

1. `src/components/chat/UnifiedAssistantChat.tsx` (~40 lines changed)
   - Added `engineReadyLatchedRef` (line 222)
   - Added latch effect (line 1850-1862)
   - Added reset effect (line 510-517)
   - Updated `authoritativeMessages` to use latched value (line 1864-1865)
   - Updated `hasAssistantMessages` to use latched value (line 1517-1521)
   - Updated `hasStreamingAssistantBubble` to use latched value (line 2250-2256)
   - Updated `welcomeBackNote` to use latched value (line 1689)
   - Added DEV logging (line 1868-1878)

## Summary

- **Root Cause**: `engineReady` computed on every render, causing flip-flop during hydration
- **Fix**: Latch `engineReady` once it becomes `true`, reset on conversation change
- **Result**: Stable message source selection, no flicker, no message jumping




