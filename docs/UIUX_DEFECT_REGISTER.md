# UI/UX defect register — 2026-11-25

Local branch `feature/ui-ux-simplification`; nothing pushed or deployed. Verification is
in the local preview (localhost:8888) with the test account, plus **simulated fixture
data** for populated states. Fixtures are local-preview only: injected by the scratchpad
preview config, never committed or built; all writes and server / AI calls are blocked
while active, and a "SIMULATED DATA" banner is shown.

## Fixed (this batch)

| Defect | Root cause | Commit |
|---|---|---|
| Duplicate startup splash | Dashboard suspends on first load; React discards the tree and RouteDecisionGate remounts with its boot ref reset; plus a 350 ms blank page loader | 79460fb3 |
| Dashboard pulsing during AI work | Sidebar "Upload Statement" pulsed nonstop (`glowPulse`); review dot used `animate-ping`. Sweep of 8 pages: no other infinite animations; nothing outside Tag changes while Tag answers | 99ab083a |
| Composer text against borders | Two global `textarea:focus` rules drew a ring inside the composer frame; 4-8px inner padding | fe4b3eec |
| Conversation bubble padding | Prime replies had 4px padding | 1a10954b |
| Transaction drawer header spacing | 20px padding, title not aligned to 44px buttons | 99ab083a |
| Broken category glyph (box before "Groceries") | Emoji U+1FAD2 unsupported on Windows 10 | 99ab083a |
| Upload queue "?" before Pause / Resume / Cancel | Symbols lost to an earlier encoding change | d3622716 |
| Receipt button close to queue controls | No separation | d3622716 |
| Goalie $23,000 goals / $14,950 debt on empty account | Hard-coded example data shown whenever goals / debts were empty or failed; DB has no `debts` table and `goals` lacks the queried columns, so **every customer** saw it | f115ff78 |
| Invented figures / claims on sidebar pages | Fake sparklines, fixed Crystal / Prime narratives, "$340" / "$500/mo" savings, "high confidence", "All staged and ready", fixed bank list on Reports | 5ee67f86 |
| Mobile Goalie tiles overflow; 320 header names truncate | Four-column flex; 17px name | 16f0b6d7 |
| Startup blank page (missing self-check file) | `main.tsx` imported a never-committed file | aea84342 |
| Transactions not transaction-first; duplicate Ask Prime | Dashboard blocks above list | 74509447 |
| Budget notice never reached the Inbox | Inserted columns `user_notifications` lacks | e9e4ad5e |
| Review counts disagreed (Home 2, Transactions / Categories 'all categorized', sidebar badge, Tag bubble) | Four separate rules; literal 'Needs Review' rows not counted by the shared rule | 1127da0d, 249788f0, 63ef6640 |
| **New customers' dashboard crashed after onboarding** | Post-onboarding chooser used two icons that were never imported (since 2025-12-28) | 611cca13 |

## Open

| Item | Owner / next step |
|---|---|
| Goals & Debt storage missing (`debts` table absent; `goals` columns mismatch) | Backend — Prime HQ / owner. UI now says "isn't set up yet". |
| Deduction totals differ: Home "Deductions Found" $0 vs My Story "Possibly deductible" (sum of Transportation, Subscriptions, Bank Fees, Food & Dining) | Calculation — Prime HQ (FST definitions) |
| Transactions summary "Income" and compact-summary categories include transfers / card payments (simulated data: Transfer shown as a spending category) | Calculation — Prime HQ (FST-2, planning only) |
| Categories "22 transactions" vs Transactions "28" for the same data | Scope definition — Prime HQ |
| Home "Expenses ↓ -63%" shows both an arrow and a minus sign | UI — next batch |
| Mobile: floating Tag bubble covers row amounts while scrolling | UI — next batch (needs a design choice: list bottom padding vs smaller bubble) |
| "Add New Goal" card looks clickable but does nothing; "+ New Goal" with no storage | Wait for Goals storage decision |
| URL-only routes with fabricated figures (W9) and unreachable fake components (W10) | Owner decision — see retirement register |
| Upload queue shows raw error codes (e.g. `simulated_mode`) on failure | UI — next batch (needs Byte / Attachments wording) |
| Keyboard-open behaviour | Owner to test on an iPhone (Decision 2) |
| Dev-only: ~4s blank before the first splash on a cold dev server | Dev server module loading; production unaffected — not a defect |
| Review page for an already-imported statement would say 'Imported 0 transactions' (after S-1) | UI/UX — show 'This statement is already imported' with a link (Attachments HQ suggestion) |
| Type checking does not run: `tsc -p tsconfig.json` checks no files; with `tsconfig.app.json`, ~346 pre-existing syntax errors (e.g. AddIncomeModal, PrimeTeamStatusPanel) stop semantic checks, so undefined names go unnoticed | All teams — fix or exclude the broken files so `tsc -p tsconfig.app.json` can run; CHOOSER-1 was found this way |
| `toast` used without import in dashboard/TransactionsPageV2 (applySweep paths) | Fixed on Tag HQ's line; dead paths |
