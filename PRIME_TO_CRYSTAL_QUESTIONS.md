# 🎯 PRIME TO CRYSTAL AUTO-HANDOFF GUIDE

**Purpose:** Learn what questions trigger automatic routing from Prime to Crystal  
**Status:** ✅ Production Ready  
**Auto-Handoff Trigger:** Finance keywords + Prime as employee + No explicit employee specified  

---

## 🔄 HOW AUTO-HANDOFF WORKS

When you ask Prime a question with **finance keywords**, it automatically transfers to Crystal:

```
User → Prime (employeeSlug="prime-boss")
  ↓
Prime detects: "spending", "trend", "budget", etc.
  ↓
Auto-handoff to Crystal (employeeSlug="crystal-analytics")
  ↓
Crystal responds with financial analysis
```

---

## 🎯 TRIGGER KEYWORDS

These words automatically trigger handoff from Prime to Crystal:

### Category 1: Spending & Expenses 💰
- **spend** / **spending**
- **expense** / **expenses**
- **cost**
- **money**
- **budget** / **budgeting**
- **transaction** / **transactions**

### Category 2: Analysis & Trends 📊
- **trend** / **trends**
- **analysis** / **analyze**
- **report**
- **breakdown**
- **summary**

### Category 3: Financial Metrics 📈
- **forecast** / **forecasting**
- **projection** / **projections**
- **cashflow** / **cash flow**
- **roi** / **ROI**
- **profit** / **profitability**
- **revenue**

### Category 4: Categories & Organization 🏷️
- **category** / **categories**
- **deduction** / **deductions**
- **tax** / **taxes**
- **gst** / **sales tax**
- **merchant**

---

## ✅ QUESTIONS THAT TRIGGER CRYSTAL

### Example 1: Spending Analysis
```
"Show me my spending trends"
→ ✅ TRIGGERS HANDOFF (keywords: "spending", "trends")
→ Crystal responds with spending analysis
```

### Example 2: Budget Questions
```
"What's my budget status?"
→ ✅ TRIGGERS HANDOFF (keyword: "budget")
→ Crystal checks budget allocation
```

### Example 3: Top Categories
```
"What are my top spending categories?"
→ ✅ TRIGGERS HANDOFF (keywords: "spending", "categories")
→ Crystal shows top 3 categories by expense
```

### Example 4: Month-over-Month
```
"How much did I spend this month vs last month?"
→ ✅ TRIGGERS HANDOFF (keyword: "spend")
→ Crystal shows MoM comparison
```

### Example 5: Expense Breakdown
```
"Break down my expenses by category"
→ ✅ TRIGGERS HANDOFF (keywords: "expenses", "category")
→ Crystal provides detailed breakdown
```

### Example 6: Tax Deductions
```
"What are my tax-deductible expenses?"
→ ✅ TRIGGERS HANDOFF (keywords: "tax", "expenses")
→ Crystal identifies deductible items
```

### Example 7: Cash Flow
```
"Analyze my cash flow"
→ ✅ TRIGGERS HANDOFF (keywords: "analyze", "cash flow")
→ Crystal provides cash flow analysis
```

### Example 8: Merchant Analysis
```
"Which merchant has my highest spending?"
→ ✅ TRIGGERS HANDOFF (keyword: "spending", "merchant")
→ Crystal shows top merchants
```

---

## ❌ QUESTIONS THAT DO NOT TRIGGER HANDOFF

### Example 1: General Greeting
```
"Hi Prime, how are you?"
→ ❌ NO HANDOFF (no finance keywords)
→ Prime responds directly
```

### Example 2: Non-Financial Request
```
"Tell me a joke"
→ ❌ NO HANDOFF (no finance keywords)
→ Prime responds with humor
```

### Example 3: General Strategy
```
"What's your role in the company?"
→ ❌ NO HANDOFF (no finance keywords)
→ Prime explains himself
```

### Example 4: Personal Information
```
"Remember that I own a bakery"
→ ❌ NO HANDOFF (no finance keywords)
→ Prime saves to memory
```

---

## 🎯 EXACT REGEX PATTERN

The auto-handoff uses this regex pattern:

```javascript
/\b(spend|spending|expense|expenses|trend|trends|analysis|analyze|budget|budgeting|forecast|projection|cash\s*flow|cashflow|roi|profit|profitability|category|categories|deduction|tax|gst|sales\s*tax|transactions?)\b/
```

In plain English:
- Any question containing these words (case-insensitive)
- Word boundaries matter (e.g., "spending" but not "expensed" in a sentence)
- Spaces in phrases handled (e.g., "cash flow" OR "cashflow")

---

## 🧪 TEST QUESTIONS

### Try These to See Auto-Handoff

```
1. "Show my spending trends"
   Expected: Crystal analyzes spending

2. "What's my budget status?"
   Expected: Crystal checks budgets

3. "Top categories this month"
   Expected: Crystal shows top categories

4. "Analyze my expenses"
   Expected: Crystal provides analysis

5. "Cash flow projection"
   Expected: Crystal forecasts cash flow

6. "Tax deductible items"
   Expected: Crystal identifies deductions

7. "Month-over-month spending"
   Expected: Crystal shows MoM comparison

8. "Highest spending merchant"
   Expected: Crystal identifies top merchant
```

