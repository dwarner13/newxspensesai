import type { PrimeChatMode } from "@/lib/uiStore";

/** UX-P2: desktop panel width per mode. Mobile is always full width. */
export const PRIME_PANEL_WIDTH: Record<Exclude<PrimeChatMode, 'workspace'>, number> = {
  quick: 560,
  expanded: 820,
};

/** CSS width for the Prime panel at a given mode on desktop. */
export function primePanelWidth(mode: PrimeChatMode): string {
  if (mode === 'workspace') return '100vw';
  return `min(${PRIME_PANEL_WIDTH[mode]}px, 100vw)`;
}

/** Quick ↔ Expanded toggle (Workspace returns to Quick). */
export function nextExpandMode(mode: PrimeChatMode): PrimeChatMode {
  return mode === 'quick' ? 'expanded' : 'quick';
}
