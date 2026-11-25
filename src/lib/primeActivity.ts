/**
 * P-UI-4 — the thinking indicator's text. Uses only the whitelisted label usePrimeChat exposes
 * (src/shared/prime-activity-labels.ts); with no label it falls back to "<Agent> is thinking…".
 * Nothing else (tool ids, arguments, results, model text) is ever shown.
 */
import { PRIME_ACTIVITY_LABELS } from '@/shared/prime-activity-labels';

const ALLOWED = new Set(Object.values(PRIME_ACTIVITY_LABELS));

export function thinkingLabelFor(agent: string, activeToolLabel: string | null | undefined): string {
  // Defense in depth: only render a label that is one of the whitelisted phrases.
  if (activeToolLabel && ALLOWED.has(activeToolLabel)) {
    return `${agent} is ${activeToolLabel.charAt(0).toLowerCase()}${activeToolLabel.slice(1)}…`;
  }
  return `${agent} is thinking…`;
}