---

## 🔐 CONDITIONS FOR AUTO-HANDOFF

**All of these must be TRUE:**

1. ✅ User is talking to Prime (`employeeSlug="prime-boss"`)
2. ✅ User did NOT specify a different employee
3. ✅ User's message contains finance keywords (regex match)
4. ✅ Finance keywords are clearly about analysis/data (not just mentioning the word)

**If any condition is FALSE:**
- ❌ No auto-handoff occurs
- Prime answers directly

---

## 💡 QUICK REFERENCE

### Finance Keywords by Category

| Category | Keywords |
|----------|----------|
| Spending | spend, spending, expense, cost, money |
| Budgets | budget, budgeting, limit, allocation |
| Analysis | analyze, analysis, breakdown, summary |
| Trends | trend, trends, pattern, change |
| Forecasting | forecast, projection, predict |
| Cash | cash flow, cashflow, liquidity |
| Profit | roi, profit, revenue, earnings |
| Tax | tax, deduction, gst, withholding |
| Merchant | merchant, vendor, transaction |
| Category | category, categories, classification |

---

## 🎯 CONVERSATION FLOW EXAMPLES

### Example A: Starting with Prime, Triggering Handoff

```
User: "Hi Prime"
Prime: "Hi! I'm Prime, your AI CEO..."

User: "Show my spending trends"
Prime: [Detects "spending" + "trends"]
Prime: [Auto-handoff triggered]
Crystal: "Looking at your last 90 days...
          Top categories: 1. Groceries $1,250, 
          2. Utilities $450, 3. Dining $320..."

User: "Can you break this down by month?"
Crystal: [Still Crystal, history preserved]
Crystal: "Month-over-month breakdown...
          September: $3,200, October: $3,500..."
```

### Example B: Starting with Prime, Staying with Prime

```
User: "Hi Prime, remember my business details"
Prime: "I've noted your business information."

User: "What should my strategy be?"
Prime: [No finance keywords]
Prime: [No auto-handoff]
Prime: "Based on your business type, 
        I'd recommend focusing on..."

User: "Show my spending trends"
Prime: [Now "spending" + "trends" detected]
Prime: [Auto-handoff triggered]
Crystal: "Your spending analysis:
          [detailed financial breakdown]"
```

---

## 🚀 HOW TO USE THIS

### For Testing:
1. Ask Prime a non-financial question → Prime responds
2. Ask Prime a finance question → Crystal responds
3. Verify automatic routing works

### For Users:
1. Start conversations with Prime
2. Prime routes you to specialists automatically
3. No need to manually switch employees

### For Development:
1. Finance keywords in `AUTO_HANDOFF_KEYWORDS` regex
2. Only triggers if `employeeSlug` is "prime-boss"
3. Only if no explicit employee specified
4. User sees seamless transition

---

## 📝 ADDING MORE KEYWORDS

To add new trigger keywords, edit in `chat-v3-production.ts`:

```typescript
const financeHit = /\b(
  spend|spending|expense|expenses|trend|trends|
  analysis|analyze|budget|budgeting|forecast|
  projection|cash\s*flow|cashflow|roi|profit|
  profitability|category|categories|deduction|
  tax|gst|sales\s*tax|transactions?|
  NEW_KEYWORD_HERE  // ← Add here
)\b/.test(text);
```

---

## ✨ SPECIAL CASES

### Case 1: Mentioning Finance Without Analysis
```
"I spent $50 on groceries"
→ ❌ NO HANDOFF (just stating a fact, not asking for analysis)
→ Prime saves to memory
```

### Case 2: Asking About Multiple Topics
```
"What's my spending trend and should I hire more staff?"
→ ✅ HANDOFF (contains "spending trend")
→ Crystal answers spending part, may ask about staffing
```

### Case 3: Explicit Employee Request
```
"Ask Crystal: Show my spending trends"
→ ❌ NO AUTO-HANDOFF (explicitly asking Crystal)
→ Goes directly to Crystal
```

---

## 🎯 SUMMARY

**Auto-handoff from Prime to Crystal happens when:**

1. You ask Prime a question
2. Question contains finance keywords
3. Keywords suggest data/analysis needed
4. You didn't explicitly request another employee

**Result:** Seamless transition to Crystal for financial analysis

---

## 📞 TEST NOW

Try these questions with Prime on localhost:

```powershell
# Test 1: Non-finance (stays with Prime)
"Hi Prime, who are you?"

# Test 2: Finance (triggers Crystal)
"Show me my spending trends"

# Test 3: Mixed (triggers Crystal)
"What's my budget and how can I optimize it?"
```

---

**Version:** 1.0  
**Status:** ✅ Production Ready  
**Keywords:** 20+ finance triggers  

🎯 **Start asking questions and watch the magic happen!**





