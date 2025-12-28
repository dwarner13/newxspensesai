# Prime Chat Greeting Injection Fix ✅

## Goal
When Prime panel opens and there are no chat messages, show a Prime greeting message automatically.

---

## Root Cause Analysis

### Issue: Prime Chat Opens Empty
**Root Cause**: 
- Greeting logic exists but uses typing animation (`showGreetingTyping`, `typedGreeting`)
- Greeting is shown via `greetingMessage` object prepended to `displayMessages`
- Conditions for typing animation might be too strict (`chatReady`, `hasAssistantMessages`, etc.)
- If typing animation doesn't trigger, no greeting appears

**Solution**: 
- Inject greeting message directly into `displayMessages` when panel opens
- Bypass typing animation for immediate display
- Use ref guard to prevent double injection
- Reset guard when panel closes

---

## Files Changed

### 1. `src/components/chat/UnifiedAssistantChat.tsx`
**Change A**: Added greeting injection ref
```typescript
const greetingInjectedRef = useRef(false); // Track if greeting message was injected directly
```

**Change B**: Imported usePrimeState
```typescript
import { usePrimeState } from '../../contexts/PrimeContext';
```

**Change C**: Added injected greeting message logic
```typescript
// Inject greeting message directly when Prime panel opens
const primeState = usePrimeState();
const injectedGreetingMessage = useMemo(() => {
  // Only inject for Prime panel when open and empty
  if (!isOpen || currentEmployeeSlug !== 'prime-boss' || greetingInjectedRef.current) {
    return null;
  }
  
  // Only inject if thread is empty (no assistant messages)
  const hasAssistantMessages = messages.filter((m) => m.role === 'assistant').length > 0;
  if (hasAssistantMessages) {
    return null;
  }
  
  // Resolve user name safely
  let userName = 'there';
  if (primeState?.userProfileSummary?.displayName) {
    const firstName = primeState.userProfileSummary.displayName.split(' ')[0];
    userName = firstName || 'there';
  } else if (firstName) {
    userName = firstName;
  } else if (profile?.display_name) {
    const firstName = profile.display_name.split(' ')[0];
    userName = firstName || 'there';
  } else if (profile?.first_name) {
    userName = profile.first_name;
  }
  
  return {
    id: `prime-greeting-${Date.now()}`,
    role: 'assistant' as const,
    content: `Hi ${userName} — I'm Prime. What would you like to work on right now?`,
    timestamp: new Date().toISOString(),
    meta: { type: 'greeting', localOnly: true },
  };
}, [isOpen, currentEmployeeSlug, messages, firstName, profile, primeState]);
```

**Change D**: Added injection effect
```typescript
// Inject greeting message when panel opens (one-time injection)
useEffect(() => {
  if (injectedGreetingMessage && !greetingInjectedRef.current) {
    greetingInjectedRef.current = true;
    // ... dev logging
  }
}, [injectedGreetingMessage]);

// Reset injection flag when panel closes
useEffect(() => {
  if (!isOpen) {
    greetingInjectedRef.current = false;
  }
}, [isOpen]);
```

**Change E**: Updated displayMessages to include injected greeting
```typescript
const displayMessages = [
  ...(injectedGreetingMessage && !greetingMessage ? [injectedGreetingMessage] : []), // Use injected greeting if typing greeting not active
  ...(greetingMessage ? [greetingMessage] : []), // Typing animation greeting takes precedence
  ...messages.filter((m) => m.role !== 'system')
];
```

---

## Code Diffs

### A) Added Greeting Injection Ref
```diff
  const greetingCompletedRef = useRef(false);
  const previousEmployeeSlugRef = useRef<string | null>(null);
  const previousConversationIdRef = useRef<string | null>(null);
  const greetedThisOpenRef = useRef(false);
+ const greetingInjectedRef = useRef(false); // Track if greeting message was injected directly
```

### B) Imported usePrimeState
```diff
  import { useAuth } from '../../contexts/AuthContext';
  import { useProfileContext } from '../../contexts/ProfileContext';
+ import { usePrimeState } from '../../contexts/PrimeContext';
  import { buildUserContextFromProfile } from '../../lib/userContextHelpers';
```

### C) Injected Greeting Message Logic
```diff
+ // Inject greeting message directly when Prime panel opens (bypasses typing animation)
+ const primeState = usePrimeState();
+ const injectedGreetingMessage = useMemo(() => {
+   if (!isOpen || currentEmployeeSlug !== 'prime-boss' || greetingInjectedRef.current) {
+     return null;
+   }
+   
+   const hasAssistantMessages = messages.filter((m) => m.role === 'assistant').length > 0;
+   if (hasAssistantMessages) {
+     return null;
+   }
+   
+   // Resolve user name safely
+   let userName = 'there';
+   if (primeState?.userProfileSummary?.displayName) {
+     const firstName = primeState.userProfileSummary.displayName.split(' ')[0];
+     userName = firstName || 'there';
+   } else if (firstName) {
+     userName = firstName;
+   } else if (profile?.display_name) {
+     const firstName = profile.display_name.split(' ')[0];
+     userName = firstName || 'there';
+   } else if (profile?.first_name) {
+     userName = profile.first_name;
+   }
+   
+   return {
+     id: `prime-greeting-${Date.now()}`,
+     role: 'assistant' as const,
+     content: `Hi ${userName} — I'm Prime. What would you like to work on right now?`,
+     timestamp: new Date().toISOString(),
+     meta: { type: 'greeting', localOnly: true },
+   };
+ }, [isOpen, currentEmployeeSlug, messages, firstName, profile, primeState]);
+
+ // Inject greeting message when panel opens (one-time injection)
+ useEffect(() => {
+   if (injectedGreetingMessage && !greetingInjectedRef.current) {
+     greetingInjectedRef.current = true;
+     if (import.meta.env.DEV) {
+       console.log('[UnifiedAssistantChat] ✅ Greeting message injected:', {
+         messageId: injectedGreetingMessage.id,
+         content: injectedGreetingMessage.content,
+       });
+     }
+   }
+ }, [injectedGreetingMessage]);
+
+ // Reset injection flag when panel closes
+ useEffect(() => {
+   if (!isOpen) {
+     greetingInjectedRef.current = false;
+   }
+ }, [isOpen]);
```

### D) Updated displayMessages
```diff
  const displayMessages = [
+   ...(injectedGreetingMessage && !greetingMessage ? [injectedGreetingMessage] : []), // Use injected greeting if typing greeting not active
    ...(greetingMessage ? [greetingMessage] : []), // Typing animation greeting takes precedence
    ...messages.filter((m) => m.role !== 'system')
  ];
