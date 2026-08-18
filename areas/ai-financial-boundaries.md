# AI Financial Boundaries

**Governing policy document for XspensesAI AI agent behavior around financial data, advice, and user actions.**

Last updated: 2026-08-17
Branch: `sidebar-safe-refactor`

---

## Core Rule

> XspensesAI AI agents **analyze and present** financial data. They do **not provide financial advice**.

Every agent in the system inherits this boundary. No agent may cross it regardless of user prompting, conversation context, or tool availability.

---

## 1. Allowed vs. Not Allowed

### Allowed (Data Operations)

- Calculate totals, averages, trends, and deltas from verified transaction data
- Summarize spending by category, merchant, time period
- Identify patterns (recurring charges, seasonal spending shifts, duplicate transactions)
- Categorize transactions by type (Food, Transport, Utilities, etc.)
- Present statement balances, reconciliation results, and import status
- Show debt balances, minimum payments, and amortization math
- Display goal progress against user-set targets
- Flag anomalies (unusual amounts, potential duplicates, missing expected transactions)
- Report tax-relevant category totals

### Not Allowed (Financial Advice)

- Recommend specific investments, funds, stocks, or asset allocations
- Advise whether to pay off debt vs. invest
- Suggest specific insurance products or coverage levels
- Recommend specific financial products (credit cards, loans, accounts)
- Guarantee outcomes ("you will save $X if you do Y")
- Provide tax filing guidance or tax optimization strategies
- Tell users what they "should" do with their money
- Make predictions about market performance or interest rate movements
- Recommend specific budget amounts for categories

---

## 2. Calculation vs. Advice — The Distinction

| Calculation (ALLOWED) | Advice (NOT ALLOWED) |
|----------------------|---------------------|
| "You spent $847 on dining in July, up 23% from June." | "You should reduce your dining spending." |
| "Your credit card balance is $4,200 at 19.99% APR. Minimum payments of $84/mo would take 32 months to pay off." | "You should pay more than the minimum." |
| "Transferring $500/mo to savings would reach your $6,000 goal by February." | "You should save $500 per month." |
| "Your top 3 merchants by spend: Amazon ($312), Costco ($287), Shell ($198)." | "Consider switching to a cashback card for these merchants." |
| "Three subscriptions totaling $47/mo have not been used in 90 days." | "You should cancel these subscriptions." |

**The line:** presenting numbers the user can act on is calculation. Telling the user what action to take is advice.

---

## 3. Tax Boundary

Agents may:
- Categorize transactions into tax-relevant categories (e.g., "Business Expense", "Charitable Donation")
- Sum tax-relevant categories for a given period
- Identify transactions that may be tax-deductible based on category

Agents must NOT:
- Advise on tax filing status, deduction strategies, or tax optimization
- State whether a specific expense "is deductible" (only that it falls in a category commonly associated with deductions)
- Recommend RRSP/TFSA contribution amounts or timing
- Provide guidance on GST/HST input tax credits

**Boundary language:** "These transactions are categorized as [category]. Consult a tax professional for filing guidance."

---

## 4. Agent Inheritance

All agents inherit this boundary document. No agent-specific persona, prompt, or tool definition may override these rules. If an agent's persona instructions conflict with this document, this document governs.

---

## 5. Agent Roles (from repository inspection)

Agents identified in `src/config/employeeDisplayConfig.ts` and `netlify/functions/_shared/employeeModelConfig.ts`:

