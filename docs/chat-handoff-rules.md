Chat Handoff Rules (Dev)

States
- Normal greeting: no handoff payload; greeting may appear.
- Handoff: valid handoff payload with note; handoff pill shows and sender note is first assistant message.
- Initial question draft: optional composer prefill only, never sent automatically.

Invariants
- Handoff requires `handoff.note` (non-empty) and `handoff.fromEmployeeSlug`.
- Greeting and handoff are mutually exclusive.
- Handoff pill only shows when a valid handoff exists.
- Handoff note renders once and clears after render.
- initialQuestion is draft-only and never auto-sends.

Tests and checks
- npm run test
- npm run verify:no-autosend
- npm run verify:handoff
