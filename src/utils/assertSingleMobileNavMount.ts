/**
 * Dev-only guard to ensure only one MobileNav is mounted
 * Prevents duplicate mobile navigation components
 */

let count = 0;

export function assertSingleMobileNavMount() {
  if (import.meta.env.PROD) return;
  count += 1;
  if (count > 1) {
    console.error(`[MobileNav] Duplicate mount detected (${count}). Only one instance is allowed.`);
  }
}









