# 🤖 AI Employees - Complete Inventory

**Audit Date**: 2025-10-09  
**Total Employees**: 20+ defined (7 active, 13+ placeholders)  
**Prompt Sources**: 3 locations (config files, UniversalAIController methods, database)

---

## 📊 Active Employees (7)

### 1. Prime - CEO/Orchestrator

| Attribute | Value |
|-----------|-------|
| **Slug** | `prime` |
| **Title** | Prime - CEO & Orchestrator |
| **Emoji** | 👑 |
| **Department** | Executive |
| **Status** | ✅ ACTIVE |
| **Capabilities** | routing, orchestration, strategy, team-management |
| **Tools Allowed** | *(none currently - NEEDS: delegate)* |
| **Prompt Source** | `src/config/ai-employees.js:13-19` |
| **Alternate Definitions** | `src/systems/AIEmployeeSystem.ts:42-69` |

**System Prompt** (first 15 lines):
```
You are Prime, the strategic mastermind and CEO of the XSpensesAI ecosystem.
You're the first point of contact and the orchestrator of 30 specialized AI employees.
You speak with executive confidence, strategic vision, and always maintain a bird's-eye
view of the user's financial situation. You're sophisticated yet approachable, like a
Fortune 500 CEO who remembers everyone's name.

Tone: Executive, strategic, confident, warm but professional
Uses phrases like: "Let me connect you with the right expert," 
"Based on our team's analysis," "I'll coordinate this across departments"
Occasionally uses 👑 emoji when making executive decisions
Speaks in clear, strategic terms without financial jargon unless necessary
Always positions yourself as the leader who knows exactly which team member can help
```

**Routing Logic**: `src/systems/AIEmployeeSystem.ts:247-360` (keyword-based)

**Issues Found**:
- ⚠️ Prime has NO delegation tool in `tools_allowed`
- ⚠️ Duplicate prompts in 2 files (identical content)
- ⚠️ No database entry in `employee_profiles` table

---

### 2. Byte - Document Processing Specialist

| Attribute | Value |
|-----------|-------|
| **Slug** | `byte` / `byte-doc` / `smart-import` |
| **Title** | Byte - Document Processing Specialist |
| **Emoji** | 🤖 / 📄 |
| **Department** | Data Processing |
| **Status** | ✅ ACTIVE |
| **Capabilities** | ocr, document-parsing, extraction, file-processing |
| **Tools Allowed** | ocr, sheet_export *(from seed data)* |
| **Prompt Source** | `src/config/ai-employees.js:33-58` |
| **Alternate Definitions** | `src/services/UniversalAIController.ts:72-81` (buildBytePrompt method) |
| **UI Components** | `src/components/chat/ByteDocumentChat.tsx`, `ByteChatCentralized.tsx` |

**System Prompt** (first 12 lines):
```
You are Byte, the document processing specialist who extracts data from any document
format. You're the first step in the financial data journey, converting unstructured
data into organized information. You're technical, precise, and proud of your 95%+
accuracy rate.

Tone: Technical, helpful, precise, enthusiastic about processing
Uses phrases like: "I'll extract all the data," "Processing complete," 
"Let me analyze this document"
Uses 🤖📄🔍 emojis when working
Always explains what you're doing and why
Celebrates successful extractions
```

**Issues Found**:
- ⚠️ THREE different slugs used: `byte`, `byte-doc`, `smart-import`
- ⚠️ Prompt built dynamically in `buildBytePrompt()` method (not in config)
- ✅ Has seed entry in `employee_profiles` as `byte-doc`

---

### 3. Tag - Categorization Expert

| Attribute | Value |
|-----------|-------|
| **Slug** | `tag` / `tag-ai` / `categorization` |
| **Title** | Tag - Categorization Expert |
| **Emoji** | 🏷️ |
| **Department** | Organization |
| **Status** | ✅ ACTIVE |
| **Capabilities** | categorization, merchant-intelligence, organization, learning |
| **Tools Allowed** | bank_match *(from seed data)* |
| **Prompt Source** | `src/config/ai-employees.js:87-112` |
| **Alternate Definitions** | `src/services/UniversalAIController.ts:124-132` (buildTagPrompt) |
| **Page** | `src/pages/dashboard/AICategorizationPage.tsx` |

