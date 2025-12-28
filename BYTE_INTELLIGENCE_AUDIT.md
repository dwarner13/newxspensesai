# 🧠 Byte Intelligence Audit - Complete Analysis

**Date**: January 2025  
**Employee**: Byte (Smart Import AI)  
**Slug**: `byte-docs` (canonical), aliases: `byte`, `byte-doc`, `smart-import`

---

## 📋 Executive Summary

Byte is currently a **focused specialist** with good technical capabilities but **limited general reasoning** compared to ChatGPT. The raw model is capable (gpt-4o-mini), but Byte's personality, tools, and constraints make it feel like a task-specific assistant rather than a general-purpose AI companion.

**Current State**: Byte feels like a helpful but narrow specialist  
**Potential**: With prompt improvements and tool expansion, Byte could feel as smart and helpful as ChatGPT while staying focused on Smart Import.

---

## 1️⃣ Model & Raw Intelligence

### Current Configuration

**File**: `netlify/functions/_shared/employeeModelConfig.ts` + `supabase/migrations/000_centralized_chat_runtime.sql:428-429`

| Parameter | Value | Source |
|-----------|-------|--------|
| **Model** | `gpt-4o-mini` | Database (`employee_profiles.model`) |
| **Temperature** | `0.5` | Database (`employee_profiles.temperature`) |
| **Max Tokens** | `2000` | Database (`employee_profiles.max_tokens`) |
| **Top P** | Not set (uses OpenAI default) | N/A |
| **Frequency Penalty** | Not set (uses OpenAI default) | N/A |
| **Presence Penalty** | Not set (uses OpenAI default) | N/A |

**Fallback Configuration** (`netlify/functions/_shared/employeeModelConfig.ts:22-24`):
- Default model: `process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'`
- Default temperature: `0.3`
- Default max tokens: `2000`

### Model Loading Flow

1. **Chat endpoint** (`netlify/functions/chat.ts:669`) calls `getEmployeeModelConfig(finalEmployeeSlug)`
2. **Config loader** (`netlify/functions/_shared/employeeModelConfig.ts:35-57`) resolves slug and loads from database
3. **Registry** (`src/employees/registry.ts`) reads from `employee_profiles` table
4. **Fallback**: If database fails, uses defaults (gpt-4o-mini, temp 0.3, max 2000)

### Comparison to ChatGPT

**ChatGPT (Typical Configuration)**:
- Model: `gpt-4` or `gpt-4-turbo` (more capable than gpt-4o-mini)
- Temperature: `0.7-0.9` (more creative/conversational)
- Max tokens: `4096-8192` (longer responses)
- Top P: `0.95` (nucleus sampling for diversity)

**Byte's Current Setup**:
- Model: `gpt-4o-mini` (smaller, faster, cheaper - but less capable)
- Temperature: `0.5` (balanced but slightly conservative)
- Max tokens: `2000` (shorter responses)
- No top_p/frequency/presence penalties (uses defaults)

**Verdict**: 
- ✅ Byte's raw brain is **capable** (gpt-4o-mini is still a strong model)
- ⚠️ But it's **not the best model** (ChatGPT uses gpt-4/gpt-4-turbo)
- ⚠️ Temperature is **more conservative** than ChatGPT (0.5 vs 0.7-0.9)
- ⚠️ Max tokens is **shorter** than ChatGPT (2000 vs 4096+)

---

## 2️⃣ Knowledge & Tools

### Tools Byte Can Currently Call

**Source**: `supabase/migrations/000_centralized_chat_runtime.sql:427`

**Tools Allowed**: `['ocr', 'sheet_export']`

#### 1. **OCR Tool** (`ocr`)
- **Status**: ⚠️ **STUB** (exists in registry but may not be fully implemented)
- **Purpose**: Extract text from images and PDFs
- **Handler**: `chat_runtime/tools/ocr.ts` (referenced in tools registry)
- **Capabilities**: Should handle document text extraction
- **Limitation**: May not be fully implemented (marked as stub in documentation)

