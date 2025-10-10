# Database Triggers Audit
## Complete Inventory of Active Triggers

Last Updated: October 10, 2025  
Database: Supabase PostgreSQL (Centralized Chat Runtime)

---

## 📊 **Summary: What Triggers Do You Have?**

**YES ✅** - You have **4 active triggers** set up in the database.

| Trigger | Purpose | Status | Performance Impact |
|---------|---------|--------|-------------------|
| `trigger_update_session_on_message` | Auto-update session stats | ✅ Active | Low |
| `trigger_employee_profiles_updated_at` | Auto-timestamp updates | ✅ Active | Very Low |
| `trigger_chat_sessions_updated_at` | Auto-timestamp updates | ✅ Active | Very Low |
| `trigger_user_memory_facts_updated_at` | Auto-timestamp updates | ✅ Active | Very Low |

---

## 🔧 **Detailed Trigger Documentation**

### **Trigger 1: Session Statistics Auto-Update**

#### **Name**: `trigger_update_session_on_message`
#### **Table**: `chat_messages` (fires AFTER INSERT)
#### **Function**: `update_session_on_message()`

**What It Does:**
Every time a new message is inserted, automatically updates the parent session with:
- Increments `message_count`
- Adds tokens to `token_count`
- Updates `last_message_at` timestamp
- Updates `updated_at` timestamp

**Code:**
```sql
CREATE OR REPLACE FUNCTION update_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET 
    message_count = message_count + 1,
    token_count = token_count + COALESCE(NEW.tokens, 0),
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_on_message();
```

