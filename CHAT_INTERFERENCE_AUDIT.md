# Chat Interference Audit - Prime Chat Page

## Interference Map

### File: `src/pages/dashboard/PrimeChatPage.tsx`
**Line 119-131**: Renders `<UnifiedAssistantChat>` component
- **Component**: `UnifiedAssistantChat`
- **Props**: 
  - `isOpen={true}` 
  - `initialEmployeeSlug="prime-boss"`
  - `mode="inline"`
  - `renderMode="page"`
  - `showTypingIndicator={false}`
- **Issue**: Component still mounts chat engine via `useUnifiedChatEngine` hook

### File: `src/components/chat/UnifiedAssistantChat.tsx`
**Line 120-137**: Calls `useUnifiedChatEngine` hook
- **Hook**: `useUnifiedChatEngine`
- **Issue**: Always initializes chat runtime regardless of `renderMode="page"`
- **Impact**: Chat engine mounts, subscribes to messages, initializes streaming

### File: `src/hooks/useUnifiedChatEngine.ts`
**Line 126**: Wraps `usePrimeChat` hook
- **Hook**: `usePrimeChat`
- **Issue**: Initializes chat session, loads messages, sets up streaming

## Root Cause

`UnifiedAssistantChat` component always initializes the chat engine via `useUnifiedChatEngine`, even when `renderMode="page"`. The `renderMode` prop only controls UI rendering (typing indicators), not engine initialization.

## Solution

Add `disableRuntime` prop to `UnifiedAssistantChat`:
- When `disableRuntime=true` or `renderMode="page"`: Do not call `useUnifiedChatEngine`
- Render static UI only (header, welcome card, launcher button)
- No message list, no input, no streaming



