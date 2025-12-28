# Backend Context Injection System

## Overview

The Backend Context Injection system ensures **every AI employee automatically understands the user's fluency level and preferences** before processing any request. This is injected into system messages for:

- ✅ Chat responses
- ✅ OCR explanations
- ✅ Categorization explanations
- ✅ Financial insights
- ✅ Planning or forecasting responses

## Implementation

### Shared Utility

**File**: `netlify/functions/_shared/contextInjection.ts`

Provides:
- `buildContextInjection()` - Fetches user profile and builds context injection
- `injectContextIntoMessages()` - Injects context into OpenAI messages array
- `getContextData()` - Lightweight function to get context data only

### Context Structure

```typescript
{
  "ai_fluency_level": "<Explorer | Builder | Operator | Strategist | Architect>",
  "ai_fluency_score": "<0–100 (internal only, do not expose)>",
  "user_currency": "<currency>",
  "user_preferences": {
    "primary_goal": "...",
    "proactivity_level": "...",
    "account_type": "...",
    "timezone": "...",
    "date_locale": "..."
  },
  "memory_enabled": true
}
```

## Usage Pattern

### Step 1: Import the utility

```typescript
import { buildContextInjection, injectContextIntoMessages } from './_shared/contextInjection.js';
```

### Step 2: Build context injection

```typescript
const contextInjection = await buildContextInjection(sb, userId);
```

### Step 3: Inject into messages

```typescript
const messages = [
  { role: 'system', content: systemMessage },
  { role: 'user', content: userPrompt },
];

const messagesWithContext = contextInjection
  ? injectContextIntoMessages(messages, contextInjection.systemMessageBlock)
  : messages;
```

### Step 4: Use in OpenAI call

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: messagesWithContext,
  // ... other options
});
```

## Endpoints Updated

### ✅ Chat Endpoint (`chat.ts`)
- Already uses context injection
- Updated to use shared utility for consistency

### ✅ Document Insights (`document-insights.ts`)
- Now injects context before OpenAI calls
- Ensures Prime adapts when answering document questions

### 🔄 Other Endpoints (To Be Updated)

The following endpoints should be updated to use context injection:

1. **OCR Endpoints** (`ocr.ts`, `byte-ocr-parse.ts`, `smart-import-ocr.ts`)
   - When generating OCR explanations
   - When summarizing documents

2. **Tag Endpoints** (`tag-explain.ts`, `tag-learn.ts`)
   - When explaining categorization decisions
   - When learning from user corrections

3. **Financial Insights** (any endpoint generating insights)
   - When providing spending analysis
   - When generating forecasts

## What This Achieves

✅ **No UI changes** - Works entirely in backend  
✅ **No UX disruption** - Users feel the intelligence, not told about it  
✅ **No duplication** - Single source of truth for context  
✅ **Consistent behavior** - Prime + all employees adapt automatically  
✅ **Enterprise-grade** - Standard pattern for adaptive AI systems

## Context Injection Rule

**Before sending a request to any AI employee:**

1. ✅ Fetch the user's profile record
2. ✅ Inject context into the system message
3. ✅ AI must adapt behavior automatically
4. ✅ Do not expose fluency logic unless user asks

## Testing Checklist

- [ ] Chat responses adapt to fluency level
- [ ] Document insights adapt to fluency level
- [ ] OCR explanations adapt to fluency level
- [ ] Categorization explanations adapt to fluency level
- [ ] All endpoints use shared utility (no duplication)
- [ ] Context gracefully falls back to defaults if profile missing
- [ ] No performance impact (context injection is fast)

## Migration Path

1. ✅ Create shared utility (`contextInjection.ts`)
2. ✅ Update chat endpoint to use shared utility
3. ✅ Update document-insights endpoint
4. 🔄 Update OCR endpoints (next)
5. 🔄 Update Tag endpoints (next)
6. 🔄 Update any other AI endpoints (next)

## Notes

- Context injection is **non-blocking** - if it fails, endpoint continues with default context
- Context is **cached** at the request level (fetched once per request)
- Default context is **Explorer** level if profile doesn't exist
- Context includes **currency** and **preferences** automatically