**System Prompt** (first 13 lines):
```
You are Tag, the categorization perfectionist who brings order to transaction chaos.
You learn from every correction and pride yourself on becoming smarter with each
interaction. You're like a librarian for financial data - everything has its perfect
place, and you'll find it.

Tone: Organized, eager to learn, helpful, detail-oriented
Uses phrases like: "Got it, I'll remember that!", "Filing this under...", 
"I've learned that you prefer...", "Categorized and organized!"
Uses 🏷️✅📁 emojis to confirm categorization
Shows enthusiasm when learning new patterns
Always confirms when uncertain
```

**Issues Found**:
- ⚠️ THREE slugs: `tag`, `tag-ai`, `categorization`
- ✅ Has seed entry as `tag-ai`

---

### 4. Crystal - Spending Predictions AI

| Attribute | Value |
|-----------|-------|
| **Slug** | `crystal` / `spending-predictions` |
| **Title** | Crystal - Predictive Analytics Genius |
| **Emoji** | 💎 / 🔮 |
| **Department** | Analytics |
| **Status** | ✅ ACTIVE |
| **Capabilities** | spending-analysis, predictions, trends, insights |
| **Tools Allowed** | *(none defined)* |
| **Prompt Source** | `src/config/ai-employees.js:60-85` |
| **Alternate Definitions** | `src/services/UniversalAIController.ts:114-122` (buildCrystalPrompt) |

**System Prompt** (first 13 lines):
```
You are Crystal, the predictive analytics genius who sees patterns others miss.
You analyze spending trends, predict future expenses, and provide insights that feel
almost magical. You maintain 94% prediction accuracy and speak with quiet confidence
about what's coming.

Tone: Insightful, confident, slightly mysterious, data-driven
Uses phrases like: "I see a pattern forming", "Based on your history", 
"The data suggests", "There's something interesting here"
Uses 🔮📊💎 emojis when revealing predictions
Balances technical analysis with intuitive explanations
Always backs predictions with data
```

---

### 5. Ledger - Tax & Accounting Expert

| Attribute | Value |
|-----------|-------|
| **Slug** | `ledger` / `tax-optimization` |
| **Title** | Ledger - Tax Assistant |
| **Emoji** | 📊 / 💰 |
| **Department** | Compliance |
| **Status** | ✅ ACTIVE |
| **Capabilities** | tax-optimization, accounting, compliance, deductions |
| **Tools Allowed** | *(none defined)* |
| **Prompt Source** | `src/config/ai-employees.js:114-139` |
| **Alternate Definitions** | `src/services/UniversalAIController.ts:214-222` |

**System Prompt** (first 14 lines):
```
You are Ledger, the tax and accounting authority with deep knowledge of both CRA and
IRS regulations. You make tax season painless and help users save an average of $3,400
annually. You're like having a CPA, tax attorney, and bookkeeper rolled into one, but
friendlier and available 24/7.

Tone: Authoritative, reassuring, precise, helpful
Uses phrases like: "For tax purposes...", "You can deduct this", 
"According to regulation...", "This could save you..."
Uses 📊💰📋 emojis when highlighting savings
Simplifies complex tax concepts
Always mentions potential savings or risks
```

---

### 6. Goalie - AI Goal Concierge

| Attribute | Value |
|-----------|-------|
| **Slug** | `goalie` / `goal-concierge` |
| **Title** | Goalie - Achievement Coach |
| **Emoji** | 🥅 / 🎯 |
| **Department** | Planning |
| **Status** | ✅ ACTIVE |
| **Capabilities** | goal-setting, tracking, motivation, achievement |
| **Tools Allowed** | *(none defined)* |
| **Prompt Source** | `src/config/ai-employees.js:141-166` |
| **Alternate Definitions** | `src/services/UniversalAIController.ts:104-112` |

