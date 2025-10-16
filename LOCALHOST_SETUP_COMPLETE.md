# ✅ Localhost Setup - COMPLETE

## 🎉 What's Been Done

Your Prime Chat v2 backend rebuild is now **fully configured for localhost testing** with feature flags and environment-based controls.

---

## 📦 Files Created/Modified

### Documentation Files Created:
1. **`ENV_SETUP_GUIDE.md`** - Step-by-step guide to create environment files
2. **`LOCALHOST_TEST_PLAN.md`** - Comprehensive testing procedures (30+ test cases)
3. **`QUICK_START_LOCALHOST.md`** - 5-minute quick start guide
4. **`CHAT_BACKEND_REBUILD_COMPLETE.md`** - Full rebuild documentation
5. **`LOCALHOST_SETUP_COMPLETE.md`** - This file

### Code Changes:

#### Backend:
- **`netlify/functions/chat.ts`**
  - Added `CHAT_BACKEND_VERSION=v2` flag check
  - Returns 503 if version flag doesn't match
  - Integrated with your existing router, guardrails, and memory systems

#### Frontend:
- **`src/components/dashboard/ConnectedDashboard.tsx`**
  - Added `VITE_CHAT_BUBBLE_ENABLED` feature flag
  - Wrapped Prime Chat button and panel with flag check
  - Fixed ByteDocumentChat import path (moved to _legacy)

---

## 🔧 Required Environment Variables

### `.env` (Backend - Netlify Functions)
```env
# Supabase
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
OPENAI_CHAT_MODEL=gpt-4o-mini

# Feature Flags
CHAT_BACKEND_VERSION=v2         # ⚠️ REQUIRED for new chat backend
ENABLE_TOOL_CALLING=false       # Keep off during testing
ENABLE_GMAIL_TOOLS=false        # Keep off during testing
ENABLE_SMART_IMPORT=false       # Keep off during testing
```

### `.env.local` (Frontend - Vite)
```env
# Supabase
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key

# Feature Flags
VITE_CHAT_BUBBLE_ENABLED=true   # ⚠️ REQUIRED to show chat button
VITE_CHAT_ENDPOINT=/.netlify/functions/chat
```

---

## 🧪 Testing Workflow

### Quick Start (5 minutes):
```bash
# 1. Create .env and .env.local (see above)
# 2. Install dependencies
npm install

# 3. Start dev server
netlify dev

# 4. In new terminal, test backend:
curl -X POST 'http://localhost:8888/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"00000000-0000-4000-8000-000000000001","messages":[{"role":"user","content":"Hi"}]}'

# 5. Open browser to http://localhost:8888
# 6. Look for purple crown button (👑) at bottom-right
# 7. Click and chat!
```

### Full Test Suite:
See `LOCALHOST_TEST_PLAN.md` for:
- 30+ test scenarios
- Database verification queries
- Performance benchmarks
- Troubleshooting guide

---

## ✅ Acceptance Criteria

Before deploying to staging, verify:

- [ ] Backend curl test returns streaming response
- [ ] Chat bubble visible on dashboard (when flag enabled)
- [ ] "Hi Prime" → streams response
- [ ] "Categorize expenses" → routes to Tag
- [ ] "Extract invoice" → routes to Byte
- [ ] "Analyze spending" → routes to Crystal
- [ ] PII in input → masked/redacted in response
- [ ] Unsafe prompt → blocked/softened by guardrails
- [ ] Messages persist in `chat_messages` table
- [ ] `employee_key` column populated correctly
- [ ] Summaries appear in `chat_convo_summaries`
- [ ] Guardrail events logged in `guardrail_events`

---

## 🚦 Feature Flag Control Matrix

| Environment | `CHAT_BACKEND_VERSION` | `VITE_CHAT_BUBBLE_ENABLED` | Result |
|-------------|------------------------|----------------------------|--------|
| **Localhost (testing)** | `v2` | `true` | ✅ New chat enabled |
| **Localhost (disabled)** | `v1` or unset | `false` | ❌ Old behavior |
| **Staging** | `v2` | `true` | ✅ Beta testing |
| **Production (initial)** | `v1` or unset | `false` | ❌ Safe rollout |
| **Production (after QA)** | `v2` | `true` | ✅ Live for all |

---

## 🔄 Gradual Rollout Strategy

### Phase 1: Localhost ✅ (Current)
- Test with dev Supabase
- Verify all core functionality
- Fix any bugs

### Phase 2: Staging (Next)
- Copy env vars to Netlify staging site
- Set `CHAT_BACKEND_VERSION=v2` and `VITE_CHAT_BUBBLE_ENABLED=true`
- Beta test with internal team
- Monitor for 24-48 hours