**Why This is Smart:**
- ✅ Denormalized data for fast queries (no COUNT(*) needed)
- ✅ Always accurate (can't get out of sync)
- ✅ Minimal overhead (single UPDATE per message)

**Example:**
```sql
-- User sends a message
INSERT INTO chat_messages (session_id, content, tokens) 
VALUES ('session-123', 'Hello Prime', 50);

-- Trigger automatically updates:
-- chat_sessions SET 
--   message_count = message_count + 1,   -- 5 → 6
--   token_count = token_count + 50,      -- 1200 → 1250
--   last_message_at = NOW(),
--   updated_at = NOW()
-- WHERE id = 'session-123';
```

---

### **Trigger 2-4: Auto-Update Timestamps**

#### **Name**: `trigger_employee_profiles_updated_at`, `trigger_chat_sessions_updated_at`, `trigger_user_memory_facts_updated_at`
#### **Tables**: `employee_profiles`, `chat_sessions`, `user_memory_facts` (fires BEFORE UPDATE)
#### **Function**: `update_updated_at_column()`

**What It Does:**
Every time a row is updated, automatically sets `updated_at = NOW()`.

**Code:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_employee_profiles_updated_at
  BEFORE UPDATE ON employee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_memory_facts_updated_at
  BEFORE UPDATE ON user_memory_facts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Why This is Smart:**
- ✅ No manual timestamp management needed
- ✅ Can't forget to update (happens automatically)
- ✅ Consistent across all tables

**Example:**
```sql
-- Update Prime's temperature
UPDATE employee_profiles 
SET temperature = 0.8 
WHERE slug = 'prime-boss';

-- Trigger automatically adds:
-- updated_at = NOW()
```

---

## 🚀 **What Other Triggers SHOULD You Add?**

Based on best practices and your architecture, here are recommended triggers:

### **HIGH PRIORITY - Should Add Now** 🔥

#### **1. Auto-Generate Chat Session Summaries**
**Trigger**: After every 20 messages, auto-create/update session summary

```sql
CREATE OR REPLACE FUNCTION auto_summarize_session()
RETURNS TRIGGER AS $$
DECLARE
  should_summarize BOOLEAN;
BEGIN
  -- Check if session has crossed a threshold (e.g., 20 messages)
  SELECT (message_count % 20 = 0 AND message_count > 0)
  INTO should_summarize
  FROM chat_sessions
  WHERE id = NEW.session_id;
  
  IF should_summarize THEN
    -- Queue a summary job (don't block the insert)
    INSERT INTO summary_queue (session_id, priority)
    VALUES (NEW.session_id, 'normal')
    ON CONFLICT (session_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_summarize_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_summarize_session();
```

**Why You Need This:**
- ✅ Prevents sessions from growing too large
- ✅ Maintains context window within token limits
- ✅ Improves response quality (focused context)

---

#### **2. Auto-Expire Old Memory Facts**
**Trigger**: Mark facts as expired after a certain time

```sql
CREATE OR REPLACE FUNCTION expire_old_facts()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark facts as expired if they have an expiry date that's passed
  UPDATE user_memory_facts
  SET verified = false
  WHERE expires_at < NOW() AND verified = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Run daily via pg_cron or after each fact insert
CREATE TRIGGER trigger_expire_old_facts
  AFTER INSERT ON user_memory_facts
  FOR EACH ROW
  WHEN (NEW.expires_at IS NOT NULL)
  EXECUTE FUNCTION expire_old_facts();
```

**Why You Need This:**
- ✅ Removes stale information automatically
- ✅ Prevents AI from using outdated facts
- ✅ Improves data quality over time

---

#### **3. Auto-Extract Facts from Messages**
**Trigger**: Detect important facts in user messages and queue for extraction

```sql
CREATE OR REPLACE FUNCTION detect_facts_in_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Look for patterns that suggest facts
  IF NEW.role = 'user' AND (
    NEW.content ~* 'i prefer|i like|i want|remember|my goal is|i have'
  ) THEN
    -- Queue for AI fact extraction
    INSERT INTO fact_extraction_queue (
      user_id,
      message_id,
      content,
      priority
    ) VALUES (
      NEW.user_id,
      NEW.id,
      NEW.content,
      'normal'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_facts_in_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION detect_facts_in_message();
```

**Why You Need This:**
- ✅ Automatically learns about users
- ✅ No manual "remember this" commands needed
- ✅ Builds rich user profiles over time

---

### **MEDIUM PRIORITY - Nice to Have** ⚡

#### **4. Log All Tool Usage**
**Trigger**: Track when employees use tools

```sql
CREATE OR REPLACE FUNCTION log_tool_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.metadata->>'tool_calls' IS NOT NULL THEN
    INSERT INTO tool_usage_log (
      user_id,
      employee_slug,
      tool_name,
      success,
      created_at
    )
    SELECT 
      NEW.user_id,
      (SELECT employee_slug FROM chat_sessions WHERE id = NEW.session_id),
      tool_call->>'name',
      true,
      NEW.created_at
    FROM jsonb_array_elements(NEW.metadata->'tool_calls') AS tool_call;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_tool_usage
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  WHEN (NEW.role = 'assistant' AND NEW.metadata->>'tool_calls' IS NOT NULL)
  EXECUTE FUNCTION log_tool_usage();
```

**Why You Need This:**
- ✅ Analytics on tool usage
- ✅ Identify most valuable tools
- ✅ Debug tool failures

---

#### **5. Auto-Delete Old Sessions**
**Trigger**: Archive or delete sessions older than X days

```sql
CREATE OR REPLACE FUNCTION archive_old_sessions()
RETURNS void AS $$
BEGIN
  -- Move sessions older than 90 days to archive
  INSERT INTO chat_sessions_archive
  SELECT * FROM chat_sessions
  WHERE last_message_at < NOW() - INTERVAL '90 days';
  
  DELETE FROM chat_sessions
  WHERE last_message_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Run via pg_cron daily
SELECT cron.schedule(
  'archive-old-sessions',
  '0 2 * * *',  -- 2 AM daily
  'SELECT archive_old_sessions();'
);
```

**Why You Need This:**
- ✅ Keeps database lean
- ✅ Improves query performance
- ✅ Compliance (data retention policies)

---

#### **6. Validate PII Redaction**
**Trigger**: Ensure no PII in stored messages

```sql
CREATE OR REPLACE FUNCTION validate_pii_redaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if content has PII patterns
  IF NEW.content ~* '\b\d{3}-\d{2}-\d{4}\b' OR  -- SSN
     NEW.content ~* '\b\d{16}\b' THEN            -- Credit card
    RAISE EXCEPTION 'PII detected in message content. Use redacted_content instead.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_pii_redaction
  BEFORE INSERT OR UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_pii_redaction();
```

**Why You Need This:**
- ✅ Prevents PII leaks
- ✅ Enforces security policies
- ✅ Compliance (GDPR, HIPAA)

---

### **LOW PRIORITY - Advanced Features** 💡

#### **7. Auto-Update Employee Statistics**
Track usage per employee for analytics dashboard

#### **8. Rate Limiting Per User**
Prevent abuse by tracking request frequency

#### **9. Auto-Tag Messages for Search**
Extract keywords and add to full-text search index

#### **10. Notification Triggers**
Send webhooks/emails on specific events (e.g., budget exceeded)

---

## 📊 **Trigger Performance Analysis**

### **Current Triggers (All Lightweight)**

| Trigger | Fires On | Operation | Estimated Overhead |
|---------|----------|-----------|-------------------|
| `update_session_on_message` | Every message | 1 UPDATE | ~2-5ms |
| `*_updated_at` | Every UPDATE | Column set | ~0.1ms |

**Total Overhead Per Message**: ~2-5ms (negligible)

### **Recommended Triggers (If Added)**

| Trigger | Fires On | Operation | Estimated Overhead |
|---------|----------|-----------|-------------------|
| `auto_summarize_session` | Every 20 messages | 1 INSERT (queue) | ~1ms |
| `detect_facts_in_message` | Matching messages | 1 INSERT (queue) | ~1ms |
| `log_tool_usage` | Tool calls only | 1-3 INSERTs | ~2-5ms |

**Total Overhead with All Triggers**: ~10-15ms per message (still fast)

---

## ⚠️ **Trigger Best Practices**

### **DO ✅**
1. **Keep triggers fast** - Use queues for heavy work
2. **Handle errors gracefully** - Don't block inserts
3. **Test thoroughly** - Triggers can cause cascade failures
4. **Document behavior** - Future you will thank you
5. **Use WHEN clauses** - Only fire when needed

### **DON'T ❌**
1. **Call external APIs** - Triggers should be DB-only
2. **Perform heavy computations** - Queue them instead
3. **Update unrelated tables** - Keep scope minimal
4. **Ignore errors** - Log and alert on failures
5. **Create recursive triggers** - Can cause infinite loops

---

## 🛠️ **How to Add a New Trigger**

### **Example: Auto-Extract Facts**

#### **Step 1: Create Migration File**
```sql
-- supabase/migrations/006_auto_extract_facts.sql

-- Create queue table
CREATE TABLE IF NOT EXISTS fact_extraction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fact_extraction_queue_unprocessed
ON fact_extraction_queue(created_at)
WHERE processed = false;

-- Create trigger function
CREATE OR REPLACE FUNCTION detect_facts_in_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'user' AND (
    NEW.content ~* 'i prefer|i like|i want|remember|my goal is|i have'
  ) THEN
    INSERT INTO fact_extraction_queue (
      user_id,
      message_id,
      content,
      priority
    ) VALUES (
      NEW.user_id,
      NEW.id,
      NEW.content,
      'normal'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_detect_facts_in_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION detect_facts_in_message();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Fact extraction trigger created';
  RAISE NOTICE '📊 Queue table: fact_extraction_queue';
  RAISE NOTICE '🔍 Trigger fires on user messages with key phrases';
END $$;
```

#### **Step 2: Create Background Worker**
```typescript
// netlify/functions/process-fact-queue.ts
// Run as scheduled function (cron) every 5 minutes

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

export async function handler() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Get unprocessed items
  const { data: queue } = await supabase
    .from('fact_extraction_queue')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(10);

  for (const item of queue || []) {
    try {
      // Ask GPT to extract facts
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract user preferences, goals, or facts from this message. Return as JSON array: [{fact: "...", category: "preference|goal|financial", confidence: 0.0-1.0}]'
          },
          { role: 'user', content: item.content }
        ]
      });

      const facts = JSON.parse(response.choices[0].message.content || '[]');

      // Store extracted facts
      for (const fact of facts) {
        await supabase.from('user_memory_facts').insert({
          user_id: item.user_id,
          fact: fact.fact,
          category: fact.category,
          confidence: fact.confidence,
          learned_from_session_id: null,
        });
      }

      // Mark as processed
      await supabase
        .from('fact_extraction_queue')
        .update({ processed: true })
        .eq('id', item.id);

    } catch (error) {
      console.error('Fact extraction failed:', error);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ processed: queue?.length || 0 }) };
}
```

#### **Step 3: Schedule Worker in netlify.toml**
```toml
[[functions."process-fact-queue".schedule]]
  cron = "*/5 * * * *"  # Every 5 minutes
```

#### **Step 4: Test**
```sql
-- Insert a test message
INSERT INTO chat_messages (
  session_id,
  user_id,
  role,
  content
) VALUES (
  'test-session-id',
  'test-user-id',
  'user',
  'I prefer CSV exports and my goal is to save $10k by December'
);

-- Check if queued
SELECT * FROM fact_extraction_queue WHERE processed = false;

-- After worker runs, check facts
SELECT * FROM user_memory_facts WHERE user_id = 'test-user-id';
```

---

## ✅ **Recommendations**

### **Immediate Actions:**
1. ✅ **Current triggers are good** - No changes needed
2. 🔥 **Add auto-summarization trigger** - Prevents context bloat
3. 🔥 **Add fact extraction trigger** - Builds user profiles automatically

### **Within 1 Month:**
4. ⚡ **Add tool usage logging** - Analytics for optimization
5. ⚡ **Add PII validation** - Security enforcement

### **Nice to Have:**
6. 💡 **Add session archiving** - Database maintenance
7. 💡 **Add notification triggers** - Proactive alerts

---

## 🎯 **Next Steps**

Want me to implement any of these triggers? I recommend starting with:

1. **Auto-summarization trigger** - Keeps context manageable
2. **Fact extraction trigger** - Automatically learns about users

Both can be implemented in ~30 minutes and provide immediate value.

**Should I implement these now?**

