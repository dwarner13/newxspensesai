/**
 * Prime Chat C2-B — one authoritative Prime session selection.
 *
 * The selected Prime conversation is the existing localStorage key
 * `chat_session_<userId>_prime-boss` (already read by PrimeChatV2 and usePrimeChat).
 * Launcher requests ("open Prime", "open this conversation") are routed to the active
 * PrimeBriefingPanel / PrimeChatV2; a requested conversation is used only after the
 * signed-in user is shown to own it. The server (ensureSession) independently rejects
 * foreign session IDs; this check keeps the client from even trying.
 *
 * Pure helpers apart from the Supabase client passed into verifyOwnedPrimeSession.
 */

export const PRIME_SESSION_SLUG = 'prime-boss' as const;

const PRIME_SLUGS: ReadonlySet<string> = new Set(['prime-boss', 'prime']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPrimeSlug(slug: string | null | undefined): boolean {
  return PRIME_SLUGS.has(String(slug ?? '').trim().toLowerCase());
}

export function isSessionUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

/** The single storage key for the selected Prime conversation (panel AND full page). */
export function primeSessionStorageKey(userId: string): string {
  return `chat_session_${userId}_${PRIME_SESSION_SLUG}`;
}

/** Persist the selected Prime conversation so a refresh restores it. Never throws. */
export function storePrimeSessionId(userId: string, sessionId: string): boolean {
  try {
    localStorage.setItem(primeSessionStorageKey(userId), sessionId);
    return true;
  } catch {
    return false;
  }
}

export interface LauncherSnapshot {
  isOpen: boolean;
  initialEmployeeSlug?: string | null;
  conversationId?: string | null;
  /** The launcher's effective employee when no slug was passed. */
  activeEmployeeSlug?: string | null;
}

export type PrimeLaunchDecision =
  | { handle: false }
  | { handle: true; requestedSessionId: string | null };

/**
 * Should this launcher state open the Prime panel? Only open requests for Prime.
 * Specialist requests are not handled here (unchanged behaviour).
 * A conversationId is forwarded only when it is a UUID; ownership is checked later.
 */
export function resolvePrimeLaunch(s: LauncherSnapshot): PrimeLaunchDecision {
  if (!s.isOpen) return { handle: false };
  const slug = s.initialEmployeeSlug || s.activeEmployeeSlug || PRIME_SESSION_SLUG;
  if (!isPrimeSlug(slug)) return { handle: false };
  return { handle: true, requestedSessionId: isSessionUuid(s.conversationId) ? s.conversationId!.trim() : null };
}

/** Minimal Supabase surface used for the ownership check (keeps this testable). */
export interface SessionOwnershipClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          maybeSingle(): PromiseLike<{ data: { id?: string } | null; error: unknown }>;
        };
      };
    };
  };
}

/**
 * True only when `sessionId` is a chat session owned by `userId`. Fails closed on any
 * malformed input or query error.
 */
export async function verifyOwnedPrimeSession(
  client: SessionOwnershipClient | null | undefined,
  userId: string | null | undefined,
  sessionId: unknown,
): Promise<boolean> {
  if (!client || !userId || !isSessionUuid(sessionId)) return false;
  try {
    const { data, error } = await client
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId.trim())
      .eq('user_id', userId)
      .maybeSingle();
    return !error && !!data?.id && data.id === sessionId.trim();
  } catch {
    return false;
  }
}
