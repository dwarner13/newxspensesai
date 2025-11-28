# Chime Notification System - Implementation Summary

## ✅ Implementation Complete

Complete database layer and detection pipeline for recurring payments and notifications, fully integrated into Smart Import / Byte / Tag flow with guardrails and PII safety.

---

## Files Created/Updated

### 1. Database Migration ✅
**File**: `supabase/migrations/20251119_add_chime_recurring_and_notifications.sql`

**Tables Created/Updated:**

#### `recurring_obligations` (updated existing table)
- Added new columns: `account_id`, `category`, `amount_variance`, `last_amount`, `last_observed_date`, `confidence`, `notes`
- Maintains backward compatibility with existing `avg_amount`, `last_seen_date`, `first_seen_date` columns
- Full RLS policies for user data isolation

#### `user_notifications` (new table)
- Stores queued notifications for in-app, email, and push channels
- Links to `recurring_obligations` via `obligation_id`
- Status tracking: `queued`, `sent`, `dismissed`, `cancelled`
- Metadata JSONB for storing extra context (interest saved, forecasts, etc.)
- Full RLS policies

#### `user_notification_settings` (new table)
- User preferences for notification channels
- Quiet hours support (JSONB)
- Full RLS policies

**SQL Migration Highlights:**
- Idempotent (safe to run multiple times)
- Adds missing columns to existing `recurring_obligations` table
- Creates new tables with proper indexes
- RLS policies ensure users can only access their own data
- Triggers for `updated_at` timestamps

### 2. Recurring Detection Helper ✅
**File**: `netlify/functions/_shared/recurringDetection.ts`

**Functions:**
- `detectAndUpsertRecurringObligations(candidates)` - Main detection function
- Analyzes transaction patterns to detect recurring payments
- Groups by merchant + category
- Requires minimum 3 transactions per merchant
- Detects frequency: weekly (5-9 days), biweekly (10-18 days), monthly (26-35 days), quarterly (85-95 days)
- Calculates confidence scores based on occurrence count, amount consistency, interval consistency
- Upserts into `recurring_obligations` table

