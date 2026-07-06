# Chat Contract Audit Report
## Prime/Employee Slideout Chat System

**Date**: 2025-01-XX  
**Scope**: Chat send/stream lifecycle, typing indicator, scroll ownership, duplicate prevention  
**Exclusions**: Guardrails, OCR, memory, onboarding, BODY scroll rules, database

---

## A) ROOT CAUSE MAP

### 1. Duplicate User/Assistant Bubbles

**Root Cause**: Multiple send triggers can fire simultaneously before lock is set
- **Location**: `src/components/chat/UnifiedAssistantChat.tsx:1107-1146`
- **Issue**: `handleSend` has `sendLockRef` but form `onSubmit` (line 2640) + `handleKeyPress` (line 1296) + `handlePromptClick` (line 1307) can all call send before lock is checked
- **Evidence**: Lock is set AFTER validation checks (line 1130), creating race window

**Root Cause**: Fallback JSON response can create duplicate assistant message
- **Location**: `src/hooks/usePrimeChat.ts:1421-1579`
- **Issue**: Fallback handler (line 1468) checks for placeholder but if not found, appends new message (line 1518) instead of ensuring placeholder exists
- **Evidence**: Line 1490-1518 shows defensive append when placeholder missing

**Root Cause**: Late SSE chunks after finalization can create duplicates
- **Location**: `src/hooks/usePrimeChat.ts:656-669`
- **Issue**: Guards exist (`finalizedRequestIdsRef`, `activeRequestIdRef`) but chunks processed before guards checked
- **Evidence**: Line 656 checks finalized but chunk already parsed; should short-circuit earlier

### 2. "Prime is typing..." Missing or Doubled

**Root Cause**: Two typing indicator sources render independently
- **Location**: `src/components/chat/UnifiedAssistantChat.tsx:2223-2234`
- **Issue**: `showNormalTyping` checks `hasStreamingAssistantBubble` (line 2233) but timing race: placeholder created AFTER typing starts, so both can render briefly
- **Evidence**: TypingIndicatorRow renders at line 3049; streaming placeholder created in `usePrimeChat` BEFORE fetch (line 830-880) but typing begins at line 1210

**Root Cause**: Greeting typing and normal typing can overlap
- **Location**: `src/components/chat/UnifiedAssistantChat.tsx:2215-2234`
- **Issue**: `greetingTypingAllowed` and `showNormalTyping` computed independently; no hard mutual exclusion
- **Evidence**: Line 2243-2254 shows DEV assertion detecting double typing but no production guard

### 3. Chat Area Not Scrollable / Messages Cut Off

**Root Cause**: Scroll container ownership unclear; multiple flex containers compete
- **Location**: `src/components/chat/UnifiedAssistantChat.tsx:3262-3323`
- **Issue**: `scrollContainerRef` points to wrapper div (line 3264), but actual scroll container is nested child (line 3322) with `data-scroll-container="true"`
- **Evidence**: `findScrollContainer` (line 900-933) traverses DOM to find scroll owner, indicating ref mismatch

**Root Cause**: Parent containers missing `min-h-0` breaking flex chain
- **Location**: `src/components/prime/PrimeSlideoutShell.tsx:286-364`
- **Issue**: Scroll wrapper (line 360) has `flex-1 min-h-0` but parent (line 287) may not enforce `min-h-0` consistently
- **Evidence**: Line 287 shows `flex flex-col` but no explicit `min-h-0` on parent chain

**Root Cause**: DOM nesting warning (`<p>` inside `<div>`)
- **Location**: `src/components/chat/UnifiedAssistantChat.tsx:2993-3009`
- **Issue**: Message content wrapped in `<p>` (line 2993) but inside flex container divs; React warns about block element inside flex
- **Evidence**: Line 2993 shows `<p>` containing TypingMessage component

---

## B) CURRENT FLOW DIAGRAM

