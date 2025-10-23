# 🧪 CRYSTAL 2.0 TESTING GUIDE

**Date:** October 18, 2025  
**Version:** 2.0 (17-Section System Prompt)

---

## 📋 TESTING OVERVIEW

Crystal 2.0 is deployed with 4 key testing scenarios:

1. ✅ **Industry Detection** - Bakery business context
2. ✅ **Proactive Alert** - Spending spike detection
3. ✅ **Strategic Guidance** - Tradeoff analysis & recommendations
4. ✅ **Delegation** - Document import task routing

---

## 🚀 TEST ENVIRONMENT

**Endpoint:** `http://localhost:8888/.netlify/functions/chat-v3-production`  
**Mode:** `nostream=1` (non-streaming for clarity)  
**Database:** Supabase (development)  
**User ID:** `00000000-0000-4000-8000-000000000001`

---

## 🧪 SCENARIO 1: Industry Detection

### Test Objective
Crystal detects that user runs a bakery and tailors financial analysis to bakery business model.

### Curl Command
```bash
curl -i -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1' \
  -H 'content-type: application/json' \
  -d '{
    "userId": "00000000-0000-4000-8000-000000000001",
    "message": "Hi Crystal, I run a bakery in Portland. What are my top spending categories and how should I think about optimizing them?"
  }'
```

### Expected Response (Pass Criteria)
✅ Crystal detects "bakery" industry  
✅ Mentions food/ingredient costs as top driver  
✅ References labor costs and seasonal demand  
✅ Tailors recommendations (e.g., "negotiate supplier rates", "optimize labor scheduling")  
✅ Uses industry-aware language (not generic)  
✅ Provides actionable next steps for bakery business model  

### Example Output
```
Crystal 2.0 Response:

"Great! Running a bakery in Portland. I see three key dynamics I'm tracking for you:

**Top Spend Categories (for bakeries):**
1. Food & Supplies (40-50% of revenue) — ingredient costs, packaging
2. Labor (25-35%) — staff wages during peak hours
3. Rent & Utilities (10-15%) — commercial kitchen space

**Strategic Insights Specific to Your Model:**

Your biggest optimization opportunity is **ingredient negotiation**. Portland has good supplier competition, so I recommend:
- Negotiate bulk rates with your top 3 suppliers (typically 5-10% savings)
- Consider a standing order for seasonal items (summer bread vs winter pastries)

**Seasonal Pattern to Monitor:**
Your summer months likely see 25-30% higher revenue (tourists, outdoor events). Plan labor & inventory accordingly.

**Next Steps:**
1. Pull your last 3 months of transactions so I can see exact category breakdowns
2. I can route these to Tag to set up smart categorization rules
3. We can build a seasonal budget with Goalie to track against actual spend

What would help most right now?"
```

---

## 🧪 SCENARIO 2: Proactive Alert

### Test Objective
Crystal proactively alerts user to a spending spike (e.g., 30% MoM increase in software category) without being asked.

### Prerequisites
- Ensure test user has transactions with:
  - September software spend: $200
  - October software spend: $260 (30% spike)
  - October current category spend: $3,500 total

### Curl Command
```bash
curl -i -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1' \
  -H 'content-type: application/json' \
  -d '{
    "userId": "00000000-0000-4000-8000-000000000001",
    "message": "Crystal, what should I be paying attention to this month?"
  }'
```

### Expected Response (Pass Criteria)
✅ Crystal analyzes analytics context (MoM deltas)  
✅ Detects 30% spike in software category  
✅ Proactively alerts user WITHOUT being directly asked  
✅ Provides specific dollar amount and percentage change  
✅ Suggests root cause analysis ("Review subscriptions for unused seats")  
✅ Offers actionable next steps  

### Example Output
```
Crystal 2.0 Response:

"Let me scan your financials for this month...

**⚠️ PROACTIVE ALERT: Spending Spike Detected**

Your **Software & SaaS** category jumped **30%** ($60 increase) from September to October.
- September: $200
- October: $260

This is material enough to warrant investigation. Common causes:
1. New subscription added (annual plan charged upfront?)
2. Unused trial subscriptions auto-converting
3. License renewal or tier upgrade

**Immediate Action:**
I'm suggesting you review all your software subscriptions:
- Slack, Zoom, Adobe, etc. — Check for unused seats
- Look for any new vendors added in October
- Identify if any annual plans renewed this month

**Recommendation:**
Cancel unused licenses → you could recover $20-30/month easily.

Want me to delegate this to Tag to set up rules, or shall we pull your specific software vendors?"
```

---

## 🧪 SCENARIO 3: Strategic Guidance

### Test Objective
Crystal provides CFO-level strategic guidance with tradeoff analysis when asked about business decisions.

