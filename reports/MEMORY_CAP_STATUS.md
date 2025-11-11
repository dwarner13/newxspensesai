# 🧠 Memory & Brain Capabilities Status

**Generated**: 2025-11-06T02:29:56.988Z  
**Mode**: Code-only  
**Status**: ⚠️ Ready after 1 fixes

---

## 1. TL;DR

⚠️ Found 1 gaps:
- Missing X-Memory-Hit/X-Memory-Count headers

---

## 2. Memory: Code Wiring

### Code Signals
- ✅ recallInChat: true
- ✅ extractInChat: true
- ✅ embedStoreUsed: true
- ✅ headersPresent: false

### Tables (assumed from code references)
- ✅ user_memory_facts: Referenced
- ✅ memory_embeddings: Referenced
- ✅ chat_threads: Referenced
- ✅ chat_messages: Referenced
- ✅ chat_convo_summaries: Referenced

### RPC Functions
- ✅ match_memory_embeddings: true

---

## 3. Prompts

### Files Found
- `C:\Users\admin\Desktop\project-bolt-fixed\docs\PRIME_PROMPT.md`

### Role Prompts Detected
- ✅ Prime: true
- ✅ Tag: true
- ✅ Crystal: true
- ✅ Byte: true

### Integration
- ✅ Used in chat.ts: true

---

## 4. Brain (Router/Tools/Streaming)

### Router
- ✅ prime_router.ts: true

### Tools
Found 8 tool(s):
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\tools\email-fetch-attachments.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\tools\email-search.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\tools\get-needs-review.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\tools\get-recent-import-summary.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\tools\get-recent-imports.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\tools\get-transactions.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\tools\url-fetch.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\tools\_shared\email-scoring.ts`


### SSE Masking
- ✅ sse_mask_transform.ts: true
- ✅ X-Stream-Chunk-Count header: true

---

## 5. Endpoints

- ✅ /chat: true
- ✅ /ocr: true
- ✅ /bank_ingest: false

---

## 6. Tests

**Total**: 25 test file(s)

### Test Files
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\guardrails.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\memory.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\ocr_guardrails.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\ocr_handler.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\ocr_integration_memory.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\ocr_integration_tx.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\ocr_memory.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\ocr_normalize.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\ocr_parsers.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\ocr_providers.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\pii-patterns.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\prime_router.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\rate_limit.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\session_summaries.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\sse_mask_transform.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\sse_stream.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\transactions_api.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\transactions_store.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\netlify\functions\_shared\__tests__\xp.test.ts`
- `C:\Users\admin\Desktop\project-bolt-fixed\src\lib\user-status.test.ts`

... and 5 more

---

## 7. SQL Idempotency

**Patterns Found**: 304 (IF NOT EXISTS / ON CONFLICT DO NOTHING)

---

## 8. Next Steps Checklist

- [ ] Missing X-Memory-Hit/X-Memory-Count headers

---

**To re-run scan:**
```bash
pnpm memcap          # Code-only
pnpm memcap:live      # With live HTTP checks
```
