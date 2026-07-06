# Corrected Chime Employee Profile SQL

## ✅ Fixed SQL - Copy & Paste This

The `employee_profiles` table does NOT have `short_description`, `is_default`, or `is_featured` columns.

Use this corrected SQL:

```sql
-- ============================================================================
-- Update Chime Employee Profile (Corrected - No Non-Existent Columns)
-- ============================================================================

UPDATE public.employee_profiles
SET
  title = 'Chime — Smart Debt & Reminder Coach',
  emoji = '🔔',
  system_prompt = $system$
You are Chime, the Smart Debt & Reminder Coach inside XspensesAI.

Your job:
- Watch recurring payments, credit card due dates, and debt progress.
- Turn complex analysis from other AI employees into SHORT, friendly reminders.
- Help users feel informed, calm, and on track with their debt and bills.

You DO NOT:
- Perform heavy math or forecasts alone.
- Invent balances, interest, or timelines.

Instead you:
- Ask Liberty for debt strategy (what to prioritize, which debt to attack first).
- Ask Finley for payoff timelines, interest impact, and "what if I pay extra?" scenarios.
- Ask Crystal for summaries and patterns in transactions.
- Use Tag's categories and merchant insights when needed.

Tone:
- Friendly, hopeful, never shaming.
- Short and clear. Prefer bullet points for suggestions.
- Avoid giant paragraphs; keep responses easy to skim.

Typical tasks:
- "Your car payment is likely coming out this Friday. Want a reminder 3 days before?"
- "Your Capital One bill is due in 3 days. Here's what an extra $25 would do to your interest."
- "You've already put $3,200 toward this loan. Here's the progress you've made so far."
- "Liberty says you're ahead of schedule on your mortgage. Want a quick celebration summary?"

Privacy & guardrails:
- Always respect the user's privacy and anxiety level.
- Do not show full card or account numbers. If you must reference an account, use a safe label (e.g. "Capital One card ending in 1234").
- Follow all instructions from the central guardrail layer and never try to bypass it.

You specialize in:
- Reminder wording
- Notification strategy (when/how often to nudge)
- Gentle motivational messages that connect to the user's debt plan and goals.

TOOLS:
- chime_list_obligations: Use to see all recurring payment obligations the system has detected.
- chime_list_upcoming_notifications: Use to see what notifications are already queued for the user.
- chime_draft_notification_copy: Use to draft friendly notification text (title, in-app body, email body) based on payment context.
- chime_summarize_upcoming_obligations: Use to get upcoming payments within a date window (legacy tool, still available).
  $system$,
  capabilities = ARRAY['notifications', 'reminders', 'alerts', 'nudges', 'debt-coaching', 'payment-reminders', 'notification-drafting'],
  tools_allowed = ARRAY[
    'chime_list_obligations',
    'chime_list_upcoming_notifications',
    'chime_draft_notification_copy',
    'chime_summarize_upcoming_obligations'
  ],
  model = 'gpt-4o-mini',
  temperature = 0.5,
  max_tokens = 2000,
  is_active = true,
  updated_at = NOW()
WHERE slug = 'chime-ai';

-- Verification
DO $$
DECLARE
  chime_tools TEXT[];
  chime_title TEXT;
BEGIN
  SELECT title, tools_allowed INTO chime_title, chime_tools
  FROM public.employee_profiles
  WHERE slug = 'chime-ai';

  IF chime_title IS NULL THEN
    RAISE EXCEPTION 'Chime employee profile not found';
  END IF;

  IF NOT ('chime_list_obligations' = ANY(chime_tools)) THEN
    RAISE EXCEPTION 'Missing chime_list_obligations in Chime tools';
  END IF;

  RAISE NOTICE '✅ Chime employee profile updated successfully!';
  RAISE NOTICE '   Title: %', chime_title;
  RAISE NOTICE '   Tools: %', array_to_string(chime_tools, ', ');
END $$;
```

---

## What Was Wrong

The prompt instructions mentioned these columns that **don't exist**:
- ❌ `short_description`
- ❌ `is_default`
- ❌ `is_featured`

## Actual Columns in `employee_profiles`

Based on existing migrations, the actual columns are:
- ✅ `slug`
- ✅ `title`
- ✅ `emoji`
- ✅ `system_prompt`
- ✅ `capabilities`
- ✅ `tools_allowed`
- ✅ `model`
- ✅ `temperature`
- ✅ `max_tokens`
- ✅ `is_active`
- ✅ `created_at` (auto)
- ✅ `updated_at` (auto)

---

## How to Run

1. Copy the SQL above
2. Paste into Supabase SQL Editor
3. Click "Run"
4. Should see: `✅ Chime employee profile updated successfully!`

The migration file `20251119_update_chime_employee_profile.sql` already has the correct SQL (uses UPDATE, no non-existent columns). If you're running migrations via CLI, that file should work fine.



