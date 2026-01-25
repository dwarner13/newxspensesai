# Chat Behavior Contract (Lock v1)

## Goals
- Make chat stable and predictable (ChatGPT-like).
- Prevent duplicated greetings and auto-open regressions.

## Rules

### Greeting
- Show ONE greeting only, as a typed message bubble.
- Never show greeting card + greeting bubble.
- If ANY prior messages exist in the thread, DO NOT show a greeting.

### Welcome Back
- “Welcome back” is allowed only once per login session AND only on an empty thread.

### Auto-open
- Chat must NEVER auto-open on mount, login, or route change.
- Chat opens ONLY by explicit user action (button/card click) or explicit handoff event.

### Employees
- Employees never auto-introduce.
- Employees speak only when the user sends a message or a deliberate handoff occurs.

## Version
- v1: 2026-01-25
