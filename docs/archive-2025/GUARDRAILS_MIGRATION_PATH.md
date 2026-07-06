# 🔄 Guardrails Migration Path
## Choosing Between Implementations

You have **two implementations** to choose from. Here's how to decide:

---

## 📊 **Comparison**

| Feature | Your Existing Code | My Implementation | Merged Version |
|---------|-------------------|-------------------|----------------|
| **PII Patterns** | 4 basic | 40+ comprehensive | 40+ comprehensive ✅ |
| **API Style** | `runGuardrails()` | `applyGuardrails()` | `runGuardrails()` ✅ |
| **Config Table** | `tenant_guardrail_settings` | `user_guardrail_preferences` | `tenant_guardrail_settings` ✅ |
| **Config Loader** | `getGuardrailConfig()` | RPC function | `getGuardrailConfig()` ✅ |
| **Stage Names** | `ingestion_email/ocr/chat` | `ingestion/ocr/chat` | `ingestion_email/ocr/chat` ✅ |
| **Outcome Type** | Simple + clean | Detailed | Simple + enhanced ✅ |
| **Code Style** | Your preference | My style | Your style ✅ |

---

## 🎯 **Recommended Path**

### **Option 1: Use Merged Version** (Best of Both) 🏆

**File**: `netlify/functions/_shared/guardrails-merged.ts`

**What you get:**
- ✅ Your existing API (`runGuardrails`, `getGuardrailConfig`)
- ✅ Your database schema (`tenant_guardrail_settings`)
- ✅ My 40+ PII patterns (comprehensive coverage)
- ✅ Enhanced logging (with PII types found)
- ✅ Better error handling
- ✅ Graceful degradation on API failures

**Migration steps:**
```bash
# 1. Rename your current file
mv netlify/functions/_shared/guardrails.ts netlify/functions/_shared/guardrails-old.ts

# 2. Use merged version
mv netlify/functions/_shared/guardrails-merged.ts netlify/functions/_shared/guardrails.ts

# 3. Update database (if needed)
# Add pii_types column to guardrail_events if not exists
```

---

### **Option 2: Keep Your Implementation + Add Patterns**

**If you prefer minimal changes:**

1. Keep your existing `guardrails.ts`
2. Add the comprehensive PII patterns from my code
3. Update your `maskLocal()` function to use the new patterns

**Code change:**
```typescript
// In your existing guardrails.ts, replace:
const RX_CARD = /\b(?:\d[ -]*?){13,19}\b/g;
const RX_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const RX_PHONE = /\+?\d[\d\s().-]{7,}\d/g;
const RX_ADDRESS_HINT = /(street|st\.|avenue|ave\.|road|rd\.|blvd|unit|apt|suite|postal|zip)/i;

// With this:
const PII_PATTERNS = {
  credit_card: /\b(?:\d[ -]*?){13,19}\b/g,
  email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  phone: /\+?\d[\d\s().-]{7,}\d/g,
  bank_account: /\b\d{7,17}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  sin: /\b\d{3}-\d{3}-\d{3}\b/g,
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/gi,
  // ... add more from guardrails-merged.ts
};

// Update maskLocal to iterate patterns
function maskLocal(s: string, keepLastFour: boolean = false) {
  let result = s;
  const foundTypes = [];
  
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(result)) {
      foundTypes.push(type);
      // Apply masking logic
    }
  }
  
  return { masked: result, types: foundTypes };
}
```

---

### **Option 3: Use My Implementation**

**If you want the full system with UI:**

1. Use my `_shared/guardrails.ts`
2. Update your integration points to use `applyGuardrails()`
3. Create my database tables (`20251013_guardrail_events.sql`)
4. Add the UI components

**Migration:**
```typescript
// Before (your code):
const result = await runGuardrails(input, userId, 'chat', config);

// After (my code):
import { applyGuardrails, GUARDRAIL_PRESETS } from './_shared/guardrails';
const result = await applyGuardrails(input, GUARDRAIL_PRESETS.balanced, userId);
```

---

## 🗄️ **Database Schema Comparison**

### **Your Schema** (tenant_guardrail_settings)
```sql
CREATE TABLE tenant_guardrail_settings (
  user_id uuid PRIMARY KEY,
  preset text DEFAULT 'strict',
  jailbreak_threshold integer DEFAULT 75,
  moderation_block boolean DEFAULT true,
  pii_entities text[] DEFAULT ARRAY[]::text[]
);
```

### **My Schema** (user_guardrail_preferences)
```sql
CREATE TABLE user_guardrail_preferences (
  user_id uuid PRIMARY KEY,
  preset text DEFAULT 'balanced',
  pii_enabled boolean,
  moderation_enabled boolean,
  jailbreak_enabled boolean,
  hallucination_enabled boolean
);
```

### **Recommended: Keep Yours + Enhance**
```sql
-- Your existing table is better! Just add tracking:
ALTER TABLE tenant_guardrail_settings 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Optional: Add more granular controls
ALTER TABLE tenant_guardrail_settings 
  ADD COLUMN IF NOT EXISTS pii_strategy text DEFAULT 'auto'; -- 'full_mask' | 'keep_last_4' | 'auto'
```

---

## 🔧 **Integration Examples**

### **Example 1: Gmail Sync (Using Merged Version)**

