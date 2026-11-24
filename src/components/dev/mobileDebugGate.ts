/**
 * S-1 — the mobile debug panel is a development tool. It shows only in development
 * builds (import.meta.env.DEV), where VITE_MOBILE_DEBUG=true or ?debugMobile=1 turns it
 * on. In production builds it never renders, whatever the URL says.
 */
export function isMobileDebugEnabled(isDev: boolean, envFlag: string | undefined, search: string | null | undefined): boolean {
  if (!isDev) return false;
  if (envFlag === 'true') return true;
  try {
    return new URLSearchParams(search ?? '').get('debugMobile') === '1';
  } catch {
    return false;
  }
}
