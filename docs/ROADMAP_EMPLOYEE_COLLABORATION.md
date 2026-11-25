# Roadmap: persistent employee collaboration and smart continuation

Status: **design planning only** (Development HQ, 2026-11-25). Not in either frozen
candidate (9275ddb, b706405). Current security work and staging acceptance come first.
Server architecture: Prime HQ. Customer-facing experience: UI/UX Studio. Each employee's
capability: the owning HQ.

## Requirements (as given)
1. Internal specialist consultation is the default; the customer stays in the current conversation.
2. An optional "Dive deeper with [employee]" button.
3. Completed consultations are saved even if the customer never clicks it.
4. A specialist recalls its earlier calculations when the customer opens it independently later, on any device, after signing out and back in.
5. Authorized results, assumptions, timestamps and task history are shared.
6. Valid earlier calculations are reused when the underlying information hasn't changed.
7. No circular handoffs or endless routing; consultation limits, response-time budgets and timeout handling.
8. Personalities and specialist capabilities are preserved.
9. Subscription entitlements are enforced server-side.
10. Privacy, memory controls and deletion requirements are respected.

## Acceptance scenario
Tag consults Crystal for a five-year savings calculation, and the customer sees the
result in Tag and ignores the Crystal button. Five minutes later the customer opens
Crystal and asks about it. Crystal retrieves the completed consultation and continues
without the customer repeating anything. The same works after signing out and returning
on another device.

## What already exists to build on
- One conversation per session, with employee identity on every session and message (`src/shared/conversation-identity.ts`, server `conversation-platform`).
- Server refuses to relabel another employee's conversation; genuine handoffs use the `handoffs` table (Prime HQ `914468c`).
- Read-only specialist consultation with a recorded event: Prime → Tag (`specialistConsultations`, L-A), shown as "Prime checked with Tag · <scope>".
- One capability hook (`src/shared/capabilities.ts → authorizeCapability`) for entitlements, deny-by-default once populated.
- Shared client history for seven employees (`useEmployeeChat`, `useEndpointConversation`, `ConversationControls`).

## Proposed design (to review)

### Server (Prime HQ)
- **Consultation record** (new table, owner-scoped): consultation id, customer, requesting employee + session, specialist, task type, inputs and assumptions (masked), result (structured), data fingerprint (the source rows / period / account set it used), created_at, expires / validity, entitlement decision, status (completed / timed out / denied). Saved whenever a consultation completes, independent of any button.
- **Specialist recall:** when a specialist's conversation starts or resumes, the server loads that customer's recent consultations *for that specialist* (authorized results only) into context, so Crystal can say "Earlier, for Tag, I worked out…".
- **Reuse:** before recalculating, compare the stored data fingerprint with the current one. Unchanged → reuse (labelled with its date); changed → recalculate and say what changed.
- **Loop and budget guards:** a consultation depth limit of 1 (a specialist consulted by another employee cannot consult again in the same turn), one consultation per specialist per turn, a per-consultation time budget with an honest timeout reply ("Crystal couldn't finish in time; nothing was changed"), and a per-customer rate limit.
- **Entitlements:** `authorizeCapability` is checked server-side for the specialist capability *before* consulting; a denied consultation is recorded as denied and the reply says so (no fabricated result).
- **Privacy:** consultations follow the customer's memory controls (off = not saved or recalled) and are removed with the customer's conversation and data deletion. They are never visible to another customer, and never cross employees without authorization.

### Customer experience (UI/UX Studio)
- **In the current conversation:** a compact consultation card under the reply, extending the existing "Prime checked with Tag" marker: "Tag asked Crystal · 5-year savings projection", with the key result and assumptions, a timestamp, and honest status (completed / couldn't finish / not included in your plan).
- **Dive deeper with Crystal** (optional, 44px, the specialist's colour): opens Crystal's panel in a conversation seeded from that consultation. If ignored, nothing is lost.
- **In the specialist's own panel:** when relevant consultations exist, a small "From your chats with Tag" strip (date, task, result) that the customer can open or dismiss. The specialist's first reply can reference it naturally.
- **Reuse is visible:** "Based on Crystal's calculation from Nov 25 (your data hasn't changed since)", or "Recalculated: 3 new transactions since Nov 25".
- **Limits are honest:** timeout, denied-entitlement and depth-limit outcomes are plain sentences: never a spinner that stops, never an invented result, never pricing.
- **Same shared components** for every employee: one ConsultationCard, one Dive-deeper button, one recall strip, used by Prime, Tag, Crystal, Goalie, Byte, Ledger and Custodian. Each employee keeps its own voice and colour.
- **Cross-device:** everything is server-backed, so the scenario works after signing out and on another device. The browser cache stays fast-paint only.

### Acceptance tests to write when built
- The Tag → Crystal scenario above, on desktop and iPhone, after sign-out and on a second device.
- Ignoring the button still saves the consultation; opening Crystal recalls it without repeating the question.
- Unchanged data → reused (dated); changed data → recalculated with the difference stated.
- A → B → A routing is blocked; timeout and denied-entitlement replies are honest.
- Memory off → nothing saved or recalled; deleting the conversation or data removes the consultations.
- A second customer never sees the first's consultations.

## Dependencies and order (proposal)
1. Owner approval of this design and the entitlement matrix.
2. Prime HQ: consultation record, recall, reuse fingerprint, loop and budget guards, entitlement check, privacy and deletion hooks (with migration approval).
3. UI/UX: ConsultationCard, Dive-deeper, recall strip, honest outcome states, on the shared history components.
4. Browser acceptance with the scenario above.

Finley, Liberty, Chime and Blitz remain out of scope until their separate readiness review.
