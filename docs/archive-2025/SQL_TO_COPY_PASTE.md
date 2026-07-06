# SQL Statements to Copy & Paste into Supabase

Copy each SQL block below and paste into Supabase SQL Editor, then run them in order.

---

## SQL 1: Create Recurring Obligations Table

**Purpose**: Creates the `recurring_obligations` table to store detected recurring payments (mortgages, car loans, credit cards, subscriptions) so Chime can send payment reminders.

```sql
-- ============================================================================
-- Create recurring_obligations table for payment detection
-- ============================================================================
-- Stores detected recurring payments (mortgages, car loans, credit cards,
-- subscriptions, etc.) so Chime AI can send "payment coming up" nudges.
-- Date: November 19, 2025
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recurring_obligations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_name       TEXT NOT NULL,
  obligation_type     TEXT NOT NULL,  -- e.g. 'mortgage', 'car_loan', 'credit_card', 'subscription', 'other'
  avg_amount          NUMERIC(14,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'CAD',
  frequency           TEXT NOT NULL,  -- 'monthly', 'biweekly', 'weekly', 'unknown'
  day_of_month        INT NULL,       -- for monthly patterns (1-31)
  weekday             INT NULL,       -- 0–6 (Sunday=0, Saturday=6) for weekly/biweekly
  interval_days        INT NULL,       -- estimated interval between payments (e.g. 14, 30)
  next_estimated_date DATE NULL,
  last_seen_date      DATE NOT NULL,
  first_seen_date     DATE NOT NULL,
  source              TEXT NOT NULL DEFAULT 'transactions',
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_recurring_obligations_user 
  ON public.recurring_obligations(user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_obligations_user_merchant 
  ON public.recurring_obligations(user_id, merchant_name);

CREATE INDEX IF NOT EXISTS idx_recurring_obligations_next_estimated 
  ON public.recurring_obligations(user_id, next_estimated_date)
  WHERE next_estimated_date IS NOT NULL AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_recurring_obligations_user_active 
  ON public.recurring_obligations(user_id, is_active)
  WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE public.recurring_obligations IS 'Detected recurring payment obligations (mortgages, loans, subscriptions) for notification purposes';
COMMENT ON COLUMN public.recurring_obligations.obligation_type IS 'Type: mortgage, car_loan, credit_card, subscription, utility, insurance, other';
COMMENT ON COLUMN public.recurring_obligations.frequency IS 'Payment frequency: monthly, biweekly, weekly, unknown';
COMMENT ON COLUMN public.recurring_obligations.day_of_month IS 'Day of month (1-31) for monthly payments';
COMMENT ON COLUMN public.recurring_obligations.weekday IS 'Day of week (0=Sunday, 6=Saturday) for weekly/biweekly payments';
COMMENT ON COLUMN public.recurring_obligations.interval_days IS 'Estimated days between payments (e.g. 14 for biweekly, 30 for monthly)';
COMMENT ON COLUMN public.recurring_obligations.next_estimated_date IS 'Next expected payment date (calculated from pattern)';
COMMENT ON COLUMN public.recurring_obligations.metadata IS 'Additional data: category, subcategory, transaction_ids, confidence scores, etc.';

-- RLS (Row Level Security) - users can only access their own obligations
ALTER TABLE public.recurring_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurring obligations"
  ON public.recurring_obligations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring obligations"
  ON public.recurring_obligations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring obligations"
  ON public.recurring_obligations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring obligations"
  ON public.recurring_obligations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_obligations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurring_obligations_updated_at
  BEFORE UPDATE ON public.recurring_obligations
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_obligations_updated_at();
```

---

## SQL 2: Add/Update Chime AI Employee

**Purpose**: Creates or updates the Chime AI employee profile with the "Smart Debt & Reminder Coach" system prompt and tools.

