# 🧪 TESTING GUIDE - How to Test Everything
## Follow This Exact Order

---

## 🔴 **STEP 1: Run SQL Migration** (REQUIRED - Do This First!)

### **A. Open Supabase**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### **B. Copy the Migration**
1. Open this file in your IDE: `SIMPLE_MIGRATION_RUN_THIS.sql`
2. **Select ALL** (Ctrl+A)
3. **Copy** (Ctrl+C)

### **C. Run It**
1. Paste into Supabase SQL Editor
2. Click **RUN** (or F5)
3. Wait ~2 seconds

### **D. Verify Success**
You should see at bottom:
```
SUCCESS! Tables created:
 guardrail_events
 tenant_guardrail_settings
 user_notifications

Transactions columns added:
 category_confidence
 review_reason
 review_status
```

**If you see errors**, copy them and send to me. Otherwise, proceed! ✅

---

## 🟢 **STEP 2: Start Local Development**

### **A. Open Terminal** (in your project folder)

### **B. Start Netlify Dev**
```bash
netlify dev
```

**Wait for**:
```
◈ Server now ready on http://localhost:8888
```

This starts BOTH:
- Frontend (React): http://localhost:8888
- Backend (Functions): http://localhost:8888/.netlify/functions/*

**Keep this terminal open!** Don't close it.

---

## 🧪 **STEP 3: Test Prime's Tools**

### **A. Open Chat Test Page**

Visit: **http://localhost:8888/chat-test**

(Or if you have `/prime-chat`, use that)

### **B. Test 1: Recent Import Summary**

**Type**: "What did I upload recently?"

**Expected Response**:
```
Prime: 🔧 Using tools...
Prime: You recently uploaded [filename] on [date]. 
       I extracted [N] transactions totaling $[amount]. 
       [X] need your review.
```

**Look for in browser console** (F12):
```
📝 Note: Using tools...
🔧 Tool executing: getRecentImportSummary
✅ Tool complete: getRecentImportSummary {...}
```

---

### **C. Test 2: Query Transactions**

**Type**: "How much did I spend last month?"

**Expected**:
```
Prime: 🔧 Using tools...
Prime: You spent $[total] last month across [N] transactions.
```

**Or if you have Starbucks transactions**:

**Type**: "How much did I spend at Starbucks?"

**Expected**:
```
Prime: 🔧 Using tools...
Prime: You spent $[total] at Starbucks.
```

---

### **D. Test 3: Needs Review**

**Type**: "Do I have anything that needs review?"

**Expected**:
```
Prime: 🔧 Using tools...

Option A (if you have reviews):
Prime: You have [N] transactions that need review:
       1. $[amount] from [vendor] on [date] ([reason])
       2. ...

Option B (if none):
Prime: All your transactions look good! Nothing needs review.
```

---

### **E. Test 4: Gmail Search** (If Gmail Connected)

**Type**: "Find my Visa statements"

**Expected**:
```
Prime: 🔧 Using tools...
Prime: I found [N] Visa statements:
       1. September Statement ($[amount]) - [date]
       2. ...
       Would you like me to import them?
```

**If Gmail NOT connected**, Prime will say:
```
Prime: I couldn't find any Visa statements. 
       Make sure your Gmail is connected in settings.
```

---

## 📊 **STEP 4: Verify in Database**

### **A. Check Tool Execution Logs**

In Netlify Dev terminal, look for:
```
[Tool] Executing getRecentImportSummary {}
[Tool Metrics] { userId: "...", tool: "getRecentImportSummary", ok: true, elapsed_ms: 234 }
```

### **B. Check Supabase Database**

In Supabase:
1. Go to **Table Editor**
2. Check these tables:

**user_notifications**:
```sql
SELECT * FROM user_notifications ORDER BY created_at DESC LIMIT 5;
```
Should show recent "Imported N transactions" notifications

**guardrail_events**:
```sql
SELECT * FROM guardrail_events ORDER BY created_at DESC LIMIT 5;
```
Should show PII detection events from chat/imports

**transactions**:
```sql
SELECT id, date, merchant, amount, category, review_status 
FROM transactions 
WHERE user_id = 'your-user-id'
ORDER BY date DESC 
LIMIT 10;
```
Should show transactions with `review_status` column

---

## 🐛 **TROUBLESHOOTING**

### **Problem 1: "404 Not Found" on Functions**

**Cause**: Running `npm run dev` instead of `netlify dev`

**Fix**:
```bash
# Stop current server (Ctrl+C)
netlify dev
```

---

### **Problem 2: Prime Doesn't Use Tools**

**Symptoms**:
- Prime gives generic advice instead of using tools
- No "🔧 Using tools..." message
- No logs in terminal

