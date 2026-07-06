# Tag Category Brain - End-to-End Testing Guide

## Prerequisites

1. **Database Migration Applied:**
   - Ensure `supabase/migrations/20250129_add_tag_category_brain_tool.sql` has been applied
   - Verify in Supabase dashboard: `employee_profiles` table, `slug = 'tag-ai'` should have `'tag_category_brain'` in `tools_allowed`

2. **Start Development Servers:**
   ```bash
   # Terminal 1: Netlify Functions + Frontend
   netlify dev
   
   # Terminal 2: Worker (optional, should start cleanly without Redis)
   npm run worker:dev
   ```

3. **Verify Worker Starts Cleanly:**
   - Should see: `[INFO] Redis not configured. Running worker in no-queue mode (local dev).`
   - No repeating `ECONNREFUSED` errors

---

## Test Flow 1: Tag + Category Context (Smart Categories)

### Steps:

1. **Navigate to Smart Categories:**
   - Open browser: `http://localhost:8888/dashboard/smart-categories`
   - Find a category with transaction data (e.g., "Income", "Groceries", "Rent")

2. **Open Tag Chat:**
   - Click the **"Tag"** button in the Actions column for that category
   - URL should be: `/dashboard/chat/tag`

3. **Verify UI Elements:**
   - ✅ **Context Header Card** appears at top showing:
     - Category name
     - Transaction count
     - Learned count (with brain icon)
     - Average confidence (if available)
   - ✅ **Category Context** badge/chip visible
   - ✅ **Friendly Intro Message** appears (only once):
     > "Hey! I'm Tag. I'm looking at your **{Category Name}** category with X transaction(s). I can tell you what I've learned, how much you typically spend here, and which merchants show up the most."
   - ✅ **Placeholder Text** says:
     > "Ask Tag what it has learned about this category, how much you usually spend, or which merchants dominate it..."
   - ✅ **Dev Mode Debug Panel** (if `import.meta.env.DEV === true`) appears when tools are called

4. **Test Questions (Must Trigger `tag_category_brain`):**

   **Question 1:** "What have you learned about this category?"
   - **Expected Behavior:**
     - Tag calls `tag_category_brain` with category="{exact category name}"
     - Tag's response includes:
       - Total transactions count
       - Total spending amount
       - Top merchants (if any)
       - Learning stats (learnedCount, aiCount percentages)
       - Insights from tool's `notes[]` array
   
   **Question 2:** "How much do I usually spend here?"
   - **Expected Behavior:**
     - Tag calls `tag_category_brain`
     - Response includes `totalSpent` and `avgTransactionAmount` from tool result
   
   **Question 3:** "Which merchants show up the most in this category?"
   - **Expected Behavior:**
     - Tag calls `tag_category_brain`
     - Response lists top merchants from `topMerchants[]` array with counts and amounts

   **Question 4:** "Tell me about this category"
   - **Expected Behavior:**
     - Tag calls `tag_category_brain`
     - Response provides comprehensive overview using tool data

5. **Check Browser Network Tab:**
   - Open DevTools → Network tab
   - Filter: `chat`
   - Find POST request to `/.netlify/functions/chat`
   - **Request Payload:**
     ```json
     {
       "userId": "...",
       "message": "What have you learned about this category?",
       "employeeSlug": "tag-ai",
       "systemPromptOverride": "You are Tag, a friendly transaction categorization AI..."
     }
     ```
   - **Response:** SSE stream with `data: {"type":"tool_executing","tool":"tag_category_brain","args":{"category":"Income","timeframe":"all"}}` events

6. **Check Netlify Dev Logs (Terminal 1):**
   ```
   [Chat] Routed to: tag-ai (custom system prompt provided)
   [Chat] Loaded 3 tools for tag-ai: [ 'tag_explain_category', 'tag_merchant_insights', 'tag_category_brain' ]
   [Chat] Processing 1 tool calls
   [Chat] Executing tool: tag_category_brain { employee: 'tag-ai', tool: 'tag_category_brain', args: { category: 'Income', timeframe: 'all' } }
   [Tag Category Brain] Executing for category: "Income", timeframe: "all", userId: ...
   [Tag Category Brain] Found X transactions for category "Income"
   [Chat] Tool tag_category_brain executed successfully
   ```

7. **Verify Dev Debug Panel (if in dev mode):**
   - Yellow debug panel appears showing: `→ tag_category_brain`
   - Shows tool args: `{"category":"Income","timeframe":"all"}`
   - Console log: `[usePrimeChat] Tool executing: tag_category_brain`
   - Message: "💡 Tag Category Brain was called - check browser console & Netlify dev logs for full result"

---

## Test Flow 2: Tag + Transaction Context (Transactions Page)

### Steps:

1. **Navigate to Transactions:**
   - Open: `http://localhost:8888/dashboard/transactions`
   - Click on any transaction row to open detail panel

2. **Open Tag Chat:**
   - Click **"Talk to Tag about this transaction"** button
   - URL: `/dashboard/chat/tag`