**System Prompt** (first 12 lines):
```
You are Goalie, the achievement coach who turns financial dreams into reality with
a 94% success rate. You're part sports coach, part accountability partner, and part
cheerleader. You believe every financial goal is achievable with the right game plan.

Tone: Motivational, strategic, supportive, action-oriented
Uses phrases like: "You're 73% there!", "Game plan adjusted", "Victory is close!", 
"Let's score this goal!"
Uses 🥅🎯🏆 emojis for milestones
Sports metaphors without being excessive
Celebrates progress enthusiastically
```

---

### 7. Blitz - Debt Payoff Planner

| Attribute | Value |
|-----------|-------|
| **Slug** | `blitz` / `debt-elimination` |
| **Title** | Blitz - Debt Demolition Expert |
| **Emoji** | ⚡ / 💪 |
| **Department** | Debt Management |
| **Status** | ✅ ACTIVE |
| **Capabilities** | debt-payoff, strategy, motivation, optimization |
| **Tools Allowed** | *(none defined)* |
| **Prompt Source** | `src/config/ai-employees.js:168-193` |
| **Alternate Definitions** | `src/services/UniversalAIController.ts:134-142` |

**System Prompt** (first 12 lines):
```
You are Blitz, the debt demolition expert who helps users become debt-free 3x faster.
You're intense, focused, and treat debt like the enemy it is. You create sophisticated
payoff strategies and never let users lose momentum.

Tone: Intense, motivating, strategic, determined
Uses phrases like: "Crush that debt!", "Attack mode activated", 
"$[X] eliminated!", "No mercy for interest!"
Uses ⚡💪🔥 emojis for motivation
Military/sports metaphors for debt battles
Celebrates every payment like a victory
```

---

## 🚧 Placeholder Employees (13+)

### Defined but Inactive

| Slug | Name | Department | Status | Prompt |
|------|------|------------|--------|--------|
| `liberty` | Liberty | Strategic Planning | ❌ INACTIVE | null |
| `serenity` | Serenity | Wellness | ❌ INACTIVE | null |
| `spark` | Spark | Podcast/Motivation | ❌ INACTIVE | Partially defined |
| `wisdom` | Wisdom | Podcast/Analysis | ❌ INACTIVE | Partially defined |
| `fortune` | Fortune | Podcast/Reality | ❌ INACTIVE | Partially defined |
| `nova` | Nova | Podcast/Creative | ❌ INACTIVE | Partially defined |
| `harmony` | Harmony | Podcast/Balance | ❌ INACTIVE | Partially defined |
| `roastMaster` | Roast Master | Podcast/Roast | ❌ INACTIVE | null |
| `savageSally` | Savage Sally | Podcast/Roast | ❌ INACTIVE | Partially defined |
| `truthBomber` | Truth Bomber | Podcast/Roast | ❌ INACTIVE | null |
| `realityChecker` | Reality Checker | Podcast/Roast | ❌ INACTIVE | null |
| `savageSam` | Savage Sam | Podcast/Roast | ❌ INACTIVE | null |
| `roastQueen` | Roast Queen | Podcast/Roast | ❌ INACTIVE | null |
| `djZen` | DJ Zen | Entertainment | ❌ INACTIVE | Partially defined |
| `automa` | Automa | Automation | ❌ INACTIVE | Partially defined |
| `dash` | Dash | Analytics | ❌ INACTIVE | Partially defined |
| `intelia` | Intelia | Business Intelligence | ❌ INACTIVE | Partially defined |
| `wave` | Wave | Music Integration | ❌ INACTIVE | null |
| `custodian` | Custodian | Security | ❌ INACTIVE | null |

---

## 🔍 Prompt Source Analysis

### Source 1: `src/config/ai-employees.js` (Primary)
**Employees**: prime, byte, crystal, tag, ledger, goalie, blitz, +13 placeholders  
**Format**: Inline strings in exported object  
**Status**: ✅ Most complete

### Source 2: `src/services/UniversalAIController.ts` (Dynamic)
**Employees**: 15+ with `build{Name}Prompt()` methods  
**Format**: Programmatically generated  
**Status**: ⚠️ Inconsistent with config file

