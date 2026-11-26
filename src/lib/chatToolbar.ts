/**
 * TB-1 — universal chat header standard (owner GO). Pure sizing rules shared by ChatIdentity
 * and ChatToolbar, so every employee panel looks and sizes the same.
 */

export type ChatDisplayMode = 'quick' | 'expanded' | 'workspace';

/** Logo container: 48px desktop, 44px mobile. The artwork fills ~85% of it. */
export const CHAT_HEADER = {
  logoDesktop: 48,
  logoMobile: 44,
  artworkRatio: 0.85,
  /** Toolbar buttons: compact on desktop, 44px touch targets on phones. */
  controlDesktop: 38,
  controlMobile: 44,
} as const;

export function logoSize(isMobile: boolean): number {
  return isMobile ? CHAT_HEADER.logoMobile : CHAT_HEADER.logoDesktop;
}

export function artworkSize(isMobile: boolean): number {
  return Math.round(logoSize(isMobile) * CHAT_HEADER.artworkRatio);
}

export function controlSize(isMobile: boolean): number {
  return isMobile ? CHAT_HEADER.controlMobile : CHAT_HEADER.controlDesktop;
}

export const DISPLAY_MODE_LABELS: Readonly<Record<ChatDisplayMode, string>> = {
  quick: 'Quick Assist',
  expanded: 'Expanded',
  workspace: 'Full Workspace',
};

/**
 * Which display-mode buttons to show: only modes the employee supports, and never on
 * phones (the panel is already full screen there).
 */
export function visibleDisplayModes(supported: readonly ChatDisplayMode[] | undefined, isMobile: boolean): ChatDisplayMode[] {
  if (isMobile || !supported || supported.length < 2) return [];
  return (['quick', 'expanded', 'workspace'] as const).filter(m => supported.includes(m));
}