```typescript
// netlify/functions/gmail-sync.ts
import { runGuardrails, getGuardrailConfig } from './_shared/guardrails';

export const handler: Handler = async (event) => {
  const userId = event.queryStringParameters?.userId;
  
  // Load user's config
  const config = await getGuardrailConfig(userId);
  
  // Process emails
  for (const message of messages) {
    const snippet = message.snippet || '';
    
    // Apply guardrails BEFORE storage
    const result = await runGuardrails(
      snippet, 
      userId, 
      'ingestion_email',  // Your stage name
      config
    );
    
    // Skip if blocked
    if (!result.ok) {
      console.warn('Blocked:', result.reasons);
      continue;
    }
    
    // Store ONLY redacted content
    await supabase.from('user_documents').insert({
      user_id: userId,
      content: result.text,  // Redacted
      pii_types: result.signals.piiTypes,  // Track what was found
      status: 'pending'
    });
  }
};
```

### **Example 2: Chat (Using Merged Version)**

```typescript
// netlify/functions/chat.ts
import { runGuardrails, getGuardrailConfig } from './_shared/guardrails';

export const handler: Handler = async (event) => {
  const { userId, messages } = JSON.parse(event.body || '{}');
  const userMessage = messages[messages.length - 1].content;
  
  // Load config
  const config = await getGuardrailConfig(userId);
  
  // Check input
  const result = await runGuardrails(userMessage, userId, 'chat', config);
  
  // Block if needed
  if (!result.ok) {
    return {
      statusCode: 403,
      body: JSON.stringify({ 
        error: 'Blocked by safety policy',
        reasons: result.reasons 
      })
    };
  }
  
  // Notify user if PII was found (optional)
  if (result.signals.pii) {
    stream.write(`data: ${JSON.stringify({ 
      type: 'note', 
      note: 'Sensitive information detected and protected' 
    })}\n\n`);
  }
  
  // Continue with redacted input
  const safeMessage = result.text;
  // ... send to OpenAI
};
```

### **Example 3: OCR Processing**

```typescript
// netlify/functions/guardrails-process.ts
import { runGuardrails, getGuardrailConfig } from './_shared/guardrails';

const config = await getGuardrailConfig(userId);

// After OCR extraction
const ocrText = await performOCR(imageData);

// Apply guardrails
const result = await runGuardrails(ocrText, userId, 'ingestion_ocr', config);

if (!result.ok) {
  // Mark as rejected
  await updateDocument(docId, { 
    status: 'rejected', 
    reason: result.reasons.join(', ') 
  });
  continue;
}

// Store redacted text only
await updateDocument(docId, {
  status: 'ready',
  redacted_text: result.text,
  pii_types: result.signals.piiTypes
});
```

---

## 🚀 **Quick Start (Merged Version)**

### **1. Update Imports**
```typescript
// Replace this:
import { applyGuardrails } from './_shared/guardrails';

// With this:
import { runGuardrails, getGuardrailConfig } from './_shared/guardrails';
```

### **2. Update Usage**
```typescript
// Old pattern:
const result = await applyGuardrails(input, GUARDRAIL_PRESETS.balanced, userId);

// New pattern:
const config = await getGuardrailConfig(userId);
const result = await runGuardrails(input, userId, 'chat', config);
```

### **3. Database - Keep Your Schema**
```sql
-- Your existing table works perfectly!
-- Just ensure it has these columns:
SELECT * FROM tenant_guardrail_settings;
-- user_id, preset, jailbreak_threshold, moderation_block, pii_entities
```

### **4. Event Logging - Keep Your Format**
```sql
-- Your guardrail_events table structure is good
-- Merged version uses it automatically
SELECT * FROM guardrail_events ORDER BY created_at DESC LIMIT 10;
```

---

## ✅ **Recommended Action Plan**

### **Step 1: Back Up Your Current Code**
```bash
cp netlify/functions/_shared/guardrails.ts netlify/functions/_shared/guardrails-backup.ts
cp netlify/functions/_shared/settings.ts netlify/functions/_shared/settings-backup.ts
```

### **Step 2: Deploy Merged Version**
```bash
# Copy merged version over your existing file
# This gives you 40+ PII patterns while keeping your API
cp netlify/functions/_shared/guardrails-merged.ts netlify/functions/_shared/guardrails.ts
```

### **Step 3: Test Locally**
```bash
netlify dev

# Test PII detection
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -d '{"userId":"test","messages":[{"content":"My SSN is 123-45-6789"}]}'

# Should redact and log properly
```

### **Step 4: Verify Database**
```sql
-- Check events are being logged
SELECT * FROM guardrail_events ORDER BY created_at DESC LIMIT 5;

-- Should see:
-- - PII events with types array
-- - Moderation checks
-- - Jailbreak checks (for chat)
```

### **Step 5: Deploy**
```bash
git add netlify/functions/_shared/guardrails.ts
git commit -m "feat: upgrade guardrails with 40+ PII patterns"
git push
```

---

## 🎉 **Summary**

### **Best Choice: Merged Version** ✅

**Why:**
- ✅ Keeps your API style (`runGuardrails`, `getGuardrailConfig`)
- ✅ Keeps your database schema (`tenant_guardrail_settings`)
- ✅ Adds 40+ PII patterns (vs your 4)
- ✅ Better error handling
- ✅ Enhanced logging
- ✅ Zero breaking changes to your integration points

**What changes:**
- More PII types detected (credit_card, email, phone, bank, SSN, SIN, IBAN, etc.)
- Better masking strategies (full vs keep-last-4)
- Enhanced outcome with `piiTypes` array

**What stays the same:**
- Your function signatures
- Your database schema
- Your configuration loading
- Your event logging structure

---

## 📞 **Need Help?**

- **Keep your code**: Just add PII patterns from merged version
- **Use merged version**: Drop-in replacement for your guardrails.ts
- **Use my full system**: Requires database migration + UI setup

**I recommend: Merged version** - it's the best of both worlds! 🚀