### Source 3: Database `employee_profiles` table
**Employees**: 3 seeded (prime-boss, byte-doc, tag-ai)  
**Format**: SQL rows  
**Status**: ⚠️ Incomplete, different naming

---

## 🚨 Critical Issues

### Issue 1: Slug Inconsistency

**Byte has 3 different slugs**:
- `byte` (ai-employees.js)
- `byte-doc` (database, centralized runtime)
- `smart-import` (UniversalAIController)

**Impact**: Routing fails, sessions don't match

**Recommendation**: Standardize on `byte-doc`

### Issue 2: Duplicate Prompts

**Prime prompt appears in**:
- `src/config/ai-employees.js:13-19`
- `src/systems/AIEmployeeSystem.ts:50-56`
- Both are identical but maintained separately

**Impact**: Sync issues, hard to update

**Recommendation**: Single source of truth (database or config)

### Issue 3: Prompt Generation Methods

**UniversalAIController has 15+ `build{Name}Prompt()` methods**:
- `buildBytePrompt()`
- `buildCrystalPrompt()`
- `buildTagPrompt()`
- etc.

**These override the config file prompts!**

**Impact**: Confusion about which prompt is actually used

**Recommendation**: Deprecate dynamic prompts, use database

### Issue 4: No Tools Defined for Active Employees

**Only database seed has tools**:
- byte-doc: `['ocr', 'sheet_export']`
- tag-ai: `['bank_match']`
- prime-boss: `['sheet_export', 'bank_match']`

**All config file employees**: `tools_allowed` not defined

**Impact**: Tool calling broken for non-seeded employees

**Recommendation**: Add tools_allowed to all employees

---

## 📋 Recommended Canonical Employee List

Based on audit, these should be the official active employees:

| Slug (Canonical) | Name | Current Status | Action |
|------------------|------|----------------|--------|
| `prime-boss` | Prime | ✅ Active | Needs `delegate` tool |
| `byte-doc` | Byte | ✅ Active | Has tools |
| `tag-ai` | Tag | ✅ Active | Has tools |
| `crystal-analytics` | Crystal | ⚠️ Config only | Add to DB |
| `ledger-tax` | Ledger | ⚠️ Config only | Add to DB |
| `goalie-goals` | Goalie | ⚠️ Config only | Add to DB |
| `blitz-debt` | Blitz | ⚠️ Config only | Add to DB |

---

## 📝 Database Sync Requirements

### Current Database (`employee_profiles`)

```sql
SELECT slug, title, is_active FROM employee_profiles;
```

**Expected (from seed)**:
```
slug        | title                                  | is_active
------------+----------------------------------------+-----------
prime-boss  | Prime - CEO & Orchestrator            | t
byte-doc    | Byte - Document Processing Specialist | t
tag-ai      | Tag - Categorization Expert           | t
```

### Missing from Database

The following active employees from config need DB entries:
- `crystal-analytics` (Crystal)
- `ledger-tax` (Ledger)
- `goalie-goals` (Goalie)  
- `blitz-debt` (Blitz)

### SQL to Add Missing Employees

```sql
-- Add Crystal
INSERT INTO employee_profiles (slug, title, emoji, system_prompt, capabilities, tools_allowed, model, temperature)
VALUES (
  'crystal-analytics',
  'Crystal - Predictive Analytics',
  '💎',
  'You are Crystal, the predictive analytics genius who sees patterns others miss...',
  ARRAY['spending-analysis', 'predictions', 'trends', 'insights'],
  ARRAY[]::text[],  -- Add tools as needed
  'gpt-4o-mini',
  0.5
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  system_prompt = EXCLUDED.system_prompt,
  updated_at = now();

-- Repeat for ledger-tax, goalie-goals, blitz-debt
```

---

## 🎯 Tool Registry Status

### Seeded Tools (from `000_centralized_chat_runtime.sql`)

```sql
SELECT name, purpose, auth_scope FROM tools_registry;
```

**Expected**:
```
name          | purpose                                  | auth_scope
--------------+------------------------------------------+------------
ocr           | Extract text from images and PDFs        | user
sheet_export  | Export data to Google Sheets             | user
bank_match    | Match transactions to bank statements    | user
```

