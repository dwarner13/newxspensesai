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
| W5 | `ByteCopilotPanel`, `LedgerCopilotPanel` (no page mounts them) | Byte: the Upload Centre Byte workspace (plan phase U-E, shared hook) | Byte: AI Architecture HQ dependency check (no importer on any branch; its imports stay used); h1 test updated | Byte: this commit | **Byte retired 2026-11-27** (owner GO, direct; it also held an own `isIncome` rule, AR-1b R1). **Ledger: dormant — keep** (not covered by the GO). |
| W6 | `src/pages/DashboardV2/Sparkline.tsx` (only drew the invented sparklines removed in HONEST-2; zero references) | — | tsc clean | fdedc8c6 | Retired |
| W7 | `src/pages/TransactionsPageV2.tsx` — orphan copy of the live `src/pages/dashboard/TransactionsPageV2.tsx` (route uses the dashboard one; git history already calls it "dead orphan"). Reviewed: an older subset (1,212 vs 1,494 lines); no feature the live page lacks. It still receives parallel security edits. | Live page | — | abd40a58 | Retired (owner GO 2026-11-26; Prime HQ test row dropped in the same commit) |
| W8 | `src/pages/CategoriesV2/TagCopilotPanel.tsx` — unmounted duplicate of the live Tag panel (`src/components/transactions/TagCopilotPanel.tsx`); contains a direct `transactions.update({ amount })` and "Tag confidence is high" copy | Live Tag panel | — | 1efd46e9 | Retired (owner GO 2026-11-26; Tag HQ confirmed) |
| W9 | URL-only dashboard routes that show fabricated figures (not in the sidebar): bank-accounts, debt-payoff-planner, ai-financial-freedom, bill-reminders, business-intelligence, spending-predictions, workspace, and the entertainment / automation / Finley workspace panels (e.g. "$24,580 total balance", "5 banks linked", "$124K revenue") | — | — | — | **Owner decision**: remove the routes, or gate them until each employee's readiness review. Finley / Liberty panels are dormant employees, but their fake figures are not. |
| W10 | Unreachable components with the owner's name or fake data: `MobileNavInline` ("Darrell Warner", "Level 8 Money Master"), `MobileRevolution` story cards, `MiniWorkspacePanel`, `ByteWorkspacePanel`, `CreditScoreCard`, `AccountSettingsSidebar`, `ProfileSettingsPage`, `useTaxData` constants; `MobileProfileModal` (mounted, never opened; fake save incl. password) | — | — | — | **Candidates**: confirm against the earlier plan (see Reconciliation), then retire one commit each |

| W11 | Dead merchant-write handlers passed to the Tag panel from `dashboard/TransactionsPageV2` (`onMerchantCategorize`, `onTagAction` with 'categorize' / 'bulk_change' / 'undo'); the panel never declares or calls them (Tag HQ, 2026-11-26). Over-broad `ilike '%merchant%'`, no confirmation | Tag proposals (save_merchant_rule / bulk_move_category -> commit_proposal) | Tag AR-4 checks (65d52852) fail if re-wired | ea528dd3, c8b87aab | Retired (owner GO 2026-11-26; Tag HQ reviewed). Part 2 dropped the remaining undeclared props (injectedFollowupMerchants + its state and fetch, onToggleActivity, netFlow, onCategoryUpdated); the panel element now type-checks. Note: on Tag HQ's line applySweepFromChat already uses propose -> commit_proposal (4f51f679); the only remaining bulk_apply caller is the Upload page, replaced by feature/ui-apply-all. |
| W12 | `SmartCategoriesPage.tsx` ~646-690: a client-built Tag system prompt ("call tag_category_brain FIRST", plus client-derived stats) in a `useMemo` that is never used or sent (AI Architecture HQ flag, 2026-11-26) | — (server owns prompts) | No consumers (only occurrence); both routes and Prime's mobile 'Categories' button verified in the browser | (this commit) | Retired (owner GO 2026-11-26). Also removed: the chatContext memo and selectedCategoryForChat state that only fed it. Found, not changed: most of this page's handlers are already unused (handleAskTag / Crystal / Prime, rule builder, bulk move), its money math and 'Finley' copy are FST-2 / readiness items, and its category table is cut off on phones. |
| W13 | `SmartCategoriesPage.tsx` audit (owner 2026-11-26: "Audit unused rule builder and bulk handlers"). Never called: `handleAskTag`, `handleAskCrystal`, `handleAskPrime` (category-level asks; the Crystal/Prime ones navigate to chat routes with state), `handleCreateRuleFromBuilder` + rule-builder state (`ruleMerchantContains`, `ruleCategory`, `ruleSubcategory`, saving flags, `ruleMatchPreviewCount`; the builder form is not rendered), `handleGenerateStarterRules` + `starterRuleSuggestions` + `inferStarterCategory` (merchant-name regex), `applyInspectorBulkMove`, `dismissHandoffBanner`. Visible but inert: the two 'Create rule from top merchant' / 'Create a rule' buttons (they set builder state for a form that never shows). Also unused per tsc: `tagCardStats`, `stats`, `breakdownEntries`, `incomeBreakdownEntries`, `availableMonths`, `monthRange`, `getLearningBadge`, `inspectorSourceBreakdown`, `inspectorAvgConfidence`; after SC-4 also `breakdownSort` and `summaryMap` (learning-metrics map no longer read). Live and kept: Tag proposal flow (`proposeTagRule`, `applyMerchantSuggestion*`, `handleApproveAllSuggestedRules`, `handleClassifyConfidentMerchants`, `runHandoffCategorization`, `handleRenameOrMergeCategory`). The `openChat` launcher has no mounted renderer; SC-1 points the Ask buttons at working surfaces (the handoff auto-open effect still calls it and does nothing). | Working Tag rule flow (proposal + approve) | tsc unused list; grep reference counts | — | **Retired 2026-11-27** (owner GO, direct): dead handlers, rule-builder state and the two inert "Create a rule" buttons removed; state still written by live handlers kept |

## Kept on purpose

- `ConversationControls`: still the shared history wrapper (drawer, errors, unsaved
  notice); it now renders `ChatToolbar`.
- Custodian's own bordered input keeps the standard focus ring.
- `src/components/chat/_legacy/`: project rule — do not modify.
