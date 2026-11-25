# UI/UX legacy retirement register (TB-5)

Owner rule: obsolete UI is **removed**, never just hidden. Each item is retired in its own
reversible commit, only after its replacement is verified in the browser. Branch
`feature/ui-ux-simplification` (local; Prime HQ integrates). Frozen candidates 9275ddb and
b706405 are untouched.

> No W1–W5 register was found in the repository or docs. This file defines W1–W5 from
> the TB-5 work below. Owner: please confirm it matches your list.

| ID | What was retired | Replaced by | Verified | Commit | Status |
|----|------------------|-------------|----------|--------|--------|
| W1 | Prime composer's hidden legacy attach button (`display:none`), its own file input, ACCEPT list, change handler and 'Processing...' pending-file pill (reachable only from the hidden button) | `ChatAttachmentButton` (camera / gallery / file) | Prime composer, desktop, 2026-11-25 | 47b82e62 | Retired |
| W2 | `CHAT_VISUALS.headerLogo / headerName / headerSubtitle` (duplicate header sizes) | `CHAT_HEADER` in `src/lib/chatToolbar.ts` | All 5 mounted panels, desktop + 390 / 320 | 3c92ba28 | Retired |
| W3 | Per-employee header controls: Prime's old header buttons and 'Secured' pill (TB-2); Tag's separate History / New buttons, 30px 'x' and decorative LIVE pill (TB-3); the 44px History / New buttons in `ConversationControls`; the separate Close buttons in Crystal, Goalie, Byte, Ledger and Custodian; and the duplicate SECURED tags (TB-4) | Universal `ChatIdentity` + `ChatToolbar` | Prime, Tag, Crystal, Goalie, Custodian at desktop + 390 / 320 | 07315baa, a7675e6a, 04a73379 | Retired |
| W4 | Transactions dashboard blocks above the list (account cards, four KPI cards, spending donut, AI Insights card, 'Add account' card) and the page-level 'Ask Prime' button | Summary strip + optional compact summary; getting-started card; shell top-bar Ask Prime | Empty Transactions, desktop | 74509447 | Retired |
| W5 | Unreachable code: `ByteCopilotPanel` and `LedgerCopilotPanel` (no page mounts either panel), and `src/pages/TransactionsPageV2.tsx` (an old copy; the route uses `src/pages/dashboard/TransactionsPageV2.tsx`) | — | Not mountable, so can't be browser-verified | — | **Owner decision**: retire, or mount Byte / Ledger panels (owner listed Byte and Ledger as active) |

## Not retired (kept on purpose)

- `ConversationControls`: still the shared history wrapper (drawer, errors, unsaved notice);
  it now renders `ChatToolbar`.
- Custodian's own bordered input keeps the standard focus ring (it is not a framed composer).
- `src/components/chat/_legacy/`: project rule — do not modify.
