# Prime UI Contract

Version: v2-draft (2026-02-16)
Owner: Prime UI + Platform
Status: Draft

## Purpose
Define deterministic chat UI behavior so Prime feels stable, predictable, and ChatGPT-like.

## Scope
This contract covers visible chat behavior only:
- launch/open/close behavior
- greeting and welcome messages
- employee introduction behavior
- render behavior for blocked or failed responses

## Invariants
- Chat never auto-opens on mount, login, route change, or refresh.
- Chat opens only on explicit user action or explicit handoff event.
- Exactly one greeting bubble is allowed on an empty thread.
- If any prior message exists in the active thread, no greeting is shown.
- Employee responses are only shown after user input or explicit handoff.

## Rules

### Open/Close
- Open sources allowed: user click, command palette action, explicit handoff.
- Open sources forbidden: hydration side effects, route effects, auth callbacks.
- Closing chat must preserve thread state unless user chooses clear/reset.

### Greeting
- Render one typed greeting bubble on empty thread only.
- Do not render a greeting card and greeting bubble at the same time.
- Greeting must not replay while same thread is active.

### Welcome Back
- Allowed once per login session and only when thread is empty.
- Never shown if conversation history exists.

### Employee Presentation
- Employees do not auto-introduce.
- Employee avatar/name can render in UI chrome, but no auto message is emitted.

### Blocked/Policy UX
- Blocked responses render as normal assistant bubble with safe fallback copy.
- Never expose raw policy internals, stack traces, or model rationale to user.

## Acceptance Criteria
- Empty thread + open chat -> exactly one greeting bubble.
- Existing thread + open chat -> no greeting bubble.
- Login, route change, hot reload -> chat remains closed.
- Handoff event -> chat opens once, no duplicate intro messages.
- Blocked response -> safe user-facing message appears, composer remains usable.

## Implementation Checklist
- Use a single source of truth for `isChatOpen`.
- Gate greeting rendering from thread message count, not transient local flags.
- Keep welcome-back flag in session-scoped storage.
- Add visual regression test for no duplicate greeting states.