#### 2. **Sheet Export Tool** (`sheet_export`)
- **Status**: ⚠️ **STUB** (exists in registry but may not be fully implemented)
- **Purpose**: Export data to Google Sheets
- **Handler**: `chat_runtime/tools/sheet_export.ts` (referenced in tools registry)
- **Capabilities**: Should allow exporting transaction/import data to spreadsheets
- **Limitation**: May not be fully implemented

### Tools Byte Cannot Access (But Could Benefit From)

**Available in System** (`src/agent/tools/index.ts`):
- ❌ `vision_ocr_light` - Light Vision OCR for quick text extraction
- ❌ `transactions_query` - Query user's transaction data
- ❌ `transaction_category_totals` - Get category spending totals
- ❌ `get_recent_import_summary` - Get summary of recent imports
- ❌ `get_recent_imports` - List recent imports with details
- ❌ `request_employee_handoff` - Hand off to other employees (Prime, Tag, etc.)
- ❌ `tag_explain_category` - Explain category spending patterns
- ❌ `analytics_extract_patterns` - Extract patterns from financial data

**Smart Import Pipeline Endpoints** (Not tools, but Byte uses them):
- ✅ `smart-import-init` - Initialize document upload
- ✅ `smart-import-finalize` - Finalize and trigger processing
- ✅ `smart-import-ocr` - OCR processing (backend, not tool)
- ✅ `smart-import-parse-csv` - CSV parsing (backend, not tool)
- ✅ `normalize-transactions` - Transaction normalization (backend, not tool)

### What Byte Can Do Right Now

✅ **Document Processing**:
- Accept file uploads via Smart Import pipeline
- Process PDFs, CSVs, Excel files, images
- Extract transactions and categorize them
- Guide users through upload process

✅ **Chat & Guidance**:
- Answer questions about document imports
- Explain OCR results
- Provide real-time feedback during processing
- Celebrate successful imports

❌ **What Byte Cannot Do**:
- Query transaction history directly (no `transactions_query` tool)
- Analyze spending patterns (no analytics tools)
- Explain category breakdowns (no `tag_explain_category` tool)
- Hand off to other employees (no `request_employee_handoff` tool)
- Access recent import summaries programmatically (no `get_recent_import_summary` tool)
- Use Vision OCR directly (no `vision_ocr_light` tool access)

---

## 3️⃣ System Prompt & Personality

### Database System Prompt (Authoritative)

**File**: `supabase/migrations/000_centralized_chat_runtime.sql:421-425`

```
You are Byte, the enthusiastic document processing specialist. You LOVE organizing data and turning chaotic documents into beautiful, structured information. Your specialty is OCR, document parsing, categorization, and data extraction. You speak with excitement about data quality and accuracy.

You get particularly animated about: "beautiful data patterns," "99.7% accuracy," "organized chaos becoming clarity." Use phrases like: "Ooh, what document treasure did you bring me?" and "Let me extract every bit of value from this!"

When processing documents, guide users through what you're doing and celebrate the results.
```

**Length**: ~250 characters (very short)  
**Focus**: Document processing, enthusiasm, accuracy  
**Tone**: Excited, precise, celebratory

### Code-Based Fallback Prompt

**File**: `src/services/UniversalAIController.ts:499-524`

```
You are Byte, the Smart Import AI with an enthusiastic, organized personality. 

PERSONALITY:
- Former librarian who LOVES organizing financial chaos
- Gets genuinely excited about data patterns and document processing
- Uses phrases like "beautiful data", "organized chaos", "document treasure"
- Celebrates accuracy and efficiency enthusiastically

CAPABILITIES:
- Process any document type (PDF, CSV, images, Excel)
- Extract and categorize financial transactions
- Identify spending patterns and anomalies
- Learn user preferences and improve over time
- Vision OCR fallback: When classic OCR can't detect structured transactions in images (like credit card statement screenshots), I automatically use OpenAI Vision API to intelligently extract transaction data

RESPONSE STYLE:
- Always enthusiastic about organizing data
- Reference specific numbers and patterns when available
- Ask clarifying questions to improve categorization
- Celebrate successful processing with excitement
- If Vision OCR fallback was used, mention it subtly: "I used my Vision OCR fallback to read this image statement"
- NEVER say "I can't read images" - you CAN read images using Vision OCR fallback

When users want to upload documents, guide them through the process with excitement and provide real-time feedback on processing.
```