### Curl Command
```bash
curl -i -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1' \
  -H 'content-type: application/json' \
  -d '{
    "userId": "00000000-0000-4000-8000-000000000001",
    "message": "Should I negotiate better rates with my suppliers? I'm worried it might damage relationships."
  }'
```

### Expected Response (Pass Criteria)
✅ Crystal acknowledges the tradeoff concern  
✅ Provides insight → recommendation → strategy structure  
✅ Evaluates short-term vs long-term implications  
✅ Suggests how to minimize relationship risk  
✅ Offers specific action plan (e.g., "start with top 3 vendors")  
✅ Quantifies potential ROI/benefit  
✅ Uses CFO-level language (not generic)  

### Example Output
```
Crystal 2.0 Response:

"Smart question — and you're right to think about relationships.

**The Tradeoff:**
- **Short-term:** Negotiations can feel awkward; suppliers may push back
- **Long-term:** Better margins + competitive advantage; relationships strengthen with transparency

**My Recommendation: YES, negotiate — but strategically.**

Here's why: Well-managed suppliers EXPECT margin discussions. It's part of business. What damages relationships is *surprise* or *pressure*. What builds them is *transparency*.

**Suggested Approach (Low Risk):**

**Phase 1 (Immediate):** Start with your Top 3 vendors (probably 60-70% of your supplier spend)
- Timing: End of quarter (they have targets to hit)
- Angle: "We love working together; volumes growing; can we optimize pricing?"
- Target: 5-10% reduction
- Potential upside: $X,000/year

**Phase 2 (60 days later):** Expand to remaining vendors
- You'll have negotiation precedent
- Suppliers will see you're serious

**Risk Mitigation:**
- Frame as "partnership optimization" not cost-cutting
- Offer longer contracts in exchange for lower rates
- Keep relationship owner involved (not just procurement)

**Expected Outcome:**
Realistic 5-10% savings on supplier spend = $X,000+ annual benefit with zero relationship damage.

**Next Steps:**
1. Pull your top 5 vendors by spend
2. I can analyze their leverage and suggest opening positions
3. Tag can help automate better tracking post-negotiation

Ready to dive in?"
```

---

## 🧪 SCENARIO 4: Delegation

### Test Objective
Crystal intelligently delegates document import task to Byte (OCR specialist) with proper explanation.

### Curl Command
```bash
curl -i -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1' \
  -H 'content-type: application/json' \
  -d '{
    "userId": "00000000-0000-4000-8000-000000000001",
    "message": "I have 50 old expense receipts as PDFs in Google Drive. Can you help me import them?"
  }'
```

### Expected Response (Pass Criteria)
✅ Crystal recognizes document import task  
✅ Decides to delegate to Byte (OCR specialist)  
✅ Explains WHO and WHY clearly to user  
✅ Describes the process (Guardrails → OCR → Normalize → Categorize → Save)  
✅ Offers Byte's three import options (upload, email, Gmail sync)  
✅ Provides follow-up coordination  

### Example Output
```
Crystal 2.0 Response:

"Perfect — this is exactly what Byte excels at. Let me hand this off to them.

**Delegating to Byte (OCR & Document Import Specialist):**

Byte will handle:
1. **Security Scan** — Guardrails check for PII
2. **OCR Extraction** — Convert PDF/image → transaction data
3. **Normalization** — Parse dates, amounts, vendor names
4. **Categorization** — Auto-tag based on vendor + amount patterns
5. **Storage** — Save to your transaction history

**Your Options (Byte will walk you through):**

Option 1: **Direct Upload** — Select 50 PDFs, upload to dashboard
Option 2: **Email Import** — Forward receipts to import@xpenses.ai
Option 3: **Gmail Sync** — Auto-pull from Gmail receipts label

**What Happens Next:**
- Byte processes all 50 → ~5 minutes
- You see pending transactions ready for review
- I'll flag any low-confidence extractions for manual review
- Then saved to your history

**Timeline:** Usually 15-30 min to review + approve

Ready? Byte is standing by. Which import method works best for you?"
```

---

## 🧪 SCENARIO 5: PII Protection (Bonus)

### Test Objective
Crystal detects PII (credit card) and refuses to process it, explaining guardrails.

### Curl Command
```bash
curl -i -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1' \
  -H 'content-type: application/json' \
  -d '{
    "userId": "00000000-0000-4000-8000-000000000001",
    "message": "My card is 4111-1111-1111-1111 and it'\''s been deactivated. Can you help?"
  }'
```

### Expected Response (Pass Criteria)
✅ Crystal detects PII (credit card)  
✅ Refuses to process/store raw card number  
✅ Acknowledges guardrails: "I've protected that information..."  
✅ Offers secure alternative: "Connect via dashboard settings"  
✅ Maintains helpful tone (not scary)  