```
USER ACTION (Enter/Submit/Click)
    ↓
handleSend() [UnifiedAssistantChat.tsx:1107]
    ├─ Check sendLockRef (line 1109) ❌ RACE: Lock set AFTER checks
    ├─ Check isStreaming (line 1117)
    ├─ Validate message (line 1124-1127)
    ├─ Set sendLockRef = true (line 1130)
    ├─ beginTyping() (line 1210) ⚠️ Typing starts BEFORE placeholder
    ├─ Clear input (line 1213)
    └─ sendMessage() → usePrimeChat.send()
         ↓
usePrimeChat.send() [usePrimeChat.ts:747]
    ├─ Check inFlightRef (line 749) ✅ Guard exists
    ├─ Set inFlightRef = true (line 755)
    ├─ Add optimistic user message (line 787)
    ├─ Generate requestId (line 805)
    ├─ Set activeRequestIdRef (line 806)
    ├─ Create assistant placeholder (line 830-880) ✅ BEFORE fetch
    │   ├─ Check existingStreamingId (line 833)
    │   ├─ Create aiId (line 843)
    │   ├─ Store mapping: requestId → aiId (line 847)
    │   └─ Add placeholder to messages (line 879)
    ├─ Abort prior request (line 884)
    ├─ Set isStreaming = true (line 890)
    └─ attemptStream() [line 894]
         ↓
FETCH REQUEST
    ├─ Build requestBody (line 1009-1018)
    └─ fetch(endpoint) (line 1079)
         ↓
SSE STREAM PROCESSING [line 1208-1251]
    ├─ Read chunks (line 1210)
    ├─ Parse SSE events (line 1229-1243)
    └─ parseSSEEvent() [line 476]
         ├─ Check finalizedRequestIdsRef (line 656) ⚠️ Late check
         ├─ Check activeRequestIdRef (line 664) ⚠️ Late check
         ├─ Get messageId from mapping (line 672)
         ├─ Accumulate text (line 681-683)
         └─ Update message content (line 691-724) ✅ Updates existing
         ↓
STREAM COMPLETION [line 1265-1340]
    ├─ Get final content (line 1268)
    ├─ Check committedAssistantIdsRef (line 1272) ✅ Prevents double commit
    ├─ Update placeholder → final message (line 1290-1317) ✅ Update, not append
    ├─ Mark finalized (line 1384)
    ├─ Clear request state (line 1386-1391)
    └─ Set isStreaming = false (line 1394)
         ↓
ERROR HANDLING [line 1396-1609]
    ├─ AbortError → Cleanup (line 1397-1415) ✅
    ├─ Stream error → Fallback JSON (line 1421-1579)
    │   ├─ Check placeholder exists (line 1469)
    │   ├─ Update if found (line 1475-1488) ✅
    │   └─ Append if missing (line 1518) ❌ Creates duplicate
    └─ Outer error → Error message (line 1582-1609)
         ↓
CLEANUP [line 1610-1663]
    ├─ Clear inFlightRef (line 1618)
    ├─ Clear streamingIdRef (line 1617)
    ├─ Mark finalized (line 1620)
    └─ Clear request mappings (line 1621-1629)
```

**CRITICAL ISSUES IN FLOW**:
1. ⚠️ Typing starts BEFORE placeholder created (race condition)
2. ⚠️ SSE chunk guards checked AFTER parsing (should short-circuit earlier)
3. ❌ Fallback can append duplicate if placeholder missing
4. ❌ Send lock race window between validation and lock set

---

## C) CHAT CONTRACT SPEC

### Invariant 1: Exactly One Send Per User Action
- **Rule**: Single canonical send trigger; all paths (form submit, Enter key, button click) must route through ONE function
- **Enforcement**: Lock MUST be set BEFORE any validation checks; lock checked at function entry
- **Violation**: Duplicate user messages, double API calls

### Invariant 2: Exactly One Assistant Bubble Per RequestId
- **Rule**: One requestId → one placeholder → one finalized message; placeholder is created BEFORE fetch, updated during stream, finalized on completion
- **Enforcement**: `requestId → messageId` mapping created BEFORE fetch; all chunks update same messageId; fallback updates placeholder, never appends
- **Violation**: Duplicate assistant bubbles, multiple "Prime is typing" indicators

### Invariant 3: Placeholder Is The Streaming Bubble
- **Rule**: Placeholder created with `meta.is_streaming: true` BEFORE fetch; chunks update placeholder content; completion sets `is_streaming: false`
- **Enforcement**: No separate typing indicator when placeholder exists; typing indicator ONLY shown when no placeholder
- **Violation**: Both typing indicator AND placeholder visible simultaneously

### Invariant 4: Typing Indicator Inside Placeholder OR Separate (Never Both)
- **Rule**: If placeholder exists (`meta.is_streaming === true`), NO separate typing indicator. If no placeholder, typing indicator shown.
- **Enforcement**: `showNormalTyping = isStreaming && !hasStreamingAssistantBubble`; check must happen AFTER placeholder creation
- **Violation**: Double typing visuals, duplicate avatars

### Invariant 5: Exactly One Scroll Owner
- **Rule**: Single scroll container with `overflow-y-auto` and `flex-1 min-h-0`; all parents in flex chain must have `min-h-0`
- **Enforcement**: Scroll container ref MUST point to actual scroll element; parent chain validated for `min-h-0`
- **Violation**: Messages cut off, scroll not working, nested scroll containers

