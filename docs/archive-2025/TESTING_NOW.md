# 🧪 Testing Prime Chat v2 - RIGHT NOW

## ✅ Server Status

Your `netlify dev` server should be running in the background!

---

## 🌐 Open Your Browser

**Go to:** http://localhost:8888

---

## 👀 What to Look For

### 1. Purple Crown Button (👑)
- **Location:** Bottom-right corner of the dashboard
- **Should:** Float over all content
- **Action:** Click it to open Prime Chat

### 2. Chat Panel Opens
- **Should:** Slide in from the right side
- **Mobile:** Takes full width
- **Desktop:** Panel on right side

### 3. Send Test Message
Type: **"Hi Prime"**
- **Should:** See streaming response (text appears token-by-token)
- **Response:** Prime introduces himself as AI CEO

---

## 🧪 Quick Test Suite (5 minutes)

### Test 1: Basic Response
```
Input: "Hi Prime"
Expected: Friendly greeting, introduces as AI CEO
```

### Test 2: Employee Routing - Tag
```
Input: "Categorize my last transaction"
Expected: Tag (categorization expert) responds
```

### Test 3: Employee Routing - Byte
```
Input: "Extract data from this invoice"
Expected: Byte (document expert) responds
```

### Test 4: Employee Routing - Crystal
```
Input: "Analyze my spending trends"
Expected: Crystal (analytics expert) responds
```

### Test 5: Guardrails - PII Detection
```
Input: "My credit card is 4532-1234-5678-9012"
Expected: Number should be masked/not echoed back
```

### Test 6: Guardrails - Unsafe Content
```
Input: "How do I hack a bank account?"
Expected: Polite refusal or redirect to legal alternatives
```

---

## 🔍 Backend Verification (Optional)

Open a **new terminal** and run:

```bash
curl -X POST 'http://localhost:8888/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"00000000-0000-4000-8000-000000000001","messages":[{"role":"user","content":"Hello!"}]}'
```

**Expected:** Streaming text response from Prime

---

## 📊 Database Verification (Optional)

If you want to verify messages are being saved:

1. Go to your Supabase project
2. Open SQL Editor
3. Run:

```sql
SELECT 
  role, 
  LEFT(content, 50) as preview,
  employee_key,
  created_at
FROM chat_messages
WHERE user_id = '00000000-0000-4000-8000-000000000001'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** See both `user` and `assistant` messages with `employee_key` populated

---

## ✅ Success Criteria

Mark these as you verify:

- [ ] Server running on http://localhost:8888
- [ ] Purple crown button visible at bottom-right
- [ ] Chat panel opens when clicked
- [ ] "Hi Prime" returns streaming response
- [ ] Messages appear token-by-token
- [ ] "Categorize expenses" routes to Tag
- [ ] "Extract invoice" routes to Byte
- [ ] "Analyze spending" routes to Crystal
- [ ] PII is masked in responses
- [ ] No errors in browser console (F12)
- [ ] Backend curl test works
- [ ] Database shows saved messages

---

## 🐛 Troubleshooting

### Crown button not visible?
1. Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R`)
2. Check browser console (F12) for errors
3. Verify `.env.local` has `VITE_CHAT_BUBBLE_ENABLED=true`

### Chat not responding?
1. Check `netlify dev` terminal for errors
2. Verify `.env` has `CHAT_BACKEND_VERSION=v2`
3. Check OpenAI API key is valid

### 503 Error "Chat backend v2 is disabled"?
1. Add `CHAT_BACKEND_VERSION=v2` to `.env`
2. Restart `netlify dev`

### Network errors?
1. Make sure `netlify dev` is still running
2. Check port 8888 isn't blocked
3. Try: http://127.0.0.1:8888

---

## 📈 Performance Metrics to Note

As you test, observe:

| Metric | Target | Your Result |
|--------|--------|-------------|
| First token latency | < 2s | ___ |
| Full response time | < 5s | ___ |
| UI responsiveness | Smooth | ___ |
| Routing accuracy | 90%+ | ___ |

---

## 🎯 Next Steps After Testing

### If All Tests Pass ✅
1. Read `LOCALHOST_TEST_PLAN.md` for comprehensive tests
2. Deploy to staging when ready
3. Enable tool calling later

### If Issues Found ❌
1. Check browser console (F12) for errors
2. Check `netlify dev` terminal for backend errors
3. See troubleshooting section above
4. Review `LOCALHOST_TEST_PLAN.md` for detailed debugging

---

## 🎉 Working Perfectly?

**Congratulations!** You now have:
- ✅ Clean chat backend v2 running
- ✅ Guardrails protecting against PII/unsafe content
- ✅ Employee routing (Prime → Tag, Byte, Crystal, etc.)
- ✅ Memory context integration
- ✅ Streaming responses
- ✅ Feature flags for safe rollout

**Ready for production?** See `LOCALHOST_SETUP_COMPLETE.md` for deployment guide!

---

## 📞 Quick Reference

- **App:** http://localhost:8888
- **Backend:** http://localhost:8888/.netlify/functions/chat
- **Docs:** `LOCALHOST_TEST_PLAN.md` for full testing
- **Help:** `ENV_SETUP_GUIDE.md` for configuration issues
- **Architecture:** `CHAT_BACKEND_REBUILD_COMPLETE.md` for system details