### Example Output
```
Crystal 2.0 Response:

"I've protected that information with our guardrails — I can't store or process raw credit card numbers.

**Here's what you should do instead:**

1. Go to XspensesAI dashboard → Settings → Payment Methods
2. Add your card there (encrypted, PCI-compliant)
3. Once connected, I can see transactions — not the card number itself

**If your card was compromised:**
- Contact your bank immediately (they'll reissue)
- Then add the new card via dashboard

**What I CAN help with:**
- Analyzing transactions from that card
- Spotting unusual activity patterns
- Recommending which expenses to tag/budget
- Finding savings opportunities

Need help with any of those instead?"
```

---

## 📊 TESTING CHECKLIST

### Test 1: Industry Detection
- [ ] User message contains industry hint ("bakery", "freelancer", "ecommerce", etc.)
- [ ] Crystal detects industry in response
- [ ] Crystal mentions industry-specific categories (food, labor, inventory, etc.)
- [ ] Recommendations are tailored (not generic)
- [ ] Next steps are actionable for that business type

### Test 2: Proactive Alert
- [ ] User asks general "what should I pay attention to" question
- [ ] Crystal analyzes MoM deltas from analytics context
- [ ] Crystal identifies spending spike (>20% change)
- [ ] Alert includes: dollar amount, percentage, category name
- [ ] Crystal suggests root cause & remediation
- [ ] User wasn't directly asked about that category

### Test 3: Strategic Guidance
- [ ] Crystal understands the decision question
- [ ] Response has: Insight → Recommendation → Strategy structure
- [ ] Tradeoffs are clearly evaluated
- [ ] Both short-term and long-term implications mentioned
- [ ] Specific action plan with quantified benefit
- [ ] Risk mitigation strategy included

### Test 4: Delegation
- [ ] User mentions documents/receipts/imports
- [ ] Crystal chooses to delegate (not try to handle directly)
- [ ] Crystal explains: WHO (Byte), WHY (OCR specialization), HOW (process steps)
- [ ] Offer 3 import options (upload, email, Gmail)
- [ ] Follow-up coordination is clear

### Test 5: PII Protection
- [ ] User shares credit card number
- [ ] Crystal refuses to process/store it
- [ ] Guardrails message is included
- [ ] Safe alternative offered
- [ ] Tone remains helpful, not alarming

---

## 🔧 DEBUGGING TIPS

### If Crystal doesn't detect industry:
- Check that user message clearly states industry
- Verify CRYSTAL_PERSONA_V2 is using Section 9 (Industry Awareness)
- Test with more explicit industry mention: "I'm a baker" vs "I run a business"

### If Crystal doesn't proactive alert:
- Verify MoM analysis block is building correctly
- Check `dbComputeMoMByCategory()` is returning items with >20% delta
- Ensure analytics context is appended to system prompt
- May need test data with actual MoM spikes

### If Crystal doesn't offer strategic guidance:
- Ensure CRYSTAL_PERSONA_V2 Section 13 (CFO-level behavior) is present
- Check that temperature is 0.3 (promotes structured reasoning)
- May need to explicitly ask for "tradeoff analysis" if too generic

### If Crystal tries to delegate incorrectly:
- Verify `delegateTool` definition in `chat_runtime/tools/delegate.ts`
- Ensure valid employees list matches (byte-docs, tag-categorizer, etc.)
- Check that tool calling only enabled for Prime (employeeKey === 'prime-boss')

### If PII masking doesn't work:
- Verify `OPENAI_MODERATION` is enabled
- Check guardrail_events table is receiving events
- Test with explicit patterns (4111-1111-1111-1111 format)

---

## 📈 SUCCESS METRICS

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| Industry Detection Rate | 95% | Manual testing across 5+ industries |
| Proactive Alert Accuracy | 90% | MoM spikes identified vs missed |
| Strategic Guidance Quality | 4.5/5 | User satisfaction survey |
| Delegation Routing Accuracy | 100% | Tool calls execute correctly |
| PII Protection | 100% | No raw card/SSN in responses |
| Response Quality (Checklist Pass) | 90% | 9/10 criteria met per response |

---

## 🎯 SIGN-OFF

| Component | Status | Notes |
|-----------|--------|-------|
| CRYSTAL_PERSONA_V2 | ✅ Deployed | 17 sections, ~800 lines |
| Test Scenario 1 | ✅ Ready | Industry detection |
| Test Scenario 2 | ✅ Ready | Proactive alerts |
| Test Scenario 3 | ✅ Ready | Strategic guidance |
| Test Scenario 4 | ✅ Ready | Delegation |
| Test Scenario 5 | ✅ Ready | PII protection |
| Documentation | ✅ Complete | This guide + CRYSTAL_2_0_COMPLETE.md |

---

**Status:** ✅ READY FOR PRODUCTION TESTING  
**Date:** October 18, 2025  
**Version:** 2.0 (Complete)