3. **Verify UI Elements:**
   - ✅ **Transaction Context Card** shows:
     - Description
     - Category (with badge)
     - Amount (green for income, red for expense)
     - Merchant (if available)
   - ✅ **Transaction Context** badge visible
   - ✅ **Friendly Intro:**
     > "Hey! I'm Tag. I'm looking at this specific transaction in your **{Category}** category. Ask me why it's categorized this way or how I usually treat this merchant."
   - ✅ **Placeholder:**
     > "Ask Tag why this transaction is categorized this way, or how it usually treats this merchant..."

4. **Test Questions:**

   **Question 1:** "Why is this categorized as {category}?"
   - **Expected:** Tag calls `tag_explain_category` with transaction ID
   - **Check Logs:** `[Chat] Executing tool: tag_explain_category`

   **Question 2:** "How do I usually categorize {merchant}?"
   - **Expected:** Tag calls `tag_merchant_insights` with merchant name
   - **Check Logs:** `[Chat] Executing tool: tag_merchant_insights`

---

## Test Flow 3: Edge Cases

### Empty Category:

1. Select a category with 0 transactions (or create a new one)
2. Click "Tag" button
3. Ask: "What have you learned about this category?"
4. **Expected:**
   - Tool is called
   - Tool returns empty result with helpful notes
   - Tag responds gracefully: "I don't have enough data yet for this category..."

### Category Name Case Sensitivity:

1. Open Tag chat for category "Income" (capital I)
2. Ask: "What have you learned about income?" (lowercase)
3. **Expected:**
   - Tag should still use exact category name "Income" when calling tool
   - Check logs: `category: "Income"` (not "income")
   - Check Network tab: `args: {"category":"Income","timeframe":"all"}`

### Multiple Tool Calls:

1. In category context, ask: "What have you learned and which merchants are most common?"
2. **Expected:**
   - Tag calls `tag_category_brain` once
   - Response includes both learning stats AND merchant list from single tool call

### Tool Execution Errors:

1. Simulate a database error (e.g., disconnect Supabase temporarily)
2. Ask: "What have you learned about this category?"
3. **Expected:**
   - Tool execution fails gracefully
   - Tag responds: "I had trouble loading stats for this category, but I can still talk about your finances in general."
   - Error logged in Netlify dev terminal

---

## Troubleshooting

### Tool Not Being Called:

**Symptoms:** Tag responds without calling `tag_category_brain`

**Checks:**
1. Verify `employee_profiles` table: `slug = 'tag-ai'` has `'tag_category_brain'` in `tools_allowed`
2. Check system prompt includes explicit instruction to use tool
3. Check Netlify logs for: `[Chat] Loaded X tools for tag-ai`
4. Verify category name in system prompt matches exactly (case-sensitive)
5. Check browser console for: `[usePrimeChat] Tool executing: tag_category_brain`

### Tool Returns Error:

**Symptoms:** Netlify logs show `[Chat] Tool tag_category_brain returned error`

**Checks:**
1. Verify Supabase connection works
2. Check `transactions` table has data for that category
3. Verify `user_id` matches authenticated user (should be demo UUID: `00000000-0000-4000-8000-000000000001`)
4. Check tool logs: `[Tag Category Brain] Query error: ...`

### Dev Debug Panel Not Showing:

**Symptoms:** No yellow debug panel appears

**Checks:**
1. Verify `import.meta.env.DEV === true` (check browser console)
2. Check `toolCalls` array is populated (React DevTools)
3. Verify SSE stream includes `{"type":"tool_executing","tool":"tag_category_brain"}` events
4. Check browser console for: `[usePrimeChat] Tool executing: tag_category_brain`

### System Prompt Not Being Sent:

**Symptoms:** Tag doesn't have category context

**Checks:**
1. Verify `systemPromptOverride` is in request body (Network tab → Request Payload)
2. Check `EmployeeChatPage.tsx` builds `systemPrompt` correctly
3. Verify `usePrimeChat` hook receives `systemPrompt` prop
4. Check Netlify logs: `(custom system prompt provided)`

### UUID Errors:

**Symptoms:** Netlify logs show `invalid input syntax for type uuid: "anonymous"`

**Checks:**
1. Verify `EmployeeChatPage.tsx` uses `DEMO_USER_ID` constant instead of `'anonymous'`
2. Check `effectiveUserId` is set correctly: `user?.id || DEMO_USER_ID`
3. Verify AuthContext provides demo user ID when no session exists

---

## Success Criteria

✅ Tag Category Brain tool is called reliably for category-level questions  
✅ Tool results are used to generate comprehensive, data-driven answers  
✅ Category name is passed exactly (case-sensitive)  
✅ Dev debug panel shows tool calls in development with args  
✅ Netlify logs show detailed tool execution  
✅ Empty categories handled gracefully  
✅ Transaction context still works with `tag_explain_category`  
✅ Merchant insights still works with `tag_merchant_insights`  
✅ No duplicate intro messages  
✅ No system prompt text visible in chat UI  
✅ Placeholder text is context-aware  
✅ Tool execution errors handled gracefully  
✅ SSE tool_executing events parsed correctly in frontend  

---

## Next Steps (Future Enhancements)

- [ ] Add caching for category brain results (avoid repeated queries)
- [ ] Visualize category stats in a chart/graph component
- [ ] Add timeframe selector UI (last 30 days, this month, etc.)
- [ ] Cross-category comparisons ("How does this compare to Groceries?")
- [ ] Trend analysis (month-over-month spending changes)
- [ ] Export category insights as PDF report
