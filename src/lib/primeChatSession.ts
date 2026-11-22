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

// ─────────────────────────────────────────────────────────────────────────────
// C2-R — cross-device resume + history completeness (pure helpers)
// ─────────────────────────────────────────────────────────────────────────────

export interface RecentActivityRow { session_id: string; created_at: string }
export interface SessionRow { id: string; employee_slug: string | null; title?: string | null; created_at?: string | null }

/** Latest message time per session (ISO strings). */
export function latestActivityBySession(rows: readonly RecentActivityRow[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const r of rows) {
    if (!r?.session_id || !r?.created_at) continue;
    const prev = out.get(r.session_id);
    if (!prev || r.created_at > prev) out.set(r.session_id, r.created_at);
  }
  return out;
}

/**
 * Per-device resume state. `baseline`: only activity after this time is offered (set on New
 * chat, Continue and explicit selections). `dismissed`: session id → last activity already
 * offered and dismissed/continued (offered again only if that session gets newer activity).
 */
export interface ResumeState { baseline?: string; dismissed?: Record<string, string> }

const resumeKey = (userId: string) => `prime_resume_state_${userId}`;

export function readResumeState(userId: string): ResumeState {
  try {
    const raw = localStorage.getItem(resumeKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed as ResumeState : {};
  } catch {
    return {};
  }
}

export function writeResumeState(userId: string, state: ResumeState): void {
  try {
    const dismissed = Object.entries(state.dismissed ?? {}).slice(-50); // bounded
    localStorage.setItem(resumeKey(userId), JSON.stringify({ ...state, dismissed: Object.fromEntries(dismissed) }));
  } catch { /* storage unavailable: resume offers simply repeat */ }
}

export interface ResumeCandidate { sessionId: string; lastActivity: string; title: string | null }

/**
 * A newer, different, owned Prime conversation to OFFER (never switched to automatically).
 * `sessions` must already be filtered to the signed-in user's rows.
 */
export function selectResumeCandidate(input: {
  recent: readonly RecentActivityRow[];
  sessions: readonly SessionRow[];
  currentSessionId?: string | null;
  currentLastActivity?: string | null;
  state: ResumeState;
}): ResumeCandidate | null {
  const activity = latestActivityBySession(input.recent);
  const current = input.currentSessionId ?? null;
  const currentLast = (current && activity.get(current)) || input.currentLastActivity || null;
  const floor = [currentLast, input.state.baseline].filter((v): v is string => !!v).sort().pop() ?? null;
  const byId = new Map(input.sessions.map(s => [s.id, s]));
  const ordered = [...activity.entries()].sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0));
  for (const [id, last] of ordered) {
    if (id === current || !isSessionUuid(id)) continue;
    const row = byId.get(id);
    if (!row || !isPrimeSlug(row.employee_slug)) continue;
    if (floor && last <= floor) return null; // ordered newest first: nothing newer remains
    const dismissedAt = input.state.dismissed?.[id];
    if (dismissedAt && dismissedAt >= last) continue;
    return { sessionId: id, lastActivity: last, title: row.title && row.title.trim() && row.title !== 'New Chat' ? row.title : null };
  }
  return null;
}

/** Fallback label for a Prime conversation without an AI summary. */
export function primeConversationFallbackTitle(row: SessionRow, lastActivity?: string | null): string {
  if (row.title && row.title.trim() && row.title !== 'New Chat') return row.title;
  const when = lastActivity || row.created_at;
  const d = when ? new Date(when) : null;
  return d && Number.isFinite(d.getTime())
    ? `Prime conversation · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Prime conversation';
}

/** Shape used by useChatSessions for chat_convo_summaries rows. */
export interface SummaryLikeRow {
  convo_id?: string | null; conversation_id?: string | null; title: string | null; summary: string | null;
  tags: string[]; employees_involved: string[]; started_at: string | null; last_message_at: string | null; pinned: boolean;
}

/**
 * Append owned Prime sessions that have messages but no AI summary (e.g. summary generation
 * failed), so no saved conversation is invisible. Never duplicates a summarized session.
 */
export function mergeUnsummarizedPrimeSessions(
  summaries: readonly SummaryLikeRow[],
  sessions: readonly SessionRow[],
  activity: ReadonlyMap<string, string>,
): SummaryLikeRow[] {
  const have = new Set(summaries.flatMap(s => [s.conversation_id, s.convo_id]).filter(Boolean) as string[]);
  const extra: SummaryLikeRow[] = [];
  for (const row of sessions) {
    if (!row?.id || have.has(row.id) || !isPrimeSlug(row.employee_slug)) continue;
    const last = activity.get(row.id);
    if (!last) continue; // no messages → nothing to reopen
    have.add(row.id);
    extra.push({
      convo_id: row.id, conversation_id: row.id, title: primeConversationFallbackTitle(row, last), summary: null,
      tags: [], employees_involved: [PRIME_SESSION_SLUG], started_at: row.created_at ?? last, last_message_at: last, pinned: false,
    });
  }
  return [...summaries, ...extra];
}
