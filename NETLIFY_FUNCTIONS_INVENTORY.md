# Netlify Functions Inventory

This document lists all Netlify functions deployed in the repository.

## Function Endpoints (46 Total)

### 🗨️ Chat & Communication Functions

1. **`chat.ts`** - Main chat endpoint (v3, production-ready)
   - Route: `/.netlify/functions/chat`
   - Features: Rate limiting, session management, PII masking, guardrails, memory/RAG, employee routing

2. **`chat-v2.ts`** - Chat endpoint v2 (legacy)
   - Route: `/.netlify/functions/chat-v2`

3. **`chat-v3-production.ts`** - Chat endpoint v3 production variant
   - Route: `/.netlify/functions/chat-v3-production`

4. **`prime-chat.ts`** - Prime AI chat handler
   - Route: `/.netlify/functions/prime-chat`

5. **`prime-intro.ts`** - Prime introduction/autogreet
   - Route: `/.netlify/functions/prime-intro`

6. **`prime-handoff.ts`** - Prime delegation/handoff handler
   - Route: `/.netlify/functions/prime-handoff`

### 📄 OCR & Document Processing

7. **`byte-ocr-parse.ts`** - Byte OCR parsing function
   - Route: `/.netlify/functions/byte-ocr-parse`

8. **`ocr.ts`** - General OCR function
   - Route: `/.netlify/functions/ocr`

9. **`ocr-receipt.ts`** - Receipt OCR processing
   - Route: `/.netlify/functions/ocr-receipt`

10. **`guardrails-process.ts`** - Guardrails processing for ingestion
    - Route: `/.netlify/functions/guardrails-process`

### 🏷️ Tag AI Categorization Functions

11. **`tag-categorize.ts`** - Main Tag categorization endpoint
    - Route: `/.netlify/functions/tag-categorize`

12. **`tag-batch-categorize.ts`** - Batch categorization
    - Route: `/.netlify/functions/tag-batch-categorize`

13. **`tag-brain-update.ts`** - Tag AI brain/model updates
    - Route: `/.netlify/functions/tag-brain-update`

14. **`tag-why.ts`** - Tag explanation endpoint
    - Route: `/.netlify/functions/tag-why`

15. **`tag-export-corrections.ts`** - Export categorization corrections
    - Route: `/.netlify/functions/tag-export-corrections`

### 💎 Crystal Analytics Functions

16. **`crystal-analyze-import.ts`** - Crystal analytics for imports
    - Route: `/.netlify/functions/crystal-analyze-import`

17. **`analytics-categorization.ts`** - Analytics categorization
    - Route: `/.netlify/functions/analytics-categorization`

### 🔔 Notification Functions

18. **`notifications.ts`** - Main notifications endpoint
    - Route: `/.netlify/functions/notifications`

19. **`notifications-get.ts`** - Get notifications
    - Route: `/.netlify/functions/notifications-get`

20. **`notifications-read.ts`** - Mark notifications as read
    - Route: `/.netlify/functions/notifications-read`

21. **`notifications-orchestrate.ts`** - Notification orchestration
    - Route: `/.netlify/functions/notifications-orchestrate`

22. **`orchestrate-notifications.ts`** - Alternative notification orchestration
    - Route: `/.netlify/functions/orchestrate-notifications`

### 💾 Transaction & Data Functions

23. **`transactions-list.ts`** - List transactions
    - Route: `/.netlify/functions/transactions-list`

24. **`tx-list-latest.ts`** - Get latest transactions
    - Route: `/.netlify/functions/tx-list-latest`

25. **`categorize-transactions.ts`** - Categorize transactions
    - Route: `/.netlify/functions/categorize-transactions`

26. **`category-correct.ts`** - Category correction
    - Route: `/.netlify/functions/category-correct`

27. **`commit-import.ts`** - Commit import data
    - Route: `/.netlify/functions/commit-import`

### 🛠️ Tool Functions (in `tools/` subdirectory)

28. **`tools/email-search.ts`** - Email search tool
    - Route: `/.netlify/functions/tools/email-search`

29. **`tools/email-fetch-attachments.ts`** - Fetch email attachments
    - Route: `/.netlify/functions/tools/email-fetch-attachments`

30. **`tools/get-transactions.ts`** - Get transactions tool
    - Route: `/.netlify/functions/tools/get-transactions`

31. **`tools/get-needs-review.ts`** - Get items needing review
    - Route: `/.netlify/functions/tools/get-needs-review`