### Missing Tools (Needed for Multi-Agent)

- `delegate` - Allow Prime to call other employees
- `search_memory` - Search user's memory/embeddings
- `extract_facts` - Auto-extract memorable facts
- `summarize` - Summarize conversations

---

## 📊 Complete Employee Definitions Table

| # | Slug | Name | Dept | Status | Config File | DB Entry | Prompt Method | Tools | Issues |
|---|------|------|------|--------|-------------|----------|---------------|-------|--------|
| 1 | prime-boss | Prime | Exec | ✅ | ✅ | ✅ | - | None → Need delegate | 2 sources |
| 2 | byte-doc | Byte | Data | ✅ | ✅ | ✅ | buildBytePrompt() | ocr, sheet_export | 3 slugs |
| 3 | tag-ai | Tag | Org | ✅ | ✅ | ✅ | buildTagPrompt() | bank_match | 3 slugs |
| 4 | crystal | Crystal | Analytics | ✅ | ✅ | ❌ | buildCrystalPrompt() | None | No DB |
| 5 | ledger | Ledger | Tax | ✅ | ✅ | ❌ | buildLedgerPrompt() | None | No DB |
| 6 | goalie | Goalie | Goals | ✅ | ✅ | ❌ | buildGoaliePrompt() | None | No DB |
| 7 | blitz | Blitz | Debt | ✅ | ✅ | ❌ | buildBlitzPrompt() | None | No DB |
| 8-20 | Various | Podcast/Roast | Various | ❌ | ⚠️ | ❌ | null | None | Placeholders |

**Legend**:
- ✅ Defined/Active
- ⚠️ Partially defined
- ❌ Missing/Inactive

---

## 🔧 Action Items

### Immediate (Database Sync)

1. **Add missing employees to database**
   - Run SQL INSERTs for crystal, ledger, goalie, blitz

2. **Standardize slugs**
   - Update all references to use canonical slugs
   - byte → byte-doc
   - tag → tag-ai
   - Add aliases if needed

3. **Add delegation tool for Prime**
   ```sql
   INSERT INTO tools_registry (name, purpose, handler_path, auth_scope)
   VALUES (
     'delegate',
     'Delegate task to another AI employee',
     'chat_runtime/tools/delegate.ts',
     'service'
   );
   
   UPDATE employee_profiles
   SET tools_allowed = array_append(tools_allowed, 'delegate')
   WHERE slug = 'prime-boss';
   ```

### Short-term (Consolidation)

4. **Choose single prompt source**
   - Option A: Database as source of truth (recommended)
   - Option B: Config file synced to database on startup
   - Deprecate `build{Name}Prompt()` methods

5. **Add tools to all employees**
   - Define tools_allowed based on capabilities
   - Update database and config

6. **Create employee directory endpoint**
   - `GET /employees` returns active employees with capabilities

---

## 📚 Files Inventory

### Employee Definition Files

| File | Employees | Format | Priority |
|------|-----------|--------|----------|
| `src/config/ai-employees.js` | 20+ | Static config | ⭐ PRIMARY |
| `src/systems/AIEmployeeSystem.ts` | 7 | TypeScript objects | Secondary |
| `src/services/UniversalAIController.ts` | 15+ | Dynamic methods | ⚠️ Conflicting |
| Database `employee_profiles` | 3 | SQL rows | 🎯 TARGET |

### Routing & Orchestration

| File | Purpose | Status |
|------|---------|--------|
| `src/systems/AIEmployeeSystem.ts` | Keyword-based router | Active |
| `src/lib/boss/openaiClient.ts` | Boss handoff logic | Active |
| `src/lib/agents/registry.ts` | Agent registry | Partial |

---

## ✅ Summary

- **7 active employees** with complete prompts
- **13+ placeholder employees** for future
- **3 prompt sources** (config, controller, database)
- **Major issue**: Slug inconsistency and duplication
- **Recommendation**: Migrate to database as single source of truth
- **Ready for**: Multi-agent collaboration with Prime as dispatcher

---

**Next**: See `AGENT_NETWORK.md` for proposed multi-agent architecture

