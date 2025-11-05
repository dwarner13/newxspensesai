# Employee Routing System

**Last Updated**: 2025-01-XX  
**Version**: 1.0

---

## Overview

The employee routing system automatically routes user requests to the appropriate AI employee based on intent detection. Routing uses **deterministic rules first**, then **LLM fallback** if confidence is low.

---

## Employees

### Prime 👑
**Role**: General chat, orchestration, planning, coordination  
**Slug**: `prime`  
**Use Cases**:
- General conversation
- Financial planning and advice
- Task coordination
- Default fallback

**System Prompt**: Strategic financial cofounder (safe, concise, actionable)

---

### Crystal 🔍
**Role**: Analytics, insights, metrics, trends, SEO  
**Slug**: `crystal`  
**Use Cases**:
- "Why did my expenses spike?"
- "Show me spending trends"
- "Generate insights"
- "Session summary"
- SEO analysis (RankMath, GSC)

**System Prompt**: Financial analyst focused on insights and trends

**Keywords**: `why`, `trend`, `summary`, `insights`, `KPI`, `metrics`, `analytics`, `rankmath`, `gsc`

---

### Tag 🏷️
**Role**: Categorization, transactions, receipts, PII masking, tax classification  
**Slug**: `tag`  
**Use Cases**:
- "Categorize this receipt"
- "Classify transactions"
- "Mask PII"
- "Tax categorization"
- "Canonical vendor names"

**System Prompt**: Transaction categorizer; outputs JSON `{merchant, amount, date, category, confidence}`

**Keywords**: `category`, `categorize`, `vendor`, `receipt`, `tax`, `PII`, `mask`, `transaction`, `classify`, `canonical`, `404`

---

### Byte 💻
**Role**: Code, tools, ingestion, OCR, parsing, debugging  
**Slug**: `byte`  
**Use Cases**:
- "OCR this PDF"
- "Parse this document"
- "Fix this error"
- "Debug this code"
- "Import pipeline"

**System Prompt**: Technical implementation and tool execution

**Keywords**: `code`, `function`, `error`, `stack trace`, `parse`, `OCR`, `PDF`, `pipeline`, `ingestion`, `import`, `debug`, `fix`, `bug`, `api`, `endpoint`

---

## Routing Algorithm

### Step 1: Intent Detection (Deterministic)

`detectIntent(text)` scans for keywords and returns an intent label:

```typescript
type IntentLabel = 
  | 'chat' 
  | 'analytics' 
  | 'categorization' 
  | 'code' 
  | 'email' 
  | 'finance' 
  | 'seo' 
  | 'ocr' 
  | 'ingestion' 
  | 'unknown';
```

**Mapping**:
- `categorization` → Tag (confidence: 0.8)
- `analytics` → Crystal (confidence: 0.8)
- `code` | `ocr` | `ingestion` → Byte (confidence: 0.8)
- `finance` → Crystal (if analysis-focused) or Prime (general) (confidence: 0.6-0.7)
- `seo` → Crystal (confidence: 0.7)
- `email` → Prime (confidence: 0.6)
- `chat` | `unknown` → Prime (confidence: 0.5)

---

### Step 2: LLM Fallback (If Confidence < 0.6)

If deterministic confidence is low, an LLM is consulted:

```typescript
const llmResult = await routeWithLLM(masked, intent);
if (llmResult.confidence > confidence) {
  employee = llmResult.employee;
  reason = llmResult.reason;
  confidence = llmResult.confidence;
}
```

**LLM Prompt**: Includes employee descriptions and user request, returns JSON with `employee`, `reason`, `confidence`.

---

### Step 3: Logging

All routing decisions are logged to `orchestration_events`:

```typescript
await logOrchestrationEvent({
  userId,
  convoId,
  employee,
  confidence,
  reason
});
```

**Non-blocking**: Logging failures don't block requests.

---

## Routing Rules

### Keyword Matching

**Tag**:
- `category`, `categorize`, `vendor`, `merchant`, `receipt`, `tax`, `PII`, `mask`, `transaction`, `classify`, `canonical`, `404`

**Crystal**:
- `why`, `trend`, `summary`, `insights`, `KPI`, `metrics`, `analytics`, `rankmath`, `gsc`, `spending`, `expenses`, `forecast`, `budget`

**Byte**:
- `code`, `function`, `error`, `stack trace`, `parse`, `OCR`, `PDF`, `pipeline`, `ingestion`, `import`, `debug`, `fix`, `bug`, `api`, `endpoint`

**Prime**:
- Default fallback
- General finance questions
- Email-related requests

---

### Confidence Thresholds

- **High (≥ 0.8)**: Deterministic keyword match
- **Medium (0.6-0.7)**: Pattern match or LLM confirmation
- **Low (< 0.6)**: Triggers LLM fallback
- **Very Low (< 0.5)**: Defaults to Prime

---

## Overrides

### Manual Override (Future)

Users can specify employee via `employeeSlug` parameter:

```typescript
POST /chat
{
  "userId": "user-123",
  "message": "Help me",
  "employeeSlug": "crystal" // Override routing
}
```

**Note**: Manual override not yet implemented; routing is automatic.

---

## Examples

### Example 1: Categorization
**Input**: "Categorize this receipt from Walmart"  
**Intent**: `categorization`  
**Employee**: Tag  
**Confidence**: 0.8  
**Reason**: "Detected categorization/receipt/tax intent"

---

### Example 2: Analytics
**Input**: "Why did my expenses spike in July?"  
**Intent**: `analytics`  
**Employee**: Crystal  
**Confidence**: 0.8  
**Reason**: "Detected analytics/insights/metrics intent"

---

### Example 3: OCR
**Input**: "OCR this PDF then parse it"  
**Intent**: `ocr`  
**Employee**: Byte  
**Confidence**: 0.8  
**Reason**: "Detected code/tools/OCR/ingestion intent"

---

### Example 4: Low Confidence
**Input**: "Help me with my finances"  
**Intent**: `finance`  
**Initial Employee**: Prime (confidence: 0.6)  
**LLM Fallback**: Crystal (confidence: 0.75)  
**Final Employee**: Crystal  
**Reason**: "LLM detected financial analysis intent"

---

## Response Headers

Routing results are exposed via headers:

- `X-Employee`: `prime` | `crystal` | `tag` | `byte`
- `X-Route-Confidence`: `0.00` - `1.00`

---

## Monitoring

Routing decisions are logged to `orchestration_events` table:

```sql
SELECT 
  employee,
  AVG(confidence) as avg_confidence,
  COUNT(*) as count
FROM orchestration_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY employee;
```

---

## Best Practices

1. **PII Masking**: All routing text is masked before processing
2. **Non-blocking Logging**: Logging failures don't block requests
3. **Graceful Fallback**: Low confidence → LLM → Prime (if LLM fails)
4. **Idempotent**: Routing is deterministic for same input

---

## See Also

- `netlify/functions/_shared/prime_router.ts` - Routing implementation
- `netlify/functions/_shared/sql/day6_orchestration_events.sql` - Logging schema
- `reports/DAY6_CHANGELOG.md` - Routing implementation details
- `docs/HEADERS.md` - Response headers documentation