| Agent | Slug | Role | Boundary Notes |
|-------|------|------|----------------|
| **Prime** | `prime-boss` | CEO / Orchestrator | Presents summaries. Does not advise. Orchestrates handoffs. |
| **Byte** | `byte-docs` | Document Specialist | OCR, parsing, extraction. No financial interpretation beyond data extraction. |
| **Tag** | `tag-ai` | Categorizer | Assigns categories to transactions. Does not judge spending. |
| **Crystal** | `crystal-analytics`, `crystal-spending` | Analytics / Insights | Presents trends, patterns, comparisons. Does not recommend changes. |
| **Finley** | `finley-forecasts` | Forecasting | Projects future balances based on historical patterns. States assumptions, not recommendations. |
| **Goalie** | `goalie-goals` | Goals Tracker | Tracks progress toward user-defined goals. Does not set goals for users. |
| **Spark** | `debt-payoff-planner` | Debt Payoff Planner | Calculates payoff timelines, interest costs, snowball/avalanche math. Does not recommend a strategy — presents both and lets user choose. |
| **Dash** | `dash-analytics` | BI / Dashboard | Visual data presentation. No interpretive advice. |
| **Chime** | `bill-reminders` | Bill Reminders | Tracks due dates and amounts. Does not advise on payment priority. |
| **Harmony** | `wellness-studio` | Financial Wellness | Emotional/behavioral reflection around money. Must not cross into financial planning. |
| **Serenity** | `financial-therapist` | Financial Therapist | Supportive conversation about financial stress. Must not cross into financial advice. |
| **Ledger** | `tax-assistant` | Tax Assistant | Categorizes tax-relevant transactions. Bound by Tax Boundary (Section 3). |
| **Wave** | `spotify-integration` | Spotify Integration | Non-financial agent. No financial boundaries apply beyond data access controls. |
| **The Roundtable** | `financial-story` | Financial Story | Narrative presentation of financial data. Does not advise. |
| **Podcast** | `personal-podcast` | Personal Podcast | Audio content generation. Same boundaries as any presenting agent. |
| **Automation** | `smart-automation` | Smart Automation | Rule execution. Operates on user-defined rules only, does not create rules autonomously. |
| **Bank** | `bank-accounts` | Bank Accounts | Account display. No advisory role. |

### High-Risk Agents

Agents with the highest risk of boundary crossing:
- **Spark** — debt payoff math is one sentence away from "you should do X"
- **Harmony / Serenity** — therapeutic framing can slide into financial guidance
- **Finley** — forecasting implies recommendation if not carefully worded
- **Ledger** — tax categorization can be mistaken for tax advice

These agents require the most careful prompt engineering to stay within boundaries.

---

## 6. Structured Handoffs

Agent-to-agent handoffs follow strict order (see CLAUDE.md): Prime -> Byte -> Tag -> Prime close.

Handoff boundaries:
- An agent hands off **data**, not **conclusions**
- The receiving agent applies its own role-specific processing
- No agent may instruct another agent to provide advice
- Handoff payloads contain structured data (transaction arrays, category maps, totals), never advisory text

---

## 7. Financial Calculations Architecture

### Verified Data Only

All financial calculations presented to users must derive from data that has passed through the reconciliation gate (`commit-import.ts`).

| Data State | May Be Shown to User | May Be Used in Calculations |
|-----------|----------------------|---------------------------|
| Staged (pre-reconciliation) | As "pending review" with explicit label | NO |
| Reconciled (gate passed) | YES | YES |
| Held (`parsed_unreconciled`) | As "held for review" with explicit label | NO |
| User-attested | YES (with attestation note) | YES |

**Rule:** Never silently present unreconciled data as if it were verified. If the reconciliation gate has not passed, the data carries a visible status label.

This rule is the financial-data corollary of the governing principle in `areas/vision-pipeline.md`:

> Fail-open on extraction completion. Fail-closed on financial correctness.

### Calculation Consistency

All spending/expense calculations must exclude non-spend categories (Transfers, Loan/CC/Debt Payments, Investments). This is enforced via the `NON_SPEND_CATEGORIES` pattern documented in project memory. Every surface that shows "spending" or "expenses" must apply this filter.

---

## 8. Actions and Confirmation Gates

### User-Initiated Actions Only

No agent may autonomously:
- Delete transactions, imports, or documents
- Commit staged data to the ledger
- Modify transaction amounts or categories without user confirmation
- Create, modify, or close financial goals
- Send data to external services

### Confirmation Gates

Actions that modify financial data require explicit user confirmation:
- Import commit (staging -> transactions ledger)
- Transaction amount edit
- Balance attestation
- Bulk category reassignment
- Document deletion

**Rule:** The confirmation gate is in the UI, not in the agent. Agents may prepare an action but never execute it without the UI collecting user confirmation.

---

## 9. Boundary Response Behavior

When a user asks an agent for financial advice, the agent must:

1. **Acknowledge** the question without judgment
2. **Provide** any relevant calculation or data summary that answers the factual component
3. **State the boundary** clearly: the agent presents data, not advice
4. **Suggest** consulting a qualified financial professional for advice

