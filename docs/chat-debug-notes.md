# Chat System Sanity Test Guide

**Last Updated:** 2025-01-20  
**Purpose:** Quick verification that Prime chat, Custodian summaries, and handoffs are working after recent changes.

---

## Prerequisites

1. **Start Netlify Dev:**
   ```bash
   npm run netlify:dev
   # or
   netlify dev --port 8888
   ```

2. **Verify Migration Applied:**
   - Check Supabase Dashboard → SQL Editor
   - Run: `SELECT * FROM chat_convo_summaries LIMIT 1;`
   - Should return empty result (no error = table exists)

---

## Step-by-Step Sanity Test

### 1. Test Prime Chat Response

1. **Open Dashboard:**
   - Navigate to `http://localhost:8888/dashboard`
   - Wait for page to load

2. **Open Prime Chat:**
   - Click the floating Prime chat button (bottom-right)
   - OR click "Open Prime Chat" in the hero section
   - Chat panel should slide in

3. **Send Test Message:**
   - Type: `Test Prime chat and handoffs`
   - Press Enter or click Send
   - **Expected:** Prime responds within 2-5 seconds
   - **Check Browser Console:** No 500 errors from `/.netlify/functions/chat`

4. **Verify Response:**
   - Prime should respond with a message
   - Response should appear in chat bubbles
   - No error messages in UI

---

### 2. Test Custodian Conversation Summaries

1. **Check Database:**
   - After sending a message, wait 5-10 seconds (summary generation is async)
   - In Supabase Dashboard → Table Editor → `chat_convo_summaries`
   - **Expected:** A row appears with:
     - `conversation_id` matching your session ID
     - `title` (AI-generated, 3-8 words)
     - `summary` (1-2 sentences)
     - `tags` (array of tags)
     - `employees_involved` (array with `prime-boss`)

2. **Check Prime History Sidebar:**
   - Click the history icon in Prime chat header
   - OR use keyboard shortcut (if configured)
   - **Expected:** Your conversation appears with:
     - AI-generated title (not "New Chat")
     - Summary text as preview
     - Proper timestamp

3. **Click History Item:**
   - Click on your conversation in history
   - **Expected:** Chat opens with previous messages loaded

---

### 3. Test Handoffs

1. **Send Message That Should Route to Tag:**
   - In Prime chat, type: `Categorize my transactions`
   - **Expected:** 
     - Message routes to Tag employee
     - UI shows Tag avatar/name
     - Response comes from Tag
     - Handoff happens automatically

2. **Send Message That Should Route to Byte:**
   - Type: `Review my documents`
   - **Expected:**
     - Message routes to Byte employee
     - UI shows Byte avatar/name
     - Response comes from Byte

3. **Verify Handoff Tracking:**
   - Check `chat_convo_summaries` table
   - `employees_involved` should include both `prime-boss` and the handoff target (e.g., `tag-categorizer`)
   - Same `conversation_id` maintained across handoffs

---

### 4. Test Activity Feed (Optional)

1. **Check Activity Feed Function:**
   - Open browser DevTools → Network tab
   - Filter for `activity-feed`
   - Navigate to `/dashboard` (if activity feed is visible)
   - **Expected:** 
     - Request to `/.netlify/functions/activity-feed` returns 200
     - Response: `{ ok: true, events: [...] }`
     - No "lambdaFunc[lambdaHandler] is not a function" error

2. **If Table Doesn't Exist:**
   - Function should return empty array `[]` (not error)
   - This is acceptable - table can be created later

---

## Troubleshooting

### Chat Returns 500 Error

**Symptoms:**
- Browser console shows: `POST /.netlify/functions/chat 500`
- Error: `module is not defined in ES module scope`

**Fix:**
1. Check `netlify.toml` has `node_bundler = "esbuild"`
2. Verify `package.json` has `"type": "module"`
3. Restart `netlify dev`
4. Check function logs: `netlify functions:log chat`

---

### Custodian Summary Not Appearing

**Symptoms:**
- Messages work, but no row in `chat_convo_summaries`
- Browser console shows Supabase 400 errors

**Fix:**
1. Check migration was applied: `SELECT * FROM chat_convo_summaries LIMIT 1;`
2. Verify table has all columns (see migration file)
3. Check function logs for Custodian errors (should be non-blocking)
4. Summary generation is async - wait 10 seconds after sending message

---

### Handoffs Not Working

**Symptoms:**
- Messages always go to Prime, never route to other employees
- No employee change in UI

**Fix:**
1. Check router function: `netlify/functions/_shared/router.ts`
2. Verify employee profiles exist in `employee_profiles` table
3. Check chat function logs for routing decisions
4. Test with explicit employee: `{ employeeSlug: 'tag-categorizer', message: 'test' }`

---

### Activity Feed Error

**Symptoms:**
- Error: `lambdaFunc[lambdaHandler] is not a function`
- Activity feed doesn't load

**Fix:**
1. Verify `netlify/functions/activity-feed.ts` exists
2. Check it exports: `export const handler: Handler = ...`
3. Restart `netlify dev`
4. If table doesn't exist, function should return `[]` (not error)

---

## Expected Behavior Summary

✅ **Chat Function:**
- Accepts: `{ userId, message, employeeSlug?, sessionId?, stream?: true }`
- Returns: Streaming SSE or JSON response
- Status: 200 OK (not 500)

✅ **Custodian Summaries:**
- Generates title, summary, tags after messages
- Upserts into `chat_convo_summaries`
- Non-blocking (doesn't break chat if it fails)
- Appears in Prime History sidebar

✅ **Handoffs:**
- Routes messages to correct employee automatically
- Maintains same `conversation_id` across handoffs
- Updates `employees_involved` array
- UI shows correct employee avatar/name

✅ **Activity Feed:**
- Returns 200 OK (even if table doesn't exist)
- Returns `{ ok: true, events: [] }` format
- No runtime errors

---

## Quick Verification Commands

```bash
# Check chat function logs
netlify functions:log chat

# Check if migration applied
# In Supabase SQL Editor:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'chat_convo_summaries';

# Check recent summaries
SELECT conversation_id, title, summary, employees_involved, last_message_at 
FROM chat_convo_summaries 
ORDER BY last_message_at DESC 
LIMIT 5;
```

---

## Notes

- **Custodian summaries are async:** They generate in the background after messages are saved. Wait 5-10 seconds before checking database.
- **Handoffs are automatic:** The router decides which employee handles each message based on content.
- **Activity feed is optional:** If `activity_events` table doesn't exist, function returns empty array (acceptable).
- **All errors are logged:** Check Netlify function logs for detailed error messages.