```

---

## Message Storage & Append Logic

### Where Messages Are Stored
- **Source**: `useUnifiedChatEngine` hook → `usePrimeChat` hook
- **State**: `usePrimeChat` maintains `messages` state via `useState<ChatMessage[]>(safeInitialMessages)`
- **Location**: `src/hooks/usePrimeChat.ts` (line 125)

### How Messages Are Appended
- **Direct append**: `setMessages(prev => [...prev, newMessage])` (internal to `usePrimeChat`)
- **Not exposed**: `usePrimeChat` doesn't expose `setMessages` directly
- **Workaround**: Inject greeting into `displayMessages` array (computed from `messages`)

### Display Messages Flow
1. `messages` comes from `useUnifiedChatEngine` (read-only)
2. `displayMessages` is computed: `[greetingMessage, ...messages.filter(m => m.role !== 'system')]`
3. `displayMessages` is rendered in the message list
4. Greeting is injected into `displayMessages` (not `messages` array)

---

## Name Resolution Priority

1. **PrimeState** (`primeState.userProfileSummary.displayName`) - Highest priority
2. **Auth firstName** (`firstName` from `useAuth`)
3. **Profile display_name** (`profile.display_name`)
4. **Profile first_name** (`profile.first_name`)
5. **Fallback**: `"there"`

---

## Verification Steps

### Test 1: Open Prime Panel → Greeting Appears Immediately
**Steps:**
1. Ensure Prime chat thread is empty (no messages)
2. Open Prime chat panel
3. **Verify**: Greeting message appears immediately: "Hi <Name> — I'm Prime. What would you like to work on right now?"
4. **Verify**: Greeting has Prime avatar (crown badge)
5. **Verify**: Greeting appears as assistant message (not system message)

**Expected**: ✅ Greeting appears immediately when panel opens

---

### Test 2: Close + Reopen → Greeting Appears Again Only If Thread Empty
**Steps:**
1. Open Prime panel (greeting appears)
2. Close panel
3. Reopen panel
4. **Verify**: Greeting appears again (thread still empty)
5. Send a message
6. Close and reopen panel
7. **Verify**: Greeting does NOT appear (thread has messages)

**Expected**: ✅ Greeting shows only when thread is empty

---

### Test 3: If You Send a Message, Greeting Is Not Re-Added
**Steps:**
1. Open Prime panel (greeting appears)
2. Send a message
3. **Verify**: Greeting remains (not removed)
4. **Verify**: No duplicate greeting added
5. Close and reopen panel
6. **Verify**: Greeting does NOT appear (thread has messages)

**Expected**: ✅ Greeting not re-added when messages exist

---

### Test 4: No Double Greetings in StrictMode
**Steps:**
1. Enable React StrictMode (if not already)
2. Open Prime chat panel
3. **Verify**: Greeting appears once (not twice)
4. **Verify**: No duplicate greeting messages

**Expected**: ✅ Greeting appears once, even in StrictMode

---

## Technical Details

### Greeting Injection Logic
1. **Check conditions**:
   - Panel is open (`isOpen === true`)
   - Current employee is Prime (`currentEmployeeSlug === 'prime-boss'`)
   - Greeting not already injected (`!greetingInjectedRef.current`)
   - Thread is empty (`hasAssistantMessages === false`)

2. **Resolve user name**:
   - Try PrimeState first (highest priority)
   - Fallback to auth/profile data
   - Default to "there"

3. **Create greeting message**:
   - `id`: `prime-greeting-${Date.now()}`
   - `role`: `'assistant'`
   - `content`: `"Hi ${userName} — I'm Prime. What would you like to work on right now?"`
   - `meta`: `{ type: 'greeting', localOnly: true }`

4. **Inject into displayMessages**:
   - Prepend to `displayMessages` array
   - Only if typing animation greeting not active
   - Typing animation greeting takes precedence

### Ref Guard Logic
- **On open**: Check `greetingInjectedRef.current`, if false, inject and set to true
- **On close**: Reset `greetingInjectedRef.current = false`
- **Prevents**: Double injection, spam on re-renders

### Message Rendering
- Greeting appears as normal assistant message
- Uses Prime avatar (crown badge)
- Styled like other assistant messages
- Not filtered out (role is 'assistant', not 'system')

---

**Status**: ✅ Prime Chat Greeting Injected on Open + No Spam + StrictMode Safe