**Guardrails:**
- All queries scoped by `user_id`
- User IDs masked in logs (only first 8 chars shown)
- Safe error handling (continues on errors, doesn't fail entire batch)
- No PII in logs

### 3. Notification Queue Helper ✅
**File**: `netlify/functions/_shared/chimeNotifications.ts`

**Functions:**
- `queueUpcomingPaymentNotifications(options)` - Queues notifications for upcoming payments
- Looks up `recurring_obligations` within horizon window
- Respects `user_notification_settings` (skips disabled channels)
- Creates placeholder notifications (Chime will refine title/body later)
- Schedules notifications 3 days before payment due date

**Guardrails:**
- All queries scoped by `user_id`
- User IDs masked in logs
- Respects user preferences
- Safe error handling

### 4. Commit-Import Integration ✅
**File**: `netlify/functions/commit-import.ts`

**Changes:**
- After successful transaction commit, fetches newly committed transactions
- Groups by merchant + category to form `RecurringCandidate[]`
- Calls `detectAndUpsertRecurringObligations()` synchronously
- Logs detection results (masked user IDs)
- Queues notifications asynchronously (doesn't block response)

**Guardrails:**
- Only processes transactions for the authenticated user (`user_id` from header)
- User IDs masked in logs
- Detection errors don't fail the import
- Notification queuing failures are silent (non-critical)

---

## How Recurring Detection is Triggered

### Automatic (After Import)
1. User imports transactions via Smart Import
2. `commit-import.ts` commits transactions to database
3. After commit, `commit-import.ts`:
   - Fetches newly committed transactions for that import
   - Groups by merchant + category
   - Calls `detectAndUpsertRecurringObligations()`
   - Logs results
   - Queues notifications for upcoming payments

### Manual (Future)
Can be triggered manually via API call to a dedicated endpoint (not implemented yet).

---

## Detection Algorithm

### Pattern Detection Criteria
1. **Minimum Occurrences**: At least 3 transactions from same merchant (+ category)
2. **Amount Consistency**: Calculates variance and coefficient of variation
3. **Date Regularity**: Analyzes intervals between transactions
4. **Confidence Score**: Weighted combination of:
   - Occurrence count (40%)
   - Amount consistency (30%)
   - Interval consistency (30%)

### Frequency Detection
- **Weekly**: 5-9 day intervals
- **Biweekly**: 10-18 day intervals
- **Monthly**: 26-35 day intervals
- **Quarterly**: 85-95 day intervals
- **Unknown**: Other intervals (still stored with `interval_days`)

### Next Date Calculation
- Uses `last_observed_date + interval_days`
- Automatically advances if calculated date is in the past

---

## Notification Queuing

### Process
1. Looks up `recurring_obligations` where `next_estimated_date` is within `horizonDays`
2. Checks `user_notification_settings` for enabled channels
3. Creates notifications for each enabled channel:
   - `in_app` (default: enabled)
   - `email` (default: enabled)
   - `push` (default: disabled)
4. Schedules notifications 3 days before payment due date
5. Uses placeholder title/body (Chime will refine later)

### Notification Structure
```typescript
{
  user_id: string,
  obligation_id: string,
  channel: 'in_app' | 'email' | 'push',
  type: 'upcoming_payment',
  title: string, // Placeholder - Chime will refine
  body: string,  // Placeholder - Chime will refine
  status: 'queued',
  scheduled_at: timestamp,
  created_by_employee_slug: 'chime-ai',
  meta: {
    merchant_name: string,
    amount: number,
    due_date: string,
    days_until: number
  }
}
```

---

## Guardrails & PII Safety

### Database Security
- ✅ All tables have RLS enabled
- ✅ All policies restrict to `auth.uid() = user_id`
- ✅ No cross-user data access possible

### Query Safety
- ✅ All queries filtered by `user_id`
- ✅ No raw user input in SQL queries (parameterized)
- ✅ User IDs from auth headers, not request body

### Logging Safety
- ✅ User IDs masked (only first 8 chars + "...")
- ✅ No PII in logs (no account numbers, SSNs, etc.)
- ✅ Merchant names truncated in logs (first 20 chars)
- ✅ Uses `safeLog()` helper for consistent masking

### Error Handling
- ✅ Detection errors don't fail imports
- ✅ Notification queuing failures are silent
- ✅ All errors logged with masked user IDs

---

## Testing Checklist

### 1. Run Migration
```bash
supabase migration up
```

Or manually in Supabase SQL Editor:
- Run `supabase/migrations/20251119_add_chime_recurring_and_notifications.sql`

### 2. Verify Tables
```sql
-- Check recurring_obligations
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recurring_obligations'
ORDER BY ordinal_position;

-- Check user_notifications
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_notifications'
ORDER BY ordinal_position;

-- Check user_notification_settings
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_notification_settings'
ORDER BY ordinal_position;
```

### 3. Test Detection
1. Import transactions with recurring payments (e.g., 3+ payments to same merchant)
2. Check logs for: `[Chime] Recurring detection complete`
3. Verify in database:
```sql
SELECT * FROM recurring_obligations 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY next_estimated_date;
```

### 4. Test Notification Queuing
1. Ensure you have recurring obligations with `next_estimated_date` in next 14 days
2. Check `user_notifications` table:
```sql
SELECT * FROM user_notifications 
WHERE user_id = 'YOUR_USER_ID' 
AND status = 'queued'
ORDER BY scheduled_at;
```

---

## TODOs for Later Steps

### 1. Chime Tool Integration
- [ ] Create Chime tool to refine notification title/body
- [ ] Wire tool to process queued notifications
- [ ] Add tool to Chime's `tools_allowed` array

### 2. Notification Sending
- [ ] Implement in-app notification display
- [ ] Implement email sending (via email service)
- [ ] Implement push notifications (via push service)
- [ ] Respect quiet hours from `user_notification_settings`

### 3. Notification Management
- [ ] Allow users to dismiss notifications
- [ ] Allow users to snooze notifications
- [ ] Track notification open/click rates

### 4. Enhanced Detection
- [ ] Improve category detection (use merchant name patterns)
- [ ] Detect currency from transactions
- [ ] Handle variable amounts better (e.g., credit card minimum payments)
- [ ] Detect when payments stop (mark obligations as inactive)

### 5. Manual Triggers
- [ ] Create API endpoint to manually trigger detection
- [ ] Create admin UI to trigger detection for specific users
- [ ] Add scheduled job to re-run detection periodically

---

## Summary

✅ **Database migration complete** - 3 tables with full RLS
✅ **Detection helper implemented** - Pattern detection with confidence scoring
✅ **Notification queuing implemented** - Respects user preferences
✅ **Wired into commit-import** - Automatic detection after imports
✅ **Guardrails enforced** - All queries user-scoped, PII masked in logs

**Status**: Ready for testing. Next step: Wire Chime tools to refine and send notifications.

---

**Implementation Date**: November 19, 2025
**Migration File**: `20251119_add_chime_recurring_and_notifications.sql`
**Detection Helper**: `netlify/functions/_shared/recurringDetection.ts`
**Notification Helper**: `netlify/functions/_shared/chimeNotifications.ts`