### Invariant 6: Input Pinned, Autoscroll Near Bottom
- **Rule**: Input bar sticky at bottom; autoscroll only when user near bottom (< 80px threshold) OR user just sent
- **Enforcement**: Scroll position tracked; autoscroll throttled during streaming; respects user scroll intent
- **Violation**: Input hidden, messages not visible, scroll jumps

### Invariant 7: Cleanup Always Runs
- **Rule**: On done/error/abort, cleanup MUST run: clear inFlightRef, clear streamingIdRef, mark finalized, clear request mappings
- **Enforcement**: Cleanup in `finally` blocks; request-scoped state cleared even on early return
- **Violation**: Stuck typing indicator, memory leaks, duplicate prevention breaks

---

## D) SINGLE SOURCE OF TRUTH DECISION

### Hook Ownership: `usePrimeChat` (via `useUnifiedChatEngine`)

**Responsibilities**:
- ✅ Send/stream/dedupe logic (`usePrimeChat.ts:747-1679`)
- ✅ Request-scoped state (`requestId`, `messageId` mapping)
- ✅ Streaming lifecycle (placeholder creation, chunk updates, finalization)
- ✅ Duplicate prevention guards (`inFlightRef`, `finalizedRequestIdsRef`, `committedAssistantIdsRef`)

**Current State**: Already owns send/stream/dedupe ✅

**Needs Fix**: 
- Move typing indicator logic INTO hook (currently in UnifiedAssistantChat)
- Ensure placeholder created BEFORE typing starts
- Lock send trigger at hook entry, not component level

### Component Ownership: `UnifiedAssistantChat`

**Responsibilities**:
- ✅ Scroll container setup and autoscroll
- ✅ Input bar rendering and pinning
- ✅ Message list rendering
- ✅ Typing indicator rendering (conditional on hook state)

**Current State**: Owns scroll/input ✅

**Needs Fix**:
- Fix scroll container ref to point to actual scroll element (not wrapper)
- Ensure parent flex chain has `min-h-0`
- Remove DOM nesting warning (`<p>` → `<div>`)

**Decision**: 
- **Hook**: `usePrimeChat` owns ALL send/stream/dedupe/typing state
- **Component**: `UnifiedAssistantChat` owns scroll/input/message rendering
- **Contract**: Component reads hook state; hook never touches DOM

---

## E) EMPLOYEE PLUG-IN PLAN

### Registry Location: `src/config/employeeDisplayConfig.ts` (UI) + `src/employees/registry.ts` (Backend)

**Current State**:
- ✅ `EMPLOYEE_DISPLAY_CONFIG` exists with UI fields (emoji, gradient, chatTitle, etc.)
- ✅ `employee_profiles` table exists with backend fields (slug, system_prompt, model, etc.)
- ✅ `usePrimeChat` maps employee slugs to EmployeeOverride type

**Proposed Unified Registry**: `src/agent/employees/employeeRegistry.ts`

```typescript
export interface EmployeeConfig {
  // Backend fields (from employee_profiles)
  slug: string;                    // Canonical slug (e.g., 'prime-boss')
  key: string;                    // Backend employee_slug (same as slug)
  systemPrompt: string;           // From employee_profiles.system_prompt
  model: string;                  // From employee_profiles.model
  temperature: number;            // From employee_profiles.temperature
  maxTokens: number;              // From employee_profiles.max_tokens
  capabilities: string[];          // From employee_profiles.capabilities
  toolsAllowed: string[];         // From employee_profiles.tools_allowed
  
  // UI fields (from EMPLOYEE_DISPLAY_CONFIG)
  displayName: string;            // Short name (e.g., 'Prime')
  subtitle: string;               // Role description
  avatar: string;                 // Emoji (e.g., '👑')
  theme: {
    gradient: string;             // Tailwind gradient classes
    accentColor: string;           // Primary accent color
    accentGlow: string;           // Radial glow class
    accentShadow: string;          // Shadow class
  };
  
  // Chat-specific
  chatTitle: string;              // Header title (e.g., 'Prime — Chat')
  chatSubtitle: string;            // Header subtitle
  chatQuickPrompts: string[];     // Suggested questions
}

export async function getEmployeeConfig(slug: string): Promise<EmployeeConfig | null> {
  // Merge employee_profiles + EMPLOYEE_DISPLAY_CONFIG
  // Return unified config
}
```

**How Chat Entry Sets Active Employee**:
- `UnifiedAssistantChat` receives `initialEmployeeSlug` prop
- Sets `currentEmployeeSlug` state (line 567)
- Passes to `useUnifiedChatEngine({ employeeSlug: currentEmployeeSlug })`
- Engine maps slug to EmployeeOverride and passes to `usePrimeChat`

