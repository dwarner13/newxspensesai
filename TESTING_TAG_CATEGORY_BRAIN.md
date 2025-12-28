# Testing Guide: Tag Category Brain Tool

## Prerequisites

1. **Database Migration Applied**
   - Run `supabase/migrations/20250129_add_tag_category_brain_tool.sql` via Supabase dashboard or CLI
   - Verify Tag's `tools_allowed` includes `'tag_category_brain'`
   - Verify Tag's `system_prompt` mentions the tool

2. **Environment Setup**
   - `.env` file configured with:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY`
   - `REDIS_URL` is optional (can be empty for local dev)

## Commands to Run

### Terminal 1: Netlify Functions (Main Chat Endpoint)
```bash
netlify dev
```
This starts:
- Frontend dev server (usually on port 8888)
- Netlify Functions (including `/.netlify/functions/chat`)

### Terminal 2: Worker (Optional - Only if using OCR/queue features)
```bash
npm run worker:dev
```
**Note:** If `REDIS_URL` is not set, the worker will start in "no-queue mode" with a single clean log message. This is expected and fine for local dev.

## UI Testing Steps

### Step 1: Navigate to Smart Categories
1. Open browser: `http://localhost:8888`
2. Sign in if needed
3. Navigate to: `/dashboard/smart-categories`
4. Verify you see a table/list of categories with transaction counts

### Step 2: Open Tag Chat with Category Context
1. Find a category with real transaction data (e.g., "Groceries", "Income", "Restaurants")
2. Click the **"Tag"** button in that category's row
3. Verify:
   - Tag chat page opens: `/dashboard/chat/tag`
   - **Category Context card** appears at the top showing:
     - Category name
     - Transaction count
     - Learned count / AI count
     - Average confidence (if available)
   - **Intro message** appears (should say something like):
     > "Hey! I'm Tag. I'm looking at your **Groceries** category with X transactions. I can tell you what I've learned, how much you typically spend here, and which merchants show up the most."
   - **Placeholder text** in input field says:
     > "Ask Tag what it has learned about this category, how much you usually spend, or which merchants dominate it..."

### Step 3: Test Tool Invocation - "What have you learned?"
1. Type in the chat input: **"What have you learned about this category?"**
2. Press Enter
3. **Expected behavior:**
   - Your message appears in chat
   - Tag responds with category stats (total transactions, spending, top merchants, learning metrics)
   - Response should reference specific data from the tool

### Step 4: Test Tool Invocation - "How much do I spend?"
1. Type: **"How much do I usually spend here?"**
2. Press Enter
3. **Expected behavior:**
   - Tag calls `tag_category_brain` with the category name
   - Response includes `totalSpent` from tool result
   - May mention average transaction amount

### Step 5: Test Tool Invocation - "Which merchants?"
1. Type: **"Which merchants are most common in this category?"**
2. Press Enter
3. **Expected behavior:**
   - Tag calls `tag_category_brain`
   - Response lists top merchants from `topMerchants` array
   - Mentions transaction counts per merchant

### Step 6: Test Edge Case - Empty Category
1. Find or create a category with 0 transactions
2. Click "Tag" for that category
3. Ask: **"What have you learned about this category?"**
4. **Expected behavior:**
   - Tool returns empty result with helpful notes
   - Tag responds gracefully (no crash)
   - Message explains category is empty/new

## What to Check in Logs

### Netlify Dev Terminal (Terminal 1)

When you send a message that triggers `tag_category_brain`, you should see:

```
[Chat] Loaded 3 tools for tag-ai: [ 'tag_explain_category', 'tag_merchant_insights', 'tag_category_brain' ]
[Chat] Processing 1 tool calls
[Chat] Executing tool: tag_category_brain { employee: 'tag-ai', tool: 'tag_category_brain', args: { category: 'Groceries', timeframe: 'all' } }
[Tag Category Brain] Category: "Groceries", Timeframe: "all", UserId: <user-id>
[Tag Category Brain] Executing for category: "Groceries", timeframe: "all", userId: <user-id>
[Tag Category Brain] Found 45 transactions for category "Groceries"
[Chat] Tool tag_category_brain executed successfully
```

### Worker Terminal (Terminal 2 - if running)

If `REDIS_URL` is not set, you should see:
```
Redis not configured. Running worker in no-queue mode (local dev).
```

**No repeated errors or stack traces.**

## Network Tab Verification

1. Open browser DevTools → Network tab
2. Filter by: `chat`
3. Send a message that should trigger `tag_category_brain`
4. Click on the POST request to `/.netlify/functions/chat`
5. Check **Response** tab:
   - Should include tool call with `tag_category_brain`
   - Tool result should include:
     - `totalTransactions`
     - `totalSpent`
     - `topMerchants` (array)
     - `aiConfidenceSummary`
     - `notes` (array)

## Troubleshooting

### Tool Not Being Called
- **Check:** Tag's `tools_allowed` includes `'tag_category_brain'` in Supabase
- **Check:** System prompt includes category name explicitly
- **Check:** Category name matches exactly (case-sensitive)

### Tool Returns Empty Results
- **Check:** Category name in database matches what's being queried
- **Check:** User has transactions in that category
- **Check:** Supabase query is working (check Netlify logs)

### Worker Spam Errors
- **Fix:** Ensure `REDIS_URL` is empty or not set in `.env` for local dev
- **Fix:** Worker should log once: "Redis not configured. Running worker in no-queue mode (local dev)."

### Chat Function Build Errors
- **Check:** Run `npm run build` or `netlify build` to see TypeScript errors
- **Check:** All imports are correct (no missing dependencies)
- **Check:** `zod-to-json-schema` and `pdf-lib` are in `package.json` dependencies

## Success Criteria

✅ Chat function builds without errors  
✅ Tag chat opens from Smart Categories with category context  
✅ Tool is called when asking category-level questions  
✅ Tool returns correct data structure  
✅ Tag's response uses tool data correctly  
✅ Debug logs appear in Netlify dev console  
✅ Worker starts cleanly without Redis (no spam)  
✅ No TypeScript/build errors  
✅ No crashes or unhandled exceptions






