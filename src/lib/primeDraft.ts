/**
 * UX-P2c — unsent Prime drafts, held in memory only.
 *
 * Keyed by `${userId}:${sessionId}` so a draft belongs to one user's one conversation.
 * Never written to any browser storage, never logged and never sent until the user
 * presses Send. Lost on reload by design. Drafts of any other user are dropped when the
 * signed-in user changes (logout / account switch).
 */
export type DraftMap = Readonly<Record<string, string>>;

export function draftKey(userId: string | null | undefined, sessionId: string | null | undefined): string | null {
  if (!userId || !sessionId) return null;
  return `${userId}:${sessionId}`;
}

export function readDraft(drafts: DraftMap, key: string | null): string {
  return key ? drafts[key] ?? '' : '';
}

/** Store (or, for empty text, remove) one draft. */
export function writeDraft(drafts: DraftMap, key: string | null, text: string): DraftMap {
  if (!key) return drafts;
  const next: Record<string, string> = { ...drafts };
  if (text) next[key] = text; else delete next[key];
  return next;
}

/** Keep only the current user's drafts; everything when no user is signed in is dropped. */
export function keepOnlyUser(drafts: DraftMap, userId: string | null | undefined): DraftMap {
  if (!userId) return Object.keys(drafts).length ? {} : drafts;
  const prefix = `${userId}:`;
  const keys = Object.keys(drafts);
  if (keys.every(k => k.startsWith(prefix))) return drafts;
  const next: Record<string, string> = {};
  for (const k of keys) if (k.startsWith(prefix)) next[k] = drafts[k];
  return next;
}