32. **`tools/get-recent-imports.ts`** - Get recent imports
    - Route: `/.netlify/functions/tools/get-recent-imports`

33. **`tools/get-recent-import-summary.ts`** - Get recent import summary
    - Route: `/.netlify/functions/tools/get-recent-import-summary`

### 🧠 Memory & Context Functions

34. **`memory.ts`** - Memory operations
    - Route: `/.netlify/functions/memory`

35. **`memory_capabilities.ts`** - Memory capabilities endpoint
    - Route: `/.netlify/functions/memory_capabilities`

### 📊 Summary & History Functions

36. **`summary.ts`** - Generate summaries
    - Route: `/.netlify/functions/summary`

37. **`history.ts`** - Get history
    - Route: `/.netlify/functions/history`

### 🔒 Security & Guardrails Functions

38. **`guardrail-config-get.ts`** - Get guardrail configuration
    - Route: `/.netlify/functions/guardrail-config-get`

39. **`guardrail-config-save.ts`** - Save guardrail configuration
    - Route: `/.netlify/functions/guardrail-config-save`

40. **`security-status.ts`** - Security status endpoint
    - Route: `/.netlify/functions/security-status`

### 🧪 Testing & Diagnostic Functions

41. **`test.ts`** - Test endpoint
    - Route: `/.netlify/functions/test`

42. **`selftest.ts`** - Self-test endpoint
    - Route: `/.netlify/functions/selftest`

43. **`diag.ts`** - Diagnostics endpoint
    - Route: `/.netlify/functions/diag`

### 🗂️ Prime Functions

44. **`prime/segmentation.ts`** - Prime segmentation
    - Route: `/.netlify/functions/prime/segmentation`

### 📁 Legacy Functions (in `_legacy/` subdirectory)

45. **`_legacy/chat-complex.ts`** - Legacy complex chat
    - Route: `/.netlify/functions/_legacy/chat-complex`

46. **`_legacy/chat-stream.ts`** - Legacy streaming chat
    - Route: `/.netlify/functions/_legacy/chat-stream`

47. **`_legacy/chat-sse.ts`** - Legacy SSE chat
    - Route: `/.netlify/functions/_legacy/chat-sse`

### 🔧 Shared Utilities (Not Functions)

The following files in `netlify/functions/_shared/` are utility modules, not deployable functions:
- `pii.ts` - PII masking utilities
- `guardrails.ts` - Guardrails engine
- `memory.ts` - Memory utilities
- `tool_router.ts` - Tool routing
- `prime_router.ts` - Prime routing
- `rate-limit.ts` - Rate limiting
- `headers.ts` - Header utilities
- `supabase.ts` - Supabase client
- `openai_client.ts` - OpenAI client
- And many more shared utilities...

## Function Categories Summary

- **Chat Functions**: 5 (chat.ts, chat-v2.ts, chat-v3-production.ts, prime-chat.ts, prime-intro.ts, prime-handoff.ts)
- **OCR Functions**: 3 (byte-ocr-parse.ts, ocr.ts, ocr-receipt.ts)
- **Tag Functions**: 5 (tag-categorize.ts, tag-batch-categorize.ts, tag-brain-update.ts, tag-why.ts, tag-export-corrections.ts)
- **Crystal Functions**: 2 (crystal-analyze-import.ts, analytics-categorization.ts)
- **Notification Functions**: 4 (notifications.ts, notifications-get.ts, notifications-read.ts, notifications-orchestrate.ts, orchestrate-notifications.ts)
- **Transaction Functions**: 5 (transactions-list.ts, tx-list-latest.ts, categorize-transactions.ts, category-correct.ts, commit-import.ts)
- **Tool Functions**: 6 (in tools/ subdirectory)
- **Memory Functions**: 2 (memory.ts, memory_capabilities.ts)
- **Summary/History Functions**: 2 (summary.ts, history.ts)
- **Security Functions**: 3 (guardrail-config-get.ts, guardrail-config-save.ts, security-status.ts)
- **Testing Functions**: 3 (test.ts, selftest.ts, diag.ts)
- **Prime Functions**: 1 (prime/segmentation.ts)
- **Legacy Functions**: 3 (in _legacy/ subdirectory)

## Notes

- Functions are deployed to `/.netlify/functions/{function-name}`
- Functions in subdirectories use the full path (e.g., `/.netlify/functions/tools/email-search`)
- Legacy functions are in `_legacy/` but may still be deployed
- Shared utilities in `_shared/` are imported by functions but not deployed as endpoints
- The main production chat function is `chat.ts` (v3)

