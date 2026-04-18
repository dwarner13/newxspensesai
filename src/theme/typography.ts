/**
 * Typography tokens
 *
 * Semantic font sizes with desktop + mobile variants. This file is intentionally
 * small — it covers the sizes actually needed for conversational/body content.
 *
 * WHY THIS EXISTS:
 * The codebase has 1,417 inline `fontSize:` declarations across 82 files,
 * with 9 different hardcoded sizes in the 9-16px range (many typos/drift like
 * 10.5, 11.5, 12.5, 13.5). Zero discipline. This file introduces discipline
 * GRADUALLY — use it for new code and when touching old files. Do NOT do a
 * mass retrofit; that's 2-3 days of high-risk edits with no user value.
 *
 * USAGE PATTERNS:
 *
 *   // 1. Static (desktop-only):
 *   <div style={{ fontSize: TEXT.body }}>...</div>
 *
 *   // 2. Mobile-aware:
 *   const isMobile = useIsMobile();
 *   <div style={{ fontSize: isMobile ? TEXT.chatMobile : TEXT.chat }}>...</div>
 *
 *   // 3. Semantic helper:
 *   <div style={{ fontSize: chatSize(isMobile) }}>...</div>
 *
 * SCALE:
 *   - meta:  timestamps, small chrome (11px / 12px mobile)
 *   - label: form labels, button text (13px / 14px mobile)
 *   - body:  main body text (14px / 16px mobile)
 *   - chat:  conversation bubbles — bigger for readability (15px / 17px mobile)
 *   - title: panel headers, card titles (16px / 17px mobile)
 *
 * NOT INCLUDED: display sizes (20px+). Those are rare, use literal values.
 */

export const TEXT = {
  // Desktop sizes (default)
  meta: 11,
  label: 13,
  body: 14,
  chat: 15,
  title: 16,

  // Mobile sizes (bumped for readability on phones)
  metaMobile: 12,
  labelMobile: 14,
  bodyMobile: 16,
  chatMobile: 17,
  titleMobile: 17,
} as const;

/**
 * Semantic helpers — prefer these over direct TEXT.* access when the size
 * needs to vary by viewport. Cleaner at the call site.
 */
export const chatSize = (isMobile: boolean) => (isMobile ? TEXT.chatMobile : TEXT.chat);
export const bodySize = (isMobile: boolean) => (isMobile ? TEXT.bodyMobile : TEXT.body);
export const labelSize = (isMobile: boolean) => (isMobile ? TEXT.labelMobile : TEXT.label);
export const titleSize = (isMobile: boolean) => (isMobile ? TEXT.titleMobile : TEXT.title);
export const metaSize = (isMobile: boolean) => (isMobile ? TEXT.metaMobile : TEXT.meta);
