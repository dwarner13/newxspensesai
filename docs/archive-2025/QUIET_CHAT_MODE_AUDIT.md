# Quiet Chat Mode - Audit & Documentation

## Overview

**Quiet Chat Mode** is an intentional, reversible feature flag system designed to suppress console noise and background side-effects during OCR/Smart Import debugging. This is **NOT a bug** and **NOT a refactor** - it's a deliberate gating mechanism that can be fully re-enabled via environment flags.

## Feature Flags

All flags are set in `.env.local`:

- `VITE_CHAT_QUIET_MODE` - Mutes console logging in DEV
- `VITE_DISABLE_AUTO_HANDOFFS` - Disables automatic employee handoffs
- `VITE_DISABLE_POST_IMPORT_TRIGGERS` - Disables post-import AI triggers

## Files Modified

### 1. Console Logging Gates

#### `src/lib/logger.ts`
- **Purpose**: Central logger utility that gates console output
- **Behavior**: 
  - `log()` and `warn()` respect `VITE_CHAT_QUIET_MODE` (muted when enabled)
  - `debug()` and `info()` are NO-OP by default (require `localStorage.DEBUG_LOGS === '1'`)
  - `error()` ALWAYS prints (never muted)
- **Re-enable**: Remove `VITE_CHAT_QUIET_MODE` from `.env.local` or set to `false`

#### `src/main.tsx`
- **Purpose**: Global console muting in DEV mode
- **Behavior**: Overrides `console.log`, `console.info`, `console.debug`, `console.warn` with no-op functions when `VITE_CHAT_QUIET_MODE=true` in DEV
- **Note**: `console.error` remains active (never muted)
- **Re-enable**: Remove `VITE_CHAT_QUIET_MODE` from `.env.local` or set to `false`

### 2. Automatic Employee Handoff Gates

#### `src/components/chat/UnifiedAssistantChat.tsx` (Line ~825)
- **Purpose**: Prevents automatic employee handoffs when `VITE_DISABLE_AUTO_HANDOFFS=true`
- **Behavior**: 
  - Ignores `engineActiveEmployeeSlug` changes that would trigger auto-handoff
  - Manual employee switching still works
  - Chat remains fully functional
- **Re-enable**: Remove `VITE_DISABLE_AUTO_HANDOFFS` from `.env.local` or set to `false`

#### `src/hooks/usePrimeChat.ts` (Lines ~528, ~596)
- **Purpose**: Prevents SSE handoff events and `request_employee_handoff` tool execution
- **Behavior**:
  - Ignores `handoff` events from SSE stream
  - Ignores `tool_executing` events for `request_employee_handoff` tool
  - Manual employee switching still works
- **Re-enable**: Remove `VITE_DISABLE_AUTO_HANDOFFS` from `.env.local` or set to `false`

#### `src/ui/hooks/useStreamChat.ts` (Line ~261)
- **Purpose**: Prevents handoff events in legacy stream chat hook
- **Behavior**: Ignores `handoff` events from stream
- **Re-enable**: Remove `VITE_DISABLE_AUTO_HANDOFFS` from `.env.local` or set to `false`

### 3. Post-Import Trigger Gates

#### `src/components/chat/UnifiedAssistantChat.tsx` (Line ~1604)
- **Purpose**: Prevents post-import chat messages when `VITE_DISABLE_POST_IMPORT_TRIGGERS=true`
- **Behavior**: 
  - Ignores `BYTE_IMPORT_COMPLETED` events
  - OCR/import still complete and persist
  - Only chat messages are suppressed
- **Re-enable**: Remove `VITE_DISABLE_POST_IMPORT_TRIGGERS` from `.env.local` or set to `false`

#### `src/hooks/usePostImportHandoff.ts` (Line ~39)
- **Purpose**: Prevents background AI calls after import completion
- **Behavior**:
  - Skips `categorize-transactions` endpoint call
  - Skips `crystal-analyze-import` endpoint call
  - OCR/import still complete and persist
  - Only background AI triggers are suppressed
- **Re-enable**: Remove `VITE_DISABLE_POST_IMPORT_TRIGGERS` from `.env.local` or set to `false`

### 4. Background Polling Gates

#### `src/hooks/useActivityFeed.ts` (Line ~92)
- **Purpose**: Pauses activity feed polling when `VITE_CHAT_QUIET_MODE=true`
- **Behavior**:
  - Skips `fetchEvents()` calls
  - Sets loading/error states to false
  - Returns empty events array
  - AbortError is ignored (not treated as failure)
- **Re-enable**: Remove `VITE_CHAT_QUIET_MODE` from `.env.local` or set to `false`

## Behavior Verification

### ✅ Console Logging
- **Intent**: Suppress console spam during debugging
- **Actual**: 
  - `log()` and `warn()` are muted when `VITE_CHAT_QUIET_MODE=true`
  - `error()` always prints (never muted)
  - Global console muting in `main.tsx` works in DEV only
- **Status**: ✅ Matches intent

### ✅ Automatic Handoffs
- **Intent**: Prevent handoff storms during debugging
- **Actual**:
  - All three handoff gates (UnifiedAssistantChat, usePrimeChat, useStreamChat) respect `VITE_DISABLE_AUTO_HANDOFFS`
  - Manual employee switching still works
  - Chat remains functional
- **Status**: ✅ Matches intent

### ✅ Post-Import Triggers
- **Intent**: Suppress background AI calls after import
- **Actual**:
  - `categorize-transactions` is skipped when `VITE_DISABLE_POST_IMPORT_TRIGGERS=true`
  - `crystal-analyze-import` is skipped when `VITE_DISABLE_POST_IMPORT_TRIGGERS=true`
  - OCR/import still complete and persist
  - Only background triggers are gated
- **Status**: ✅ Matches intent

### ✅ Activity Feed Polling
- **Intent**: Pause background polling noise
- **Actual**:
  - Polling is skipped when `VITE_CHAT_QUIET_MODE=true`
  - AbortError is ignored
  - No UI changes
- **Status**: ✅ Matches intent

## Re-Enable Path

All gates can be re-enabled by removing the corresponding environment variable from `.env.local` or setting it to `false`:

```bash
# Re-enable console logging
# Remove or set: VITE_CHAT_QUIET_MODE=false

# Re-enable automatic handoffs
# Remove or set: VITE_DISABLE_AUTO_HANDOFFS=false

# Re-enable post-import triggers
# Remove or set: VITE_DISABLE_POST_IMPORT_TRIGGERS=false
```

**Note**: After changing environment variables, restart the dev server (Vite reads env at startup).

## Code Comments Added

All quiet mode gates now include explanatory comments:
- **Purpose**: Why the gate exists
- **Behavior**: What it does
- **Re-enable**: How to turn it off
- **Clarification**: This is NOT a bug

## Summary

- **Total Files Modified**: 7
- **Total Gates Added**: 8
- **All Gates Documented**: ✅
- **All Gates Reversible**: ✅
- **No UI/CSS/Layout Changes**: ✅
- **No Architecture Refactoring**: ✅
- **Behavior Matches Intent**: ✅

## Intentional Design Decisions

1. **Console muting is global** - Applied at bootstrap (`main.tsx`) to catch all modules
2. **Error logging always active** - Critical errors must always be visible
3. **Manual controls still work** - Only automatic behaviors are gated
4. **Import/OCR still complete** - Only side-effects are suppressed, not core functionality
5. **Reversible via env flags** - No code changes needed to re-enable

---

**Last Updated**: 2025-01-XX
**Status**: ✅ Audited and Documented