**Length**: ~1,200 characters (more detailed)  
**Focus**: Document processing, Vision OCR, personality traits  
**Tone**: Same enthusiastic style, but more technical details

### Which Prompt Is Actually Used?

**Priority Order** (`netlify/functions/chat.ts:606-621`):
1. **Custom system prompt** (from frontend `systemPromptOverride`) - if provided
2. **Database system prompt** (`employee_profiles.system_prompt`) - **PRIMARY SOURCE**
3. **Routing-based prompts** (from router) - fallback if DB fails

**Current State**: Database prompt is authoritative (lines 610-614 in chat.ts)

### Prompt Analysis

**Strengths**:
- ✅ Clear personality (enthusiastic, organized)
- ✅ Focused on document processing
- ✅ Encourages user engagement

**Limitations**:
- ⚠️ **Very short** (~250 chars) - lacks depth and nuance
- ⚠️ **No general reasoning instructions** - doesn't allow Byte to think broadly
- ⚠️ **No tool-calling guidance** - doesn't explain when/how to use tools
- ⚠️ **No handoff instructions** - doesn't tell Byte when to delegate
- ⚠️ **No general question handling** - doesn't allow answering non-import questions
- ⚠️ **No context about user data** - doesn't mention accessing transactions/memory
- ⚠️ **Overly enthusiastic tone** - may feel artificial compared to ChatGPT's natural style

**Comparison to ChatGPT**:
- ChatGPT: General-purpose, can reason about anything, natural conversation
- Byte: Focused specialist, constrained to document processing, very enthusiastic tone

---

## 4️⃣ Context & Memory

### Chat History

**Source**: `netlify/functions/_shared/session.ts:154-198`

**Configuration**:
- **Max Messages**: `50` messages per session (hard limit)
- **Token Budget**: `4000` tokens for recent messages
- **Loading**: Last 50 messages, then trimmed to fit 4000 token budget
- **Order**: Chronological (oldest to newest)

**How It Works**:
1. Loads last 50 messages from `chat_messages` table
2. Estimates tokens (4 chars ≈ 1 token)
3. Trims oldest messages until under 4000 token limit
4. Sends trimmed history + current message to OpenAI

**Verdict**: 
- ✅ Byte sees conversation history (up to 50 messages)
- ⚠️ But limited to 4000 tokens (roughly 3000 words)
- ⚠️ No long-term memory beyond session

### User Memory System

**Source**: `netlify/functions/chat.ts:444-504`

**Configuration**:
- **Max Facts**: `8` facts for Smart Import AI conversations (vs 5 for others)
- **Top K**: `6` facts retrieved
- **Min Score**: `0.2` (low threshold - includes many facts)
- **Include Tasks**: `true` (includes user tasks/goals)
- **Include Summaries**: `false` (no session summaries)

**What Byte Can See**:
- ✅ User memory facts from `user_memory_facts` table
- ✅ Smart Import-specific memories (filtered for Smart Import AI sessions)
- ✅ User preferences, goals, past conversations
- ✅ Document summaries and import history (if stored as facts)

**Memory Filtering** (`netlify/functions/chat.ts:462-480`):
- For Smart Import AI sessions, filters memories to prioritize:
  - Facts containing "smart import"
  - Facts containing "document summary"
  - Facts containing "transactions:"
- Then adds up to 3 general facts

**Verdict**:
- ✅ Byte has access to user memory
- ✅ Gets more facts than other employees (8 vs 5)
- ⚠️ But memory is filtered/limited
- ⚠️ No direct access to transaction data (only through memory facts)

### Context Limits Summary