### Phase 3: Production (Canary)
- Enable for 10% of users via feature flag service
- Monitor metrics (response time, error rate, user feedback)
- Gradually increase to 50%, then 100%

### Phase 4: Tool Calling (Future)
- Once chat is stable, enable `ENABLE_TOOL_CALLING=true`
- Register tools: `get_recent_import_summary`, `get_transactions`, `email_search`
- Test "What did I just upload?" queries

---

## 📊 Monitoring Checklist

Once deployed, monitor:

### Performance:
- [ ] First token latency < 2s
- [ ] Full response time < 5s (100 tokens)
- [ ] Function execution time < 10s

### Quality:
- [ ] Guardrail detection rate > 95%
- [ ] Employee routing accuracy > 90%
- [ ] User satisfaction > 4/5 stars

### Reliability:
- [ ] Error rate < 1%
- [ ] Database write success rate = 100%
- [ ] Function cold start time < 3s

### Security:
- [ ] No PII leaks in logs
- [ ] All unsafe prompts blocked
- [ ] Audit trail in `guardrail_events`

---

## 🐛 Common Issues (Pre-emptive Solutions)

### Issue: "Chat backend v2 is disabled"
**Cause:** `CHAT_BACKEND_VERSION` not set to `v2`
**Solution:** Add to `.env`: `CHAT_BACKEND_VERSION=v2`

### Issue: Crown button not visible
**Cause:** Frontend flag not enabled or not loaded
**Solution:** 
1. Add to `.env.local`: `VITE_CHAT_BUBBLE_ENABLED=true`
2. Restart `netlify dev`
3. Hard refresh browser (`Ctrl+Shift+R`)

### Issue: 502 Bad Gateway
**Cause:** Backend function error (OpenAI, Supabase, or guardrails)
**Solution:** Check `netlify dev` terminal logs for stack trace

### Issue: Responses not streaming
**Cause:** ReadableStream not supported or CORS issue
**Solution:** Ensure Node 18+ runtime in `netlify.toml`

### Issue: Wrong employee responding
**Cause:** Router patterns not matching
**Solution:** Check `netlify/functions/_shared/router.ts` patterns

### Issue: No database writes
**Cause:** RLS policies or wrong Supabase keys
**Solution:** Verify using **service role key** (bypasses RLS)

---

## 📚 Related Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| `QUICK_START_LOCALHOST.md` | 5-min quick start | First time setup |
| `ENV_SETUP_GUIDE.md` | Environment file creation | Getting keys |
| `LOCALHOST_TEST_PLAN.md` | Comprehensive testing | Before staging deploy |
| `CHAT_BACKEND_REBUILD_COMPLETE.md` | Full architecture docs | Understanding system |

---

## 🎯 Next Steps

### Immediate (Now):
1. ✅ Create `.env` and `.env.local` files
2. ✅ Run `netlify dev`
3. ✅ Test backend with curl
4. ✅ Test frontend in browser
5. ✅ Run full test suite from `LOCALHOST_TEST_PLAN.md`

### Short Term (This Week):
1. Deploy to staging environment
2. Beta test with internal team
3. Monitor metrics and collect feedback
4. Fix any bugs discovered

### Medium Term (Next Week):
1. Gradual production rollout (10% → 50% → 100%)
2. Enable tool calling once stable
3. Add advanced features (typing indicators, history, etc.)

### Long Term (Next Month):
1. Integrate more AI employees (Tag, Byte tools)
2. Add voice input/output
3. Mobile app integration
4. Analytics dashboard for chat usage

---

## 🎉 Success Criteria Met

✅ **Legacy code isolated** - All old chat code in `_legacy/` folders
✅ **Clean production backend** - Single `chat.ts` with guardrails, memory, routing
✅ **Feature flags added** - Backend and frontend toggles for safe rollout
✅ **Environment templates** - `.env.example` guidance provided
✅ **Comprehensive testing docs** - 30+ test cases documented
✅ **Quick start guide** - 5-minute setup path available
✅ **Troubleshooting guide** - Common issues pre-solved

---

## 👏 Ready to Test!

You now have everything you need to:
1. Run Prime Chat v2 locally
2. Test all core functionality
3. Deploy to staging with confidence
4. Roll out to production safely

**Start with:** `QUICK_START_LOCALHOST.md` for the fastest path!

**Questions?** All common issues are documented in `LOCALHOST_TEST_PLAN.md` troubleshooting section.

---

**🚀 Happy Testing!**