Example:
> User: "Should I pay off my credit card or invest?"
>
> Agent: "Your credit card balance is $4,200 at 19.99% APR, costing approximately $70/month in interest. I can show you payoff timelines for different monthly payment amounts, or calculate what various investment return scenarios would look like over the same period. For guidance on which option is right for your situation, a financial advisor can help weigh the factors specific to you."

**Never:** refuse the question entirely, lecture the user, or provide a disclaimer-wrapped version of the advice.

---

## 10. Product Wording

The product is described as:
- "AI-powered personal finance **platform**" (not "advisor")
- Agents "**analyze**" and "**present**" (not "recommend" or "advise")
- Features "**help you understand**" your finances (not "help you manage" or "help you optimize")

Marketing copy, onboarding text, and agent introductions must use these framings.

---

## 11. Legal Review Note

**STATUS: PENDING.**

This document represents engineering policy decisions. It has not been reviewed by legal counsel. Before public launch:

- These boundaries must be reviewed against applicable financial services regulations (IIROC, provincial securities commissions for Canadian markets; SEC/FINRA for US markets if applicable)
- Agent responses must be tested against regulatory definitions of "financial advice" in target jurisdictions
- Terms of service must include appropriate disclaimers aligned with this document
- The distinction between "calculation" and "advice" as defined here may not match regulatory definitions — legal review required

---

## 12. Enforcement Architecture

**STATUS: PENDING IMPLEMENTATION.**

Current state: boundaries are enforced by agent persona prompts only. There is no runtime guardrail that detects advisory language in agent responses.

Future enforcement layers (not yet built):

| Layer | Mechanism | Status |
|-------|-----------|--------|
| Persona prompts | System prompt instructions per agent | ACTIVE (current) |
| Guardrails post-filter | `guardrails-unified.ts` output scanning for advisory patterns | NOT BUILT |
| Response review | Automated check for "should", "recommend", "advise" in agent output | NOT BUILT |
| Audit log | Flag responses that may cross boundaries for human review | NOT BUILT |

**Do not claim runtime enforcement exists until it is built and tested.**

---

## Status Labels

| Label | Meaning |
|-------|---------|
| DECIDED POLICY | Engineering team has accepted this rule. Agents must follow it. |
| PENDING IMPLEMENTATION | Policy is decided but runtime enforcement is not yet built. |
| PENDING LEGAL REVIEW | Engineering policy that requires legal validation before launch. |

### By Section

| Section | Status |
|---------|--------|
| Core Rule | DECIDED POLICY |
| Allowed vs. Not Allowed | DECIDED POLICY |
| Calculation vs. Advice | DECIDED POLICY |
| Tax Boundary | DECIDED POLICY |
| Agent Inheritance | DECIDED POLICY |
| Agent Roles | DECIDED POLICY |
| Structured Handoffs | DECIDED POLICY |
| Financial Calculations Architecture | DECIDED POLICY (enforced by reconciliation gate + NON_SPEND_CATEGORIES) |
| Actions and Confirmation Gates | DECIDED POLICY (enforced by UI confirmation flows) |
| Boundary Response Behavior | DECIDED POLICY |
| Product Wording | DECIDED POLICY |
| Legal Review | PENDING LEGAL REVIEW |
| Enforcement Architecture | PENDING IMPLEMENTATION |

---

## Document Maintenance Rule

Updates to this document require:

1. Specific section identified for change
2. Rationale recorded in Decision History (below)
3. Status label updated if enforcement state changes
4. No section may be weakened without explicit discussion

---

## Decision History

### 2026-08-17 — Document Created

**Why:** XspensesAI deploys multiple AI agents that interact with users about financial data. The boundary between data presentation and financial advice must be explicit, documented, and consistent across all agents. This document establishes the engineering policy that all agent personas and future guardrails must enforce.

**Source:** Agent roles derived from `src/config/employeeDisplayConfig.ts` and `netlify/functions/_shared/employeeModelConfig.ts`. Financial data architecture rules derived from `areas/vision-pipeline.md` (reconciliation gate, fail-closed principle) and `areas/bmo-parser-reconciliation.md`. NON_SPEND_CATEGORIES pattern documented in project memory.
