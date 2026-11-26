# UI/UX legacy retirement register (TB-5)

Owner rule: obsolete UI is **removed**, never just hidden. Each item is retired in its own
reversible commit, only after its replacement is verified in the browser. Branch
`feature/ui-ux-simplification` (local; Prime HQ integrates). Frozen candidates 9275ddb and
b706405 are untouched.

**Dormant vs obsolete (owner decision 2026-11-25).** *Dormant* employee functionality is
kept even when nothing mounts it today: it is waiting for a readiness review. *Obsolete*
code is a duplicate or replaced UI with no future role; it is removed.

> **Reconciliation.** No earlier W-numbered retirement plan was found in the repository,
> docs or session notes. The only related record is the legacy/integrity review note
> ("S-b was dead code", already removed). W1-W5 were therefore defined fresh from the TB-5
> work. Owner: if an earlier W-list exists elsewhere, send it and this register will be
> renumbered to match. No further removals are assigned until that is confirmed, except
> the zero-reference W6 below.

| ID | Item | Replaced by | Verified | Commit | Status |
|----|------|-------------|----------|--------|--------|
| W1 | Prime composer's hidden legacy attach button (`display:none`), its own file input, ACCEPT list, change handler and 'Processing...' pill (reachable only from the hidden button) | `ChatAttachmentButton` | Prime composer, desktop | 47b82e62 | Retired |
| W2 | `CHAT_VISUALS.headerLogo / headerName / headerSubtitle` (duplicate header sizes) | `CHAT_HEADER` in `src/lib/chatToolbar.ts` | 5 mounted panels, desktop + 390 / 320 | 3c92ba28 | Retired |
| W3 | Per-employee header controls: Prime's old header buttons and 'Secured' pill; Tag's separate History / New buttons, 30px 'x' and LIVE pill; the 44px buttons in `ConversationControls`; the separate Close buttons and duplicate SECURED tags in Crystal, Goalie, Byte, Ledger and Custodian | Universal `ChatIdentity` + `ChatToolbar` | Prime, Tag, Crystal, Goalie, Custodian at desktop + 390 / 320 | 07315baa, a7675e6a, 04a73379 | Retired |
| W4 | Transactions dashboard blocks above the list (account cards, KPI cards, donut, AI Insights, 'Add account') and the page-level 'Ask Prime' | Summary strip + compact summary; getting-started card; top-bar Ask Prime | Empty + simulated-populated Transactions | 74509447 | Retired |
| W5 | `ByteCopilotPanel`, `LedgerCopilotPanel` (no page mounts them) | — | — | — | **Dormant — keep** (owner: preserve Byte's chat future; Ledger pending readiness review). Their headers already use the universal header. |
| W6 | `src/pages/DashboardV2/Sparkline.tsx` (only drew the invented sparklines removed in HONEST-2; zero references) | — | tsc clean | fdedc8c6 | Retired |
| W7 | `src/pages/TransactionsPageV2.tsx` — orphan copy of the live `src/pages/dashboard/TransactionsPageV2.tsx` (route uses the dashboard one; git history already calls it "dead orphan"). Reviewed: an older subset (1,212 vs 1,494 lines); no feature the live page lacks. It still receives parallel security edits. | Live page | — | — | **Ready to retire; coordinate with Prime HQ** — `netlify/functions/__tests__/s0-batch2-authz.test.ts:294` reads this file. |
| W8 | `src/pages/CategoriesV2/TagCopilotPanel.tsx` — unmounted duplicate of the live Tag panel (`src/components/transactions/TagCopilotPanel.tsx`); contains a direct `transactions.update({ amount })` and "Tag confidence is high" copy | Live Tag panel | — | — | **Ready to retire; awaiting owner GO.** Tag HQ confirmed (2026-11-25, via Prime HQ) that nothing imports it, recommends the owner retire it, and its AR-4 architecture suite (ae401e1c, tag/t-protect) now fails if anything imports it. |
| W9 | URL-only dashboard routes that show fabricated figures (not in the sidebar): bank-accounts, debt-payoff-planner, ai-financial-freedom, bill-reminders, business-intelligence, spending-predictions, workspace, and the entertainment / automation / Finley workspace panels (e.g. "$24,580 total balance", "5 banks linked", "$124K revenue") | — | — | — | **Owner decision**: remove the routes, or gate them until each employee's readiness review. Finley / Liberty panels are dormant employees, but their fake figures are not. |
| W10 | Unreachable components with the owner's name or fake data: `MobileNavInline` ("Darrell Warner", "Level 8 Money Master"), `MobileRevolution` story cards, `MiniWorkspacePanel`, `ByteWorkspacePanel`, `CreditScoreCard`, `AccountSettingsSidebar`, `ProfileSettingsPage`, `useTaxData` constants; `MobileProfileModal` (mounted, never opened; fake save incl. password) | — | — | — | **Candidates**: confirm against the earlier plan (see Reconciliation), then retire one commit each |

| W11 | Dead merchant-write handlers passed to the Tag panel from `dashboard/TransactionsPageV2` (`onMerchantCategorize`, `onTagAction` with 'categorize' / 'bulk_change' / 'undo'); the panel never declares or calls them (Tag HQ, 2026-11-26). Over-broad `ilike '%merchant%'`, no confirmation | Tag proposals (save_merchant_rule / bulk_move_category -> commit_proposal) | Tag AR-4 checks (65d52852) fail if re-wired | — | **Ready to retire; owner GO** (Tag HQ recommends with W8). Must never be re-wired. |

## Kept on purpose

- `ConversationControls`: still the shared history wrapper (drawer, errors, unsaved
  notice); it now renders `ChatToolbar`.
- Custodian's own bordered input keeps the standard focus ring.
- `src/components/chat/_legacy/`: project rule — do not modify.
