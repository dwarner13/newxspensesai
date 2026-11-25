/**
 * Owner-approved chat visual standards (UX-P1, FINAL GO 2026-11-23), shared by Prime and
 * Tag. Presentation only. Each agent keeps its own identity colour (Prime gold, Tag
 * turquoise).
 */
export const CHAT_VISUALS = {
  // TB-5 W2: header logo / name / subtitle sizes now live in CHAT_HEADER
  // (src/lib/chatToolbar.ts), used by the universal ChatIdentity.
  /** Agent logo on loading / welcome screens. */
  welcomeLogo: 64,
  /** Agent logo in welcome and briefing rows. */
  welcomeRowLogo: 40,
  /** Agent avatar beside each message. */
  messageAvatar: 32,
  /** Conversation text. */
  textDesktop: 17,
  textMobile: 16,
  lineHeight: 1.65,
  /** Thinking-indicator dot diameter. */
  thinkingDot: 10,
  thinkingLabel: 15,
  /** Minimum touch target (WCAG / Apple HIG). */
  touchTarget: 44,
  /** Vertical space between conversation messages. */
  messageGap: 18,
} as const;

/** Conversation text size: 17px desktop, 16px mobile (16 also avoids iOS input zoom). */
export function chatTextSize(isMobile: boolean): number {
  return isMobile ? CHAT_VISUALS.textMobile : CHAT_VISUALS.textDesktop;
}
