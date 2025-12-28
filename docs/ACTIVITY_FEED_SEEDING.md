# Activity Feed Seeding Guide

This guide explains how to seed test events for the Activity Feed system.

## Option 1: Using the Seed Function (Recommended for Testing)

Call the seed function via POST request:

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/seed-activity-events \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-id-here", "count": 5}'
```

Or from the browser console:

```javascript
fetch('/.netlify/functions/seed-activity-events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'your-user-id-here', count: 5 })
})
  .then(r => r.json())
  .then(console.log);
```

## Option 2: Manual SQL Insert (Supabase SQL Editor)

Run this SQL in the Supabase SQL Editor, replacing `'your-user-id-here'` with your actual user ID:

```sql
-- Insert sample activity events
INSERT INTO public.activity_events (
  user_id,
  actor_slug,
  actor_label,
  title,
  description,
  category,
  severity,
  metadata,
  created_at
) VALUES
  (
    'your-user-id-here',
    'prime-boss',
    'Prime',
    'Prime routed a question to Tag — Categories updated',
    'Tag analyzed and updated transaction categories',
    'categories',
    'success',
    '{"routed_to": "tag-ai", "transaction_count": 18}'::jsonb,
    now() - interval '5 minutes'
  ),
  (
    'your-user-id-here',
    'byte-ai',
    'Byte',
    'Byte processed 24 new transactions',
    'Successfully extracted and parsed transaction data',
    'import',
    'success',
    '{"transaction_count": 24, "source": "csv_upload"}'::jsonb,
    now() - interval '10 minutes'
  ),
  (
    'your-user-id-here',
    'liberty-ai',
    'Liberty',
    'Liberty updated your debt payoff plan',
    'Optimized payment schedule based on recent activity',
    'debt',
    'success',
    '{"plan_updated": true, "savings_estimate": 1250}'::jsonb,
    now() - interval '1 hour'
  ),
  (
    'your-user-id-here',
    'crystal-ai',
    'Crystal',
    'Crystal detected a spending pattern',
    'Unusual increase in dining expenses this month',
    'analytics',
    'info',
    '{"pattern_type": "spending_increase", "category": "dining"}'::jsonb,
    now() - interval '2 hours'
  ),
  (
    'your-user-id-here',
    'tag-ai',
    'Tag',
    'Tag auto-categorized 18 transactions',
    'Applied learned rules to categorize transactions',
    'categories',
    'success',
    '{"categorized_count": 18, "confidence_avg": 0.92}'::jsonb,
    now() - interval '3 hours'
  );

-- Verify the events were created
SELECT 
  id,
  actor_label,
  title,
  category,
  severity,
  created_at
FROM public.activity_events
WHERE user_id = 'your-user-id-here'
ORDER BY created_at DESC
LIMIT 10;
```

## Finding Your User ID

To find your user ID:

1. **From Supabase Dashboard:**
   - Go to Authentication → Users
   - Find your user and copy the UUID

2. **From Browser Console:**
   ```javascript
   // If using Supabase client
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User ID:', user?.id);
   ```

3. **From React DevTools:**
   - Check the AuthContext provider state
   - Look for `userId` in component state

## Helper Function for Backend Functions

To insert activity events from other Netlify functions (chat, smart-import, etc.), use this helper:

```typescript
// netlify/functions/_shared/activity-logger.ts
import { admin } from './supabase';

export async function logActivityEvent(
  userId: string,
  payload: {
    actorSlug: string;
    actorLabel: string;
    title: string;
    description?: string;
    category?: string;
    severity?: 'info' | 'success' | 'warning' | 'error';
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const sb = admin();
  
  const { error } = await sb.from('activity_events').insert({
    user_id: userId,
    actor_slug: payload.actorSlug,
    actor_label: payload.actorLabel,
    title: payload.title,
    description: payload.description || null,
    category: payload.category || 'system',
    severity: payload.severity || 'info',
    metadata: payload.metadata || {},
  });

  if (error) {
    console.error('[logActivityEvent] Failed to insert event:', error);
    // Don't throw - activity logging should not break main flow
  }
}
```

Then in your functions:

```typescript
import { logActivityEvent } from './_shared/activity-logger';

// After processing transactions
await logActivityEvent(userId, {
  actorSlug: 'byte-ai',
  actorLabel: 'Byte',
  title: 'Byte processed 24 new transactions',
  description: 'Successfully extracted and parsed transaction data',
  category: 'import',
  severity: 'success',
  metadata: { transaction_count: 24 },
});
```










