# Employee specialization, permissions and entitlements (authoritative)

Owner directive, 2026-11-24. **Mandatory product requirement.**
Principle: *Shared infrastructure. Specialized employees. Controlled collaboration. Protected premium capabilities. Sustainable recurring revenue.*

This file records the requirements, the reconciliation with today's code, the known bypasses and the enforcement plan. Pricing and the entitlement matrix are **not** decided. Nothing here activates a paid restriction.

## 1. Responsibilities (owner-defined)
| Employee | Owns | Must not independently |
|---|---|---|
| Prime | Financial summaries and insights, workspace understanding, coordinating authorized specialist consultations, explaining specialist findings | Perform another employee's restricted task, or bypass an entitlement |
| Byte | Document processing, OCR and extraction, statement recognition, transaction extraction and normalization | Categorize, create goals, forecast |
| Tag | Categorization, merchant recognition, amount-aware categorization, customer-approved merchant rules, corrections, persistent learning, review assistance | Forecast, plan goals, extract statements |
| Crystal | Trends, spending patterns, forecasting, predictive insights, scenario analysis | Categorize, import statements, create Goalie goals |
| Goalie | Savings and debt goals, goal planning, progress tracking, goal scenarios | Categorize, extract statements, perform restricted Crystal forecasting |
| Finley | Financial education and coaching | Bypass other employees' operational capabilities |
| Custodian | Authorized record organization, data integrity, approved maintenance | Unrestricted document access or unrelated specialist tasks |

**Shared infrastructure is not shared capability:** attachments, history, persistent context, document references, chat UI, upload controls and storage are shared. Using them never authorizes another employee's job. Byte extracts; Tag categorizes. **No chat attachment ever imports transactions automatically.**

**Prime as coordinator:**
1. identify the employee;
2. check entitlement;
3. check employee and document permissions;
4. consult the authorized specialist;
5. present verified findings;
6. get explicit approval before any change.

Read-only consultation is not automatically free.

## 2. Reconciliation with the current code (discrepancies; reported, not silently changed)
| Area | Today | Directive | Discrepancy |
|---|---|---|---|
| Finley | Tools: loan, savings and debt-payoff **forecasts** (`finley_*`, `forecast_*` ids in `tools_allowed`) | Education and coaching | Forecasting belongs to Crystal; goal scenarios to Goalie |
| Goalie | `tools_allowed` includes `crystal_summarize_*` and `finley_*_forecast` | Goals | Crosses into Crystal / Finley |
| Liberty, Ledger, Chime, Blitz | Exist (stored prompts and tools); Liberty has `goalie_create_goal` | Not in the directive's roster | The roster needs an owner decision; Liberty writing goals crosses Goalie |
| Custodian | App navigation, settings and onboarding guide | Data integrity and record organization | Responsibility differs |
| Prime runtime tools | Adds `finley_*` / `analytics_forecast` forecasts, `tag_status`, `statement_coverage`, `tag_document_findings` (when enabled) | Coordinator | Forecasts run inside Prime, not as a Crystal consultation. `tag_status` / `statement_coverage` are read-only consultations through the enforcement point |
| Byte | Has `transaction_category_totals` | Documents | Minor overlap with Prime summaries |
| Stored tool ids | `delegate`, `sheet_export`, `bank_match`, `forecast_*`, `ocr`, `get_recent_imports`… do not exist | — | Dead entries (PB-05 finding) |

## 3. Current enforcement and known bypasses
**Enforced today:**
- verified JWT identity on chat and specialist endpoints (S0 batches);
- server-owned prompts (client prompts ignored, COLLAB-1);
- code-owned capability boundaries in prompts (PB-05);
- confirmation for mutating tools;
- deny-by-default **document** access per employee (Attachments E1);
- verified-identity rate limits (E8);
- **one capability hook** (`src/shared/capabilities.ts → authorizeCapability`) in `executeTool` and in Prime's server-side consultations (L-A, L-B). It allows everything today and denies by default once a resolver is installed.

**Bypasses that remain (to close as the entitlement matrix lands):**
1. **Employee access:** the client chooses `employeeSlug`; any authenticated user can talk to any employee. A future chat-entry check is needed: `authorizeEmployee(user, employee)`.
2. **Handoffs:** `request_employee_handoff` switches employees with no entitlement check.
3. **Prime-run forecasts:** Prime executes Crystal/Goalie forecasting tools directly instead of as a gated consultation.
4. **Direct specialist endpoints:** `tag-explain`, `tag-smart-review`, `tag-merchant-insights`, `generate-tax-report`, the forecast and goal functions and others are callable by any authenticated user. Each needs the same `authorizeCapability` call.
5. **Background automation:** daily and post-import Tag categorization and sweeps run with no entitlement.
6. **Unclassified tools:** only Prime's tools carry capability metadata. Every other registry tool resolves to `unclassified.*`, which will be **denied** when enforcement starts. Classify them first.
7. **Prompt-only boundaries:** PB-05 boundaries are prompts. The server hook is now the enforcement point, but it isn't populated yet.

## 4. Required enforcement points (future; one hook, many call sites)
`authorizeCapability({ userId, actingEmployee, toolId|capability, via })` at:
- chat entry (employee access);
- `executeTool` (**done**);
- Prime consultations (**done**: L-A, L-B);
- `request_employee_handoff`;
- every specialist REST endpoint;
- document access (E1 resolver);
- document processing (Byte);
- background jobs;
- transaction and category writes;
- merchant-rule creation (C4c);
- goal creation;
- forecasts;
- premium report generation;
- usage limits (quota/rate-limit modules).

Identity, employee and entitlement are always server-resolved, never client-claimed. When authorization can't be established, the answer is deny.

## Mandatory commercial release gate (owner, 2026-11-24)
`authorizeCapability` currently **permits every capability**. Real entitlement enforcement — an installed resolver, every tool classified, and the enforcement points in section 4 wired — is a **mandatory gate before any paid plan launches**. Existing employee tools are not removed or disabled in the meantime. The per-employee inventory and recommended specialties are in `EMPLOYEE_INVENTORY_2026-11-24.md` (evidence folder): Crystal → forecasting, Goalie → goal planning, Finley → education and coaching, Liberty → debt management (evaluate), Ledger → bookkeeping organization (evaluate), Chime → reminders (evaluate), Blitz → retained pending review, Custodian → current app guidance preserved.

## 5. Upgrade experience (UI/UX Studio)
When a capability isn't available:
- name the specialist and the restriction;
- offer a handoff or an upgrade;
- keep the conversation and the authorized document context;
- never pretend the work was done;
- never invent pricing.

## 6. New employees
Every new employee needs:
- a specialty and a responsibility contract;
- an explicit tool allowlist and its restricted capabilities;
- document permissions (E1 map) and collaboration permissions;
- entitlement requirements and usage controls;
- approval requirements;
- security and regression tests.

They inherit the shared infrastructure; nothing is duplicated.

## 7. Team ownership
- **Prime HQ:** central coordination and the entitlement enforcement architecture (`capabilities.ts`).
- **Tag HQ:** categorization capabilities and restrictions.
- **Attachments HQ:** document access, extraction and employee document permissions (E1).
- **UI/UX Studio:** the employee experience, availability indicators and upgrade presentation.
