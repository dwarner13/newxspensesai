# Phase 3.2 - Improve Handoff Context Passing - Implementation Plan

**Date**: November 20, 2025  
**Status**: 📋 Planning Complete - Ready for Implementation

---

## Current State

### Handoff Flow:
1. Employee calls `request_employee_handoff` tool
2. Backend updates session `employee_slug`
3. Backend inserts system message
4. **No context passed** - receiving employee starts fresh

### Issues:
- Receiving employee doesn't know what was discussed
- No conversation history passed
- No key facts extracted
- User has to repeat context

---

## Implementation Plan

### Step 1: Gather Context During Handoff

**When handoff occurs:**
1. Get recent messages (last 10 messages from session)
2. Extract key facts from memory (already available in `memoryFacts`)
3. Get user's original intent (current message)
4. Store in `handoffs` table

### Step 2: Load Handoff Context for Receiving Employee

**When receiving employee starts:**
1. Check for recent handoff (last 5 minutes, same session)
2. Load handoff context from database
3. Include in system prompt: "You're taking over from [employee]. Context: [summary]"
4. Mark handoff as used

### Step 3: Update System Prompt

**Format:**
```
You're taking over this conversation from [from_employee].

Context Summary:
[context_summary]

Key Facts:
- [fact1]
- [fact2]
...

Recent Conversation:
[recent messages formatted]

Reason for Handoff:
[reason]

User's Current Question:
[user_intent]
```

### Step 4: Frontend Display

**Show handoff context in UI:**
- Display handoff reason
- Show brief context summary
- Make it clear why employee switched

---

## Files to Modify

### Backend:
- ✅ `netlify/functions/chat.ts` - Gather context, store handoff, load context
- ✅ `supabase/migrations/20251120_add_handoff_context_fields.sql` - Database schema

### Frontend:
- ✅ `src/ui/hooks/useStreamChat.ts` - Display handoff context
- ✅ `src/components/chat/HandoffTransition.tsx` - New component (optional)

---

## Success Criteria

- ✅ Context gathered during handoff
- ✅ Context stored in database
- ✅ Receiving employee gets context in system prompt
- ✅ Handoff UI shows context and reason
- ✅ Seamless handoff experience



