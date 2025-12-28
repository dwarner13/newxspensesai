/**
 * Shared constants for chat slideout sizing
 * Ensures all employee chats use identical panel dimensions
 * 
 * CRITICAL: Panel height must be FIXED to prevent resizing when content changes.
 * Only the messages scroll area should scroll; panel shell never resizes.
 */

// Panel width (desktop)
export const CHAT_SHEET_WIDTH = 'max-w-xl'; // Tailwind class: max-width 36rem (576px)

// Panel height - FIXED, never auto-sizes based on content
// Uses viewport height minus padding (3rem = 48px top/bottom padding)
export const CHAT_SHEET_HEIGHT = 'calc(100vh - 3rem)'; // CSS calc value

// Max height - same as height to prevent any expansion
export const CHAT_SHEET_MAX_HEIGHT = 'calc(100vh - 3rem)'; // CSS calc value

// Shared className for consistent sizing
export const CHAT_SHEET_CLASSNAME = `${CHAT_SHEET_WIDTH} flex flex-col`;

// Chat input max height (prevents footer from growing and causing layout shifts)
export const CHAT_INPUT_MAX_HEIGHT_PX = 120; // 120px = max-h-30