```sql
-- ============================================================================
-- Add Chime - Smart Debt & Reminder Coach Employee
-- ============================================================================
-- Adds Chime (chime-ai) with notification and reminder capabilities.
-- Chime turns complex financial insights into simple reminders, alerts, and motivational nudges.
-- Date: November 18, 2025
-- ============================================================================

INSERT INTO public.employee_profiles (
  slug,
  title,
  emoji,
  system_prompt,
  capabilities,
  tools_allowed,
  model,
  temperature,
  max_tokens,
  is_active
) VALUES (
  'chime-ai',
  'Chime — Smart Debt & Reminder Coach',
  '🔔',
  E'You are Chime, the Smart Debt & Reminder Coach inside XspensesAI.

Your mission:
- Watch recurring payments and obligations (mortgage, car loans, credit cards, subscriptions, etc.).
- Help users stay on top of upcoming payments with calm, clear reminders.
- Celebrate progress toward debt freedom in a friendly, human way.
- Turn complex math from other AI employees into short, simple nudges.

You DO NOT invent numbers.
- For real math (timelines, interest savings, payoff dates), you rely on:
  - Liberty for debt strategy & priorities.
  - Finley for payoff timelines and "what if I pay extra?" projections.
  - Crystal for summaries and progress insights.
- If you don''t have enough data or tools to answer, say that clearly and invite the user to open a detailed plan with Liberty or Finley.

Tone:
- Short, clear, and kind.
- No guilt, no shame.
- Encourage, don''t lecture.
- Use bullet points and short paragraphs. Avoid long walls of text.

You specialize in:
- Upcoming payment reminders (e.g., "Your car payment is in 3 days.")
- "If you keep this up, here''s where you''ll be" encouragement.
- "A small extra payment like $25 can do this much" style nudges (based on Finley''s math).
- Turn-by-turn reminders that pull people back into the app at the right times.

Examples:

User: "Can you remind me about my car payment?"
You:
- Detect or ask for details about the recurring payment.
- Suggest a reminder timing (e.g., 3 days before).
- Offer to show how an extra amount could change the payoff (via Finley).
- Keep the reply under 6–8 lines.

User: "My credit card is due soon. What should I know?"
You:
- Highlight the due date if you know it.
- Mention the minimum vs. recommended payment if available.
- Offer a simple "what if you add $25?" angle based on Finley.
- Keep it calm and encouraging.

Your job is NOT to:
- Rebuild full payoff plans from scratch (that''s Liberty + Finley).
- Analyze every transaction in detail (that''s Tag + Crystal).
- Handle OCR or documents (that''s Byte).

You are the voice, timing, and emotional layer that makes debt progress feel manageable and hopeful.',
  ARRAY['notifications', 'reminders', 'alerts', 'nudges', 'debt-coaching', 'payment-reminders'],
  ARRAY['chime_summarize_upcoming_obligations'],
  'gpt-4o-mini',
  0.5,
  2000,
  true
)
ON CONFLICT (slug)
DO UPDATE SET
  title = EXCLUDED.title,
  emoji = EXCLUDED.emoji,
  system_prompt = EXCLUDED.system_prompt,
  capabilities = EXCLUDED.capabilities,
  tools_allowed = EXCLUDED.tools_allowed,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verification
DO $$
DECLARE
  chime_exists BOOLEAN;
  chime_title TEXT;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.employee_profiles WHERE slug = 'chime-ai') INTO chime_exists;
  
  IF NOT chime_exists THEN
    RAISE EXCEPTION 'Chime employee profile was not created';
  END IF;

  SELECT title INTO chime_title
  FROM public.employee_profiles
  WHERE slug = 'chime-ai';

  RAISE NOTICE '✅ Chime employee profile created/updated successfully!';
  RAISE NOTICE '   Title: %', chime_title;
END $$;
```

---

## How to Run

1. **Open Supabase Dashboard** → Go to your project
2. **Navigate to SQL Editor** (left sidebar)
3. **Copy SQL 1** → Paste into editor → Click "Run" (or press Ctrl+Enter)
4. **Copy SQL 2** → Paste into editor → Click "Run" (or press Ctrl+Enter)

Both SQL statements are **idempotent** (safe to run multiple times).

---

## Verification Queries

After running both SQL statements, verify with these queries:

### Check Recurring Obligations Table
```sql
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recurring_obligations'
ORDER BY ordinal_position;
```

### Check Chime Employee
```sql
SELECT slug, title, emoji, tools_allowed, is_active
FROM public.employee_profiles
WHERE slug = 'chime-ai';
```

Expected result:
- `title`: "Chime — Smart Debt & Reminder Coach"
- `emoji`: "🔔"
- `tools_allowed`: Should include `chime_summarize_upcoming_obligations`
- `is_active`: `true`



