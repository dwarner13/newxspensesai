# Phase 3.1 - Add Tool Calling UI - Implementation Plan

**Date**: November 20, 2025  
**Status**: 📋 Planning Complete - Ready for Implementation

---

## Current State

### Backend (`chat.ts`):
- ✅ Tool calls are collected from OpenAI stream
- ✅ Tools are executed
- ❌ Tool events are NOT sent in SSE stream
- ❌ Tool results are NOT streamed back

### Frontend (`useStreamChat.ts`):
- ✅ Has handlers for `tool_call`, `tool_executing` events
- ❌ These events aren't being sent from backend
- ❌ Tool results aren't displayed

### Current UI:
- ⚠️ Some components show tool names in metadata (minimal)
- ❌ No detailed tool execution UI
- ❌ No tool results display
- ❌ No tool error display

---

## Implementation Plan

### Step 1: Update Backend to Send Tool Events

**File**: `netlify/functions/chat.ts`

**Changes:**
1. Send `tool_calling` event when tool call detected
2. Send `tool_executing` event before executing tool
3. Send `tool_result` event with results (formatted)
4. Send `tool_error` event if tool fails

**SSE Event Types:**
```typescript
{ type: 'tool_calling', tool: { id, name, arguments } }
{ type: 'tool_executing', tool: string }
{ type: 'tool_result', tool: string, result: any }
{ type: 'tool_error', tool: string, error: string }
```

### Step 2: Create Tool Execution Component

**File**: `src/components/chat/ToolExecution.tsx` (new)

**Features:**
- Show tool name
- Show loading state during execution
- Show tool results (formatted, collapsible)
- Show errors if tool fails
- Consistent styling with chat messages

### Step 3: Update Frontend Hook

**File**: `src/ui/hooks/useStreamChat.ts`

**Changes:**
- Add handlers for `tool_result` and `tool_error` events
- Update tool call status based on events
- Store tool results in message state

### Step 4: Update Chat Components

**Files**: 
- `src/components/chat/PrimeChatCentralized.tsx`
- `src/components/chat/ByteChatCentralized.tsx`
- Other chat components

**Changes:**
- Replace minimal tool indicator with `ToolExecution` component
- Display tool execution for each tool call
- Show results and errors

---

## SSE Event Flow

```
1. OpenAI stream → tool_call detected
   ↓
2. Send: { type: 'tool_calling', tool: {...} }
   ↓
3. Send: { type: 'tool_executing', tool: 'tag_explain_category' }
   ↓
4. Execute tool
   ↓
5. Send: { type: 'tool_result', tool: 'tag_explain_category', result: {...} }
   OR
   Send: { type: 'tool_error', tool: 'tag_explain_category', error: '...' }
```

---

## Tool Execution UI Design

### Component Structure:
```tsx
<ToolExecution 
  toolCall={{
    id: string,
    name: string,
    status: 'pending' | 'executing' | 'completed' | 'error',
    result?: any,
    error?: string
  }}
/>
```

### Visual States:
- **Pending**: Gray badge with tool name
- **Executing**: Animated spinner + tool name
- **Completed**: Green checkmark + tool name + collapsible results
- **Error**: Red alert + tool name + error message

---

## Files to Modify

### Backend:
- ✅ `netlify/functions/chat.ts` - Send tool events in SSE stream

### Frontend:
- ✅ `src/ui/hooks/useStreamChat.ts` - Handle tool events
- ✅ `src/components/chat/ToolExecution.tsx` - New component
- ✅ `src/components/chat/PrimeChatCentralized.tsx` - Use ToolExecution
- ✅ `src/components/chat/ByteChatCentralized.tsx` - Use ToolExecution
- ✅ `src/types/ai.ts` - Add tool_result and tool_error event types

---

## Success Criteria

- ✅ Tool execution visible in UI
- ✅ Tool results displayed (formatted, collapsible)
- ✅ Tool errors shown gracefully
- ✅ UI consistent with chat messages
- ✅ Loading states shown during execution
- ✅ Tests pass: tool execution shown correctly