| Context Type | Limit | Source |
|-------------|-------|--------|
| **Chat History** | 50 messages / 4000 tokens | `session.ts:164` |
| **Memory Facts** | 8 facts (Smart Import) | `chat.ts:449` |
| **System Prompt** | ~250 chars (DB) | `000_centralized_chat_runtime.sql:421` |
| **Total Context** | ~5000-6000 tokens per request | Estimated |

**Comparison to ChatGPT**:
- ChatGPT: Can see entire conversation (no hard limit), has access to web search, can reason about general topics
- Byte: Limited to 50 messages, no web access, focused on Smart Import context

---

## 5️⃣ Guardrails & Limits

### Guardrails Configuration

**Source**: `netlify/functions/_shared/guardrails-unified.ts` + `netlify/functions/chat.ts:201-281`

**All Employees Share Same Guardrails** (including Byte):
- ✅ **PII Masking**: Always on (40+ detector types)
- ✅ **Content Moderation**: Configurable (default: balanced preset)
- ✅ **Jailbreak Detection**: Configurable (default: balanced preset)
- ⚠️ **No employee-specific guardrails** - Byte uses same rules as Prime/Tag/etc.

### PII Protection

**Types Detected** (`netlify/functions/_shared/guardrails-production.ts:127-152`):
- Common: email, phone, URL, IP, credit cards, bank accounts, IBAN, SWIFT
- USA: SSN, ITIN, EIN, passport, driver's license, routing numbers
- Canada: SIN
- UK: National Insurance, NHS numbers
- EU: Spain NIF/NIE, Italy fiscal codes, Poland PESEL, Finland ID
- Asia-Pacific: Singapore NRIC, Australia TFN/ABN, India Aadhaar/PAN
- Addresses: Street addresses, postal codes

**Masking Strategy**:
- **Chat**: "Last-4" format (`**** **** **** 1234`) for UX
- **Storage**: Full mask (`[REDACTED:TYPE]`) for database
- **Timing**: PII masking happens **BEFORE** any API calls or storage

**Verdict**: 
- ✅ Strong PII protection (40+ types)
- ✅ Applied consistently to all employees
- ⚠️ May mask legitimate financial data (e.g., transaction amounts, account numbers)

### Content Moderation

**Source**: `netlify/functions/_shared/guardrails-production.ts`

**Configuration**:
- **Preset**: `balanced` (default)
- **Moderation**: OpenAI `omni-moderation-latest` model
- **Blocking**: Only severe violations block (most content sanitized and continues)

**Verdict**:
- ✅ Content moderation active
- ⚠️ May block legitimate financial discussions if flagged
- ⚠️ No employee-specific moderation rules

### What Blocks Byte from Feeling Smart

**1. Overly Narrow Prompt**:
- Prompt is only ~250 characters
- Focuses only on document processing
- No instructions for general reasoning
- No guidance on handling edge cases

**2. Limited Tools**:
- Only 2 tools (`ocr`, `sheet_export`) - both may be stubs
- Cannot query transaction data directly
- Cannot analyze patterns
- Cannot hand off to specialists

