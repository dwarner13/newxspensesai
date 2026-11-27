# Universal conversation history: UI rollout sequence

Owner decision (2026-11-25): conversation history is mandatory for **every customer-facing
employee**, current and future. Reuse the shared platform; no employee-specific history
systems. Personality, tools, document permissions and entitlements stay per employee.

## Shared pieces (built)

| Piece | File | Status |
|---|---|---|
| Employee identity (canonical slugs, aliases) | `src/shared/conversation-identity.ts` | Prime HQ |
| History list / ownership check / restore / account cache | `src/lib/conversationStore.ts` | `ded45ea` |
| History list hook (`useChatSessions({ employee })`) | `src/hooks/useChatSessions.ts` | `ded45ea` |
| History drawer (search, Today / Earlier, New chat) | `src/components/chat/ConversationHistoryDrawer.tsx` | P1-e |
| Prime: resume checks user + employee | `PrimeChatV2.tsx` | `796a017` |
| Tag: restore, resume, New conversation, History, save notices | `TagCopilotPanel.tsx` | `34e14cf` (+ Tag HQ `4ae4e6e`) |
| Prime: "couldn't be saved" notice | `PrimeChatV2.tsx` | `aef2845` |

Rules for every employee: list and restore by **session**, never by thread; never delete
from the client; retry resends only the chat message with the same `clientMessageId`;
never retry automatically; `duplicate` / `conflict` replies are display-only.

## Next: one shared hook, then one panel at a time

**H-1 `useEmployeeConversation(employee)`** (`src/hooks/useEmployeeConversation.ts`)
- Returns `{ sessionId, initialMessages, history, historyLoading, openHistory, openConversation(id), startNewConversation(), persistedNotice }`.
- On open: account cache, then the server copy of the latest session (owner + employee checked).
- Feeds `useUnifiedChatEngine({ employeeSlug, initialMessages, conversationId: sessionId })`, the same inputs Prime already uses.

**H-2 `ConversationHeaderActions`** (`src/components/chat/ConversationHeaderActions.tsx`)
- History button (44px) and New conversation (44px), plus the `ConversationHistoryDrawer`, styled per employee accent.

**Then, per employee (each waits on Prime HQ confirming that employee's server persistence):**

| Order | Employee | Panel | Slug sent today | Canonical |
|---|---|---|---|---|
| 1 | Crystal | `src/pages/MyStoryV2/CrystalCopilotPanel.tsx` | `crystal-ai` | `crystal-analytics` |
| 2 | Goalie | `src/pages/GoalsDebtV2/GoalieCopilotPanel.tsx` | `goalie-ai` | `goalie-goals` |
| 3 | Custodian | `src/components/settings/tabs/CustodianSupportTab.tsx` | `custodian` | `custodian` |
| 4 | Byte | ~~`src/pages/CategoriesV2/ByteCopilotPanel.tsx`~~ retired 2026-11-27 (owner GO; never mounted) | `byte-docs` | `byte-docs` |
| 5 | Ledger | `src/pages/TaxBusinessV2/LedgerCopilotPanel.tsx` | `ledger-tax` | `ledger-tax` |
| — | Future employees | any panel on `useUnifiedChatEngine` | — | add to `CONVERSATION_EMPLOYEES` |

## Rollout inventory (updated 2026-11-25)

| Employee | Panel (live) | Status |
|---|---|---|
| Prime | `PrimeChatV2` | Done (own restore + history; `796a017`, `aef2845`) |
| Tag | `TagCopilotPanel` | Done (`34e14cf` + Tag HQ `4ae4e6e`) |
| Crystal | `CrystalCopilotPanel` | Done: shared hook (`4f1e2f0`) |
| Goalie | `GoalieCopilotPanel` | Done: shared hook |
| Byte | `ByteCopilotPanel` | Retired 2026-11-27 (unused). Byte chat returns in the Upload Centre plan, phase U-E (shared hook) |
| Ledger | `LedgerCopilotPanel` | Done: shared hook |
| Custodian | `CustodianPanel` (`components/onboarding/CustodianPanelChat.tsx`, opened from Settings) | Done: keeps its own `custodian-chat` endpoint (Prime HQ `0b71326`: same contract as Tag); restore, history, New conversation, notices via the shared `useEndpointConversation` hook. Read-only, no tools. |
| Finley, Liberty, Chime, Blitz | No live panel found; `src/pages/chat/*` are legacy, with routes commented out in `App.tsx` | Unverified. Wire when a live panel exists and Prime HQ verifies the server side. |
| Any employee via `/dashboard/chat/:employeeId` (`EmployeeChatPage`) | Generic route | To audit: which employees reach it, and whether it should use the shared hook. |

Server checks per employee (Prime HQ):
1. `/chat` saves a `chat_sessions` row whose `employee_slug` canonicalizes to that employee.
2. The reply returns `sessionId` and `persisted`.
3. A client `conversationId` resumes only an owned session of the same employee.

Per employee, the UI work is: add the hook and header actions (~10 lines), a save-notice
line for `persisted === false`, and tests. Each is a separate commit for Prime HQ to
integrate; none is added to a candidate that is already in validation.