**Check**:
1. Look at Netlify Dev terminal for errors
2. Open browser console (F12) - any red errors?
3. Check if chat.ts loaded the new code

**Fix**:
```bash
# Restart Netlify Dev
Ctrl+C
netlify dev
```

---

### **Problem 3: "Column does not exist" SQL Error**

**Example**: `ERROR: column "review_status" does not exist`

**Cause**: SQL migration didn't run successfully

**Fix**: Go back to STEP 1 and run the migration again

---

### **Problem 4: Tools Return Empty Results**

**Symptoms**: Prime says "You have no transactions" but you do

**Possible Causes**:
1. Wrong `userId` in test
2. Database has different column names
3. RLS policies blocking access

**Debug**:
```sql
-- Check what's actually in database
SELECT * FROM transactions LIMIT 5;

-- Check column names
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'transactions';
```

---

### **Problem 5: Streaming Stops Mid-Response**

**Cause**: Tool execution error

**Check**: Netlify Dev terminal for error stack trace

**Common errors**:
- `fetch failed` - baseUrl wrong
- `column does not exist` - schema mismatch
- `rate_limited` - too many requests

---

## ✅ **STEP 5: Test Production** (After Netlify Deploy)

### **A. Check Deploy Status**

1. Go to: https://app.netlify.com
2. Find your site
3. Check **Deploys** tab
4. Wait for "Published" (5-10 minutes)

### **B. Test Live Site**

1. Visit your production URL (e.g., `https://your-app.netlify.app`)
2. Go to `/chat-test` or `/prime-chat`
3. Repeat tests from STEP 3

### **C. Check Production Logs**

In Netlify dashboard:
1. Click **Functions** tab
2. Click `chat`
3. Check real-time logs for tool execution

---

## 📋 **SUCCESS CHECKLIST**

After testing, you should have:

- [x] SQL migration ran successfully
- [x] `netlify dev` started without errors
- [x] Chat page loads at localhost:8888
- [x] Test 1: "What did I upload recently?" → Prime uses getRecentImportSummary
- [x] Test 2: "How much at Starbucks?" → Prime uses getTransactions
- [x] Test 3: "Needs review?" → Prime uses getNeedsReview
- [x] Browser console shows tool execution logs
- [x] Netlify terminal shows [Tool] execution logs
- [x] Database has new tables (user_notifications, guardrail_events)
- [x] Database transactions table has new columns (review_status, etc.)
- [x] Production deploy completed
- [x] Production site works same as local

---

## 🎯 **ADVANCED TESTING**

### **Test File Upload**

1. Go to http://localhost:8888
2. Find upload button
3. Upload a receipt image
4. Wait ~30 seconds
5. Check notifications
6. Ask Prime: "What did I just upload?"

**Expected**: Prime summarizes the receipt you just uploaded

---

### **Test Gmail Import** (If Connected)

1. Make sure Gmail is connected
2. Chat: "Find my latest bank statement and import it"
3. Prime should:
   - Search Gmail
   - Find statement
   - Ask to confirm
   - Import it
   - Notify you when done

---

### **Test Categorization Confidence**

1. Upload receipt with unclear merchant
2. Check database: `review_status` should be `needs_review`
3. Ask Prime: "What needs review?"
4. Prime should list that transaction

---

## 💡 **TIPS**

### **Faster Testing**:
- Keep Netlify Dev running between tests
- Use browser back/forward instead of refreshing
- Open browser console (F12) to see tool logs

### **Reset Test Data**:
```sql
-- Clear test notifications
DELETE FROM user_notifications WHERE user_id = 'your-user-id';

-- Clear test transactions (careful!)
DELETE FROM transactions WHERE user_id = 'your-user-id' AND created_at > NOW() - INTERVAL '1 hour';
```

### **Watch Logs Live**:
```bash
# In Netlify Dev terminal, you'll see:
# - HTTP requests
# - Function executions
# - Tool calls
# - Errors in real-time
```

---

## 📞 **IF YOU GET STUCK**

**Copy and send me**:
1. The exact error message
2. What you typed in chat
3. What Prime responded
4. Any red errors in browser console (F12)
5. Last 10 lines from Netlify Dev terminal

I'll tell you exactly what's wrong and how to fix it!

---

## 🎉 **YOU'RE READY!**

**Start with STEP 1 (SQL migration) and work through each step.**

**Most common issue**: Forgetting SQL migration. If anything doesn't work, check that first!

**Everything working?** 🚀 You now have a production AI that can:
- Search Gmail
- Fetch attachments
- Query transactions
- Summarize imports
- List reviews
- Take actual actions!

**Welcome to the future of fintech AI!** 👑

