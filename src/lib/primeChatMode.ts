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

/** Workspace content column width (messages + composer). */
export const WORKSPACE_COLUMN_PX = 760;

/**
 * Horizontal padding that centres the Workspace column; the normal 16px gutter otherwise.
 * Padding (not a wrapper element) keeps the chat DOM identical across modes.
 */
export function workspaceSideGutter(mode: PrimeChatMode): string {
  return mode === 'workspace' ? `max(16px, calc((100% - ${WORKSPACE_COLUMN_PX}px) / 2))` : '16px';
}

/** Quick ↔ Expanded toggle (Workspace returns to Quick). */
export function nextExpandMode(mode: PrimeChatMode): PrimeChatMode {
  return mode === 'quick' ? 'expanded' : 'quick';
}
