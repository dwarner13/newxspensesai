# Phase 1.3 - Chat Endpoint Inventory

**Date**: November 20, 2025  
**Purpose**: Compare all chat endpoints to identify features and consolidate

---

## Current State

### ✅ Active Endpoint
- **`netlify/functions/chat.ts`** - Current canonical endpoint
  - Location: `netlify/functions/chat.ts`
  - Status: ✅ Active, used by all frontend code
  - Features:
    - ✅ Guardrails (unified guardrails layer)
    - ✅ Employee routing (via router.ts)
    - ✅ Memory retrieval (via memory.ts)
    - ✅ Tool calling (via tools/index.ts)
    - ✅ SSE streaming
    - ✅ Session management (via session.ts)
    - ✅ Token budgeting (via getRecentMessages)
    - ✅ Handoff support (request_employee_handoff)
    - ❌ Rate limiting (not implemented)
    - ❌ Usage logging (not implemented)

### ⚠️ Deprecated Endpoints

1. **`netlify/functions_old/chat-v3-production.ts`**
   - Location: `netlify/functions_old/chat-v3-production.ts`
   - Status: ⚠️ Already marked DEPRECATED in file header
   - Features:
     - ✅ Rate limiting (via rate-limit.ts)
     - ✅ Usage logging (chat_usage_log table)
     - ✅ Enhanced monitoring
     - ✅ Message IDs (UUID)
     - ✅ Token windowing (4k budget)
     - ⚠️ Uses older guardrails adapter
     - ⚠️ Hardcoded Prime/Crystal personas (not from DB)

2. **`netlify/functions_old/_legacy/chat-complex.ts`**
   - Status: ❌ Legacy, not used
   
3. **`netlify/functions_old/_legacy/chat-sse.ts`**
   - Status: ❌ Legacy, not used
   
4. **`netlify/functions_old/_legacy/chat-stream.ts`**
   - Status: ❌ Legacy, not used

---

## Feature Comparison

| Feature | chat.ts (Current) | chat-v3-production.ts | Status |
|---------|-------------------|----------------------|--------|
| **Guardrails** | ✅ Unified guardrails | ⚠️ Older adapter | ✅ Current is better |
| **Employee Routing** | ✅ Via router.ts | ⚠️ Hardcoded | ✅ Current is better |
| **Memory** | ✅ Via memory.ts | ✅ Via memory.ts | ✅ Same |
| **Tool Calling** | ✅ Full support | ❌ Not implemented | ✅ Current is better |
| **SSE Streaming** | ✅ Full support | ✅ Full support | ✅ Same |
| **Session Management** | ✅ Via session.ts | ✅ Via session.ts | ✅ Same |
| **Token Budgeting** | ✅ Via getRecentMessages | ✅ Via getRecentMessages | ✅ Same |
| **Handoff Support** | ✅ request_employee_handoff | ❌ Not implemented | ✅ Current is better |
| **Rate Limiting** | ❌ Not implemented | ✅ Via rate-limit.ts | ⚠️ Need to add |
| **Usage Logging** | ❌ Not implemented | ✅ chat_usage_log | ⚠️ Need to add |
| **Message IDs** | ⚠️ Partial | ✅ Full UUID support | ⚠️ Could enhance |
| **Monitoring** | ⚠️ Basic logging | ✅ Enhanced metrics | ⚠️ Could enhance |

---

## Decision: Canonical Endpoint

**✅ `netlify/functions/chat.ts` is the canonical endpoint**

**Rationale**:
- Already used by all frontend code
- Has modern features (unified guardrails, tool calling, handoff)
- Uses database-driven employee profiles
- Better architecture (uses shared modules)

**Missing Features to Add**:
- Rate limiting (from chat-v3-production.ts)
- Usage logging (from chat-v3-production.ts)
- Enhanced monitoring (optional, can add later)

---

## Frontend References

All frontend code already uses `CHAT_ENDPOINT` from `src/lib/chatEndpoint.ts`:
- ✅ `src/lib/chatEndpoint.ts` → Points to `/.netlify/functions/chat`
- ✅ `src/ui/hooks/useStreamChat.ts` → Uses `CHAT_ENDPOINT`
- ✅ `src/services/chatApi.ts` → Uses `CHAT_ENDPOINT`
- ✅ `src/lib/api/chat.ts` → Uses `/.netlify/functions/chat` directly
- ✅ `src/hooks/usePrimeChat.ts` → Uses `CHAT_ENDPOINT`

**No changes needed** - all frontend already points to canonical endpoint!

---

## Next Steps

1. ✅ Add rate limiting to `chat.ts`
2. ✅ Add usage logging to `chat.ts`
3. ✅ Ensure chat-v3-production.ts is clearly deprecated
4. ✅ Document the canonical API
5. ✅ Verify legacy endpoints are not referenced

---

**End of Inventory**