**How UI Loads Config**:
- `UnifiedAssistantChat` calls `getEmployeeDisplayConfig(currentEmployeeSlug)` (line 570)
- Returns config from `EMPLOYEE_DISPLAY_CONFIG`
- Used for header, avatar, gradients, prompts

**How Engine Behavior Is Identical**:
- All employees use same `usePrimeChat` hook
- Same send/stream/dedupe logic
- Only difference: `employeeSlug` prop → backend routing
- UI differences come from `employeeDisplayConfig`, not engine

**Migration Path**:
1. Create `employeeRegistry.ts` that merges both sources
2. Update `UnifiedAssistantChat` to use registry
3. Update `usePrimeChat` to use registry for EmployeeOverride mapping
4. Deprecate `EMPLOYEE_DISPLAY_CONFIG` (keep for backward compat)

---

## F) MINIMAL PATCH PLAN (Max 3 Files)

### File 1: `src/hooks/usePrimeChat.ts`

**Changes**:
1. **Move send lock to hook entry** (line 747-754)
   - Set `inFlightRef.current = true` BEFORE any validation
   - Check lock at function entry, not after validation

2. **Create placeholder BEFORE typing starts** (line 830-880)
   - Move placeholder creation to BEFORE `beginTyping()` call
   - Currently created in `send()` but typing starts in component
   - **Fix**: Return placeholder messageId from `send()`, component uses it

3. **Short-circuit SSE chunk guards earlier** (line 648-669)
   - Check `finalizedRequestIdsRef` and `activeRequestIdRef` BEFORE parsing JSON
   - Move guards to top of `parseSSEEvent` function

4. **Fix fallback to never append** (line 1468-1518)
   - If placeholder missing, create it first, then update
   - Never append new message in fallback path

**Lines Changed**: ~50 lines

### File 2: `src/components/chat/UnifiedAssistantChat.tsx`

**Changes**:
1. **Remove send lock from component** (line 1104-1146)
   - Remove `sendLockRef` (hook already has `inFlightRef`)
   - Remove duplicate send signature check (hook handles dedupe)
   - Call `sendMessage()` directly, let hook handle locking

2. **Fix typing indicator timing** (line 1210, 2223-2234)
   - Don't call `beginTyping()` in component
   - Hook should return `isTyping` state based on placeholder existence
   - Component reads `isTyping && !hasStreamingAssistantBubble` from hook

3. **Fix scroll container ref** (line 3264, 3322)
   - Point `scrollContainerRef` to actual scroll element (line 3322), not wrapper
   - Or create separate ref for scroll element

4. **Fix DOM nesting warning** (line 2993-3009)
   - Change `<p>` to `<div>` for message content
   - Keep `<p>` only for text-only content (not components)

**Lines Changed**: ~80 lines

### File 3: `src/components/prime/PrimeSlideoutShell.tsx`

**Changes**:
1. **Ensure parent flex chain has min-h-0** (line 287)
   - Add explicit `min-h-0` to parent container (line 287)
   - Verify all flex parents in chain have `min-h-0`

**Lines Changed**: ~5 lines

**Total Changes**: ~135 lines across 3 files

---

## IMPLEMENTATION ORDER

1. **Patch File 1** (`usePrimeChat.ts`): Fix send lock, placeholder timing, SSE guards, fallback
2. **Patch File 2** (`UnifiedAssistantChat.tsx`): Remove duplicate locks, fix typing timing, fix scroll ref, fix DOM nesting
3. **Patch File 3** (`PrimeSlideoutShell.tsx`): Fix flex chain

**Testing Checklist**:
- [ ] Send message → exactly one user bubble
- [ ] Send message → exactly one assistant placeholder → one final message
- [ ] Typing indicator shows ONLY when no placeholder
- [ ] Scroll container scrolls correctly, messages not cut off
- [ ] No DOM nesting warnings in console
- [ ] Multiple rapid sends → only first processes
- [ ] Stream error → fallback updates placeholder, no duplicate

---

## SUMMARY

**Root Causes Identified**: 6 (send race, fallback append, late SSE guards, typing timing, scroll ref mismatch, DOM nesting)

**Contract Defined**: 7 invariants covering send, stream, typing, scroll, cleanup

**Single Source**: Hook owns send/stream/dedupe/typing; Component owns scroll/input/rendering

**Plug-In Plan**: Unified registry merges backend + UI config; all employees use same engine

**Patch Plan**: 3 files, ~135 lines, fixes all root causes

**Next Steps**: Implement patches in order, test against checklist, verify contract holds




