export function getSessionFlag(key: string, userId?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  const scopedKey = userId ? `${key}::${userId}` : key;
  try {
    return sessionStorage.getItem(scopedKey) === '1';
  } catch {
    return false;
  }
}

export function setSessionFlag(key: string, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  const scopedKey = userId ? `${key}::${userId}` : key;
  try {
    sessionStorage.setItem(scopedKey, '1');
  } catch {}
}

export function clearWelcomeFlagsForUser(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  const keys = ['xai_welcome_back_shown', 'xai_prime_ready_shown'];
  keys.forEach((key) => {
    try {
      if (userId) {
        sessionStorage.removeItem(`${key}::${userId}`);
      }
      sessionStorage.removeItem(key);
    } catch {}
  });
}