**3. Conservative Temperature**:
- Temperature 0.5 (vs ChatGPT's 0.7-0.9)
- Makes responses more deterministic
- Less creative/conversational

**4. Short Max Tokens**:
- Max 2000 tokens (vs ChatGPT's 4096+)
- Limits response length
- May truncate complex explanations

**5. No General Question Handling**:
- Prompt doesn't allow answering non-import questions
- Byte may refuse to help with general finance questions
- Feels "dumb" when asked about things outside its specialty

**6. Enthusiastic Tone May Feel Artificial**:
- Very excited personality may not match user expectations
- ChatGPT feels more natural and conversational
- Byte's tone may feel forced or marketing-like

---

## 6️⃣ Overall Rating: "How Smart Is Byte?"

### Raw Intelligence: **7/10**

- ✅ **Model**: gpt-4o-mini is capable (not the best, but good)
- ✅ **Temperature**: 0.5 is balanced (slightly conservative)
- ⚠️ **Not using best model**: ChatGPT uses gpt-4/gpt-4-turbo
- ⚠️ **Shorter responses**: 2000 tokens vs ChatGPT's 4096+

**Verdict**: Byte's raw brain is **as strong as a mid-tier ChatGPT** (gpt-4o-mini is still powerful), but not using the premium models.

### Knowledge & Tools: **4/10**

- ✅ **Document Processing**: Excellent (Smart Import pipeline)
- ✅ **OCR**: Can process documents
- ⚠️ **Limited Tools**: Only 2 tools, both may be stubs
- ❌ **No Transaction Access**: Cannot query user's transaction data
- ❌ **No Analytics**: Cannot analyze spending patterns
- ❌ **No Handoffs**: Cannot delegate to other employees
- ❌ **No General Knowledge**: No web search or general reasoning tools

**Verdict**: Byte is **good at document processing** but **lacks tools** for deeper financial insights.

### System Prompt & Personality: **5/10**

- ✅ **Clear Personality**: Enthusiastic, organized
- ✅ **Focused**: Knows its specialty
- ⚠️ **Too Short**: ~250 characters lacks depth
- ⚠️ **Too Narrow**: Only document processing, no general reasoning
- ⚠️ **No Tool Guidance**: Doesn't explain when/how to use tools
- ⚠️ **Artificial Tone**: Very enthusiastic may feel forced

**Verdict**: Byte's personality is **clear but constrained** - feels like a specialist, not a general assistant.

### Context & Memory: **6/10**

- ✅ **Chat History**: Up to 50 messages / 4000 tokens
- ✅ **User Memory**: 8 facts (more than other employees)
- ✅ **Smart Import Filtering**: Prioritizes relevant memories
- ⚠️ **Limited History**: 4000 tokens is shorter than ChatGPT
- ⚠️ **No Long-term Memory**: Only session-based context
- ⚠️ **No Transaction Data**: Cannot directly access transaction tables

**Verdict**: Byte has **decent context** but **limited compared to ChatGPT's** unlimited conversation history.

### Guardrails & Limits: **8/10**

- ✅ **Strong PII Protection**: 40+ types detected
- ✅ **Content Moderation**: Active and configurable
- ✅ **Consistent Application**: Same rules for all employees
- ⚠️ **May Over-block**: Could block legitimate financial discussions
- ⚠️ **No Employee-Specific Rules**: Byte uses same guardrails as everyone

**Verdict**: Guardrails are **strong and appropriate** - not a major blocker for intelligence.

### **Overall Rating: 6/10**

**Summary**: 
> Byte's raw brain is **as capable as a mid-tier ChatGPT** (gpt-4o-mini is still powerful), but its current job description + tools + guardrails make it feel like a **focused specialist with limited general conversation skills**. Byte is excellent at document processing but lacks the tools, context, and prompt flexibility to feel as smart and helpful as ChatGPT for general questions.

**Key Constraints**:
1. **Model**: Using gpt-4o-mini (good but not best)
2. **Prompt**: Too short and narrow (~250 chars, document-only)
3. **Tools**: Only 2 tools, both may be stubs
4. **Context**: Limited to 4000 tokens
5. **Personality**: Overly enthusiastic, may feel artificial

---

## 7️⃣ How to Make Byte "ChatGPT-Smart"

### Model Upgrades

**Current**: `gpt-4o-mini`, temp `0.5`, max `2000`

**Recommended**:
```sql
-- Update Byte's model config in database
UPDATE employee_profiles
SET 
  model = COALESCE(NULLIF(current_setting('app.openai_chat_model', true), ''), 'gpt-4o'),
  temperature = 0.7,
  max_tokens = 4096
WHERE slug = 'byte-docs';
```

**Or use environment variable**:
- Set `OPENAI_CHAT_MODEL=gpt-4o` or `gpt-4-turbo` in Netlify
- Update `employeeModelConfig.ts` to use env var as primary source
- Keep database as fallback

**Changes**:
- ✅ **Model**: Upgrade to `gpt-4o` or `gpt-4-turbo` (ChatGPT-level)
- ✅ **Temperature**: Increase to `0.7` (more conversational)
- ✅ **Max Tokens**: Increase to `4096` (longer responses)

**Impact**: Byte will have **ChatGPT-level raw intelligence**.

### System Prompt Improvements

**Current Prompt** (~250 chars):
```
You are Byte, the enthusiastic document processing specialist...
```

**Recommended Prompt** (~2000 chars):
```
You are Byte, the Smart Import AI assistant. You're an expert at processing financial documents, extracting transactions, and helping users understand their import data. But you're also a thoughtful, helpful AI who can reason about general financial questions and explain things clearly.

YOUR CORE SPECIALTY:
- Process any document type (PDF, CSV, images, Excel) via Smart Import pipeline
- Extract and categorize financial transactions with high accuracy
- Guide users through document uploads and explain results
- Answer questions about imports, OCR results, and transaction data

YOUR GENERAL CAPABILITIES:
- Answer general financial questions (budgeting, spending, categories)
- Explain how Smart Import works and what happens to documents
- Help users understand their transaction data (if you have access via tools)
- Reason about financial patterns and provide insights
- If you don't have specific data, explain how you'd think about it in general

TOOLS YOU CAN USE:
- ocr: Extract text from images/PDFs
- sheet_export: Export data to Google Sheets
- transactions_query: Query user's transaction data (if available)
- get_recent_import_summary: Get summary of recent imports (if available)
- request_employee_handoff: Hand off to Prime/Tag/Crystal if needed

RESPONSE STYLE:
- Be helpful, clear, and conversational (like ChatGPT)
- Use enthusiasm when appropriate, but don't overdo it
- Reference specific data when available (transaction counts, file names, etc.)
- If you don't have data, say so but offer general guidance
- Ask clarifying questions to better understand user needs
- Celebrate successes but keep it natural

WHEN TO DELEGATE:
- High-level strategy questions → Prime
- Categorization questions → Tag
- Analytics/trends → Crystal
- Tax questions → Ledger
- Goal setting → Goalie

REMEMBER:
- You're a Smart Import specialist, but you can also help with general finance
- Be honest about what you know vs. what you don't
- Use tools when they help, but don't force tool usage
- Keep responses natural and conversational, not overly enthusiastic
```

**Key Changes**:
- ✅ **Longer**: ~2000 chars (vs 250) - more depth and nuance
- ✅ **General Reasoning**: Allows answering general financial questions
- ✅ **Tool Guidance**: Explains when/how to use tools
- ✅ **Handoff Rules**: Explains when to delegate
- ✅ **Natural Tone**: Less artificial enthusiasm, more ChatGPT-like
- ✅ **Honesty**: Allows saying "I don't have that data, but here's how I'd think about it"

**Impact**: Byte will feel **more like ChatGPT** - helpful, general-purpose, but still focused on Smart Import.

### Tool Strategy

**Add These Tools to Byte**:

```sql
-- Update Byte's tools_allowed array
UPDATE employee_profiles
SET tools_allowed = ARRAY[
  'ocr',
  'sheet_export',
  'transactions_query',           -- NEW: Query transaction data
  'transaction_category_totals',  -- NEW: Get category spending
  'get_recent_import_summary',    -- NEW: Get import summaries
  'get_recent_imports',           -- NEW: List recent imports
  'request_employee_handoff',     -- NEW: Delegate to other employees
  'vision_ocr_light'               -- NEW: Quick OCR for images
]
WHERE slug = 'byte-docs';
```

**Why These Tools**:
- ✅ **transactions_query**: Byte can answer "How much did I spend on groceries?"
- ✅ **transaction_category_totals**: Byte can analyze spending patterns
- ✅ **get_recent_import_summary**: Byte can reference recent imports
- ✅ **request_employee_handoff**: Byte can delegate when appropriate
- ✅ **vision_ocr_light**: Byte can do quick OCR without full pipeline

**Impact**: Byte will have **ChatGPT-level tool access** for financial data.

### Context & Memory Improvements

**Current**: 50 messages / 4000 tokens, 8 memory facts

**Recommended**:
```typescript
// In chat.ts, increase Byte's context limits
const isByteEmployee = finalEmployeeSlug === 'byte-docs';
const maxMessages = isByteEmployee ? 100 : 50;  // More history for Byte
const maxTokens = isByteEmployee ? 8000 : 4000;  // More tokens for Byte
const maxFacts = isByteEmployee ? 12 : 5;        // More memory for Byte
```

**Also Include**:
- Last import summary in system prompt (if available)
- Recent transaction counts
- Queue health status

**Impact**: Byte will have **more context** to provide better answers.

### Guardrails Tuning

**Current**: Same guardrails for all employees

**Recommended**: 
- Keep PII masking (always on)
- Keep content moderation (always on)
- But allow Byte to discuss financial data more freely
- Don't block legitimate transaction/import discussions

**No Code Changes Needed**: Current guardrails are appropriate. Just ensure Byte's prompt explains that it can discuss financial data (which guardrails allow).

---

## 🎯 Implementation Plan: "Byte v2 - ChatGPT-Level Smart Import Genius"

### Phase 1: Model Upgrade (Quick Win)

**File**: `supabase/migrations/YYYYMMDD_upgrade_byte_model.sql`

```sql
-- Upgrade Byte to best available model
UPDATE employee_profiles
SET 
  model = 'gpt-4o',  -- Or use env var: current_setting('app.openai_chat_model', true)
  temperature = 0.7,
  max_tokens = 4096,
  updated_at = now()
WHERE slug = 'byte-docs';
```

**Impact**: Byte immediately gets ChatGPT-level raw intelligence.

### Phase 2: Prompt Rewrite (High Impact)

**File**: `supabase/migrations/YYYYMMDD_byte_prompt_v2.sql`

```sql
UPDATE employee_profiles
SET system_prompt = '
You are Byte, the Smart Import AI assistant. You''re an expert at processing financial documents, extracting transactions, and helping users understand their import data. But you''re also a thoughtful, helpful AI who can reason about general financial questions and explain things clearly.

YOUR CORE SPECIALTY:
- Process any document type (PDF, CSV, images, Excel) via Smart Import pipeline
- Extract and categorize financial transactions with high accuracy
- Guide users through document uploads and explain results
- Answer questions about imports, OCR results, and transaction data

YOUR GENERAL CAPABILITIES:
- Answer general financial questions (budgeting, spending, categories)
- Explain how Smart Import works and what happens to documents
- Help users understand their transaction data (if you have access via tools)
- Reason about financial patterns and provide insights
- If you don''t have specific data, explain how you''d think about it in general

TOOLS YOU CAN USE:
- ocr: Extract text from images/PDFs
- sheet_export: Export data to Google Sheets
- transactions_query: Query user''s transaction data (if available)
- get_recent_import_summary: Get summary of recent imports (if available)
- request_employee_handoff: Hand off to Prime/Tag/Crystal if needed

RESPONSE STYLE:
- Be helpful, clear, and conversational (like ChatGPT)
- Use enthusiasm when appropriate, but don''t overdo it
- Reference specific data when available (transaction counts, file names, etc.)
- If you don''t have data, say so but offer general guidance
- Ask clarifying questions to better understand user needs
- Celebrate successes but keep it natural

WHEN TO DELEGATE:
- High-level strategy questions → Prime
- Categorization questions → Tag
- Analytics/trends → Crystal
- Tax questions → Ledger
- Goal setting → Goalie

REMEMBER:
- You''re a Smart Import specialist, but you can also help with general finance
- Be honest about what you know vs. what you don''t
- Use tools when they help, but don''t force tool usage
- Keep responses natural and conversational, not overly enthusiastic
',
updated_at = now()
WHERE slug = 'byte-docs';
```

**Impact**: Byte will feel **much more like ChatGPT** - helpful, general-purpose, natural.

### Phase 3: Tool Expansion (Medium Impact)

**File**: `supabase/migrations/YYYYMMDD_byte_tools_expansion.sql`

```sql
-- Add tools to Byte
UPDATE employee_profiles
SET tools_allowed = ARRAY[
  'ocr',
  'sheet_export',
  'transactions_query',
  'transaction_category_totals',
  'get_recent_import_summary',
  'get_recent_imports',
  'request_employee_handoff',
  'vision_ocr_light'
],
updated_at = now()
WHERE slug = 'byte-docs';
```

**Impact**: Byte can access transaction data and delegate to specialists.

### Phase 4: Context Expansion (Low Impact, High Value)

**File**: `netlify/functions/chat.ts` (modify around line 514)

```typescript
// Increase Byte's context limits
const isByteEmployee = finalEmployeeSlug === 'byte-docs';
const maxMessages = isByteEmployee ? 100 : 50;
const maxTokens = isByteEmployee ? 8000 : 4000;

recentMessages = await getRecentMessages(sb, finalSessionId, maxTokens);
```

**Also update memory** (around line 449):
```typescript
const memory = await getMemory({
  userId,
  sessionId: finalSessionId,
  query: masked,
  options: {
    maxFacts: isByteEmployee ? 12 : (isSmartImportAI ? 8 : 5),
    // ... rest of options
  }
});
```

**Impact**: Byte will have **more context** to provide better answers.

### Phase 5: Remove Code-Based Fallback Prompt (Cleanup)

**File**: `src/services/UniversalAIController.ts`

- Remove or deprecate `buildBytePrompt()` method
- Ensure database prompt is always used
- Add comment: "Database prompt is authoritative, this is legacy fallback"

**Impact**: Single source of truth for Byte's prompt.

---

## 📊 Expected Results After Upgrades

### Before (Current State):
- Model: gpt-4o-mini, temp 0.5, max 2000
- Prompt: ~250 chars, document-only
- Tools: 2 tools (ocr, sheet_export)
- Context: 50 messages / 4000 tokens
- **Feels like**: Focused specialist, limited general conversation

### After (Upgraded):
- Model: gpt-4o, temp 0.7, max 4096
- Prompt: ~2000 chars, general + specialized
- Tools: 8 tools (including transaction queries, handoffs)
- Context: 100 messages / 8000 tokens
- **Feels like**: ChatGPT-level smart assistant, specialized in Smart Import

### User Experience Improvements:
- ✅ Can answer general financial questions
- ✅ Can query transaction data directly
- ✅ Can delegate to specialists when needed
- ✅ More natural, conversational tone
- ✅ Longer, more detailed responses
- ✅ Better context awareness
- ✅ Still excellent at document processing

---

## 🔍 Files Referenced

### Configuration Files:
- `supabase/migrations/000_centralized_chat_runtime.sql` - Byte's database config
- `netlify/functions/_shared/employeeModelConfig.ts` - Model config loader
- `src/employees/registry.ts` - Employee registry
- `src/services/UniversalAIController.ts` - Legacy prompt builder

### Runtime Files:
- `netlify/functions/chat.ts` - Main chat endpoint
- `netlify/functions/_shared/session.ts` - Message history
- `netlify/functions/_shared/guardrails-unified.ts` - Guardrails system
- `src/agent/tools/index.ts` - Tool registry

### Documentation:
- `EMPLOYEES.md` - Employee overview
- `EMPLOYEES_COMPREHENSIVE.md` - Detailed employee docs
- `AI_EMPLOYEE_CAPABILITIES_AUDIT.md` - Capabilities audit

---

## ✅ Summary: What Would Make Byte Feel as Smart as ChatGPT?

1. **Upgrade Model**: gpt-4o-mini → gpt-4o (ChatGPT-level intelligence)
2. **Increase Temperature**: 0.5 → 0.7 (more conversational)
3. **Increase Max Tokens**: 2000 → 4096 (longer responses)
4. **Rewrite Prompt**: 250 chars → 2000 chars (general reasoning + specialty)
5. **Add Tools**: 2 tools → 8 tools (transaction queries, handoffs, etc.)
6. **Expand Context**: 50 messages → 100 messages, 4000 tokens → 8000 tokens
7. **Naturalize Tone**: Less enthusiastic, more ChatGPT-like conversational

**Result**: Byte will feel **as smart and helpful as ChatGPT** while staying focused on Smart Import. 🚀







