/**
 * C2-G1 — provenance for remembered user facts in AI prompts.
 *
 * Memory facts are things the user once said (extracted from chat), not verified financial
 * records. They used to be injected under "Known User Facts" as raw `fact:key=value` lines
 * with no date, so a two-month-old "retirement in 3 years" read like a current, verified
 * fact. This presents each one as user-stated, with the date it was saved when the stored
 * record has one ("date unknown" otherwise — dates are never invented). Stored records are
 * not changed.
 */

export const USER_STATED_FACTS_HEADING =
  '## Information the user previously shared — may be outdated or unverified (user-stated, not verified financial records)';

export const USER_STATED_FACTS_GUIDANCE =
  'Treat these as what the user told you on that date, not as current verified facts. When one matters to the answer, say so naturally ("you mentioned in September…") and confirm it if it may have changed.';

export type PresentableFact = { fact: string; created_at?: string | null };

/** "2026-09-14" for a valid timestamp, otherwise null. */
export function factDate(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** `fact:savings_balance=250000` → `savings balance: 250000`; other text is kept as-is. */
export function humanizeFact(raw: string): { text: string; kind: 'fact' | 'preference' | 'note' } {
  const s = String(raw || '').trim();
  const m = s.match(/^(fact|pref|preference|goal):\s*([a-z0-9_]+)\s*=\s*(.+)$/i);
  if (!m) return { text: s, kind: 'note' };
  const kind = /^pref/i.test(m[1]) ? 'preference' : 'fact';
  return { text: `${m[2].replace(/_/g, ' ')}: ${m[3].trim()}`, kind };
}

export function describeUserStatedFact(f: PresentableFact): string {
  const { text, kind } = humanizeFact(f.fact);
  const date = factDate(f.created_at);
  const when = date ? `shared ${date}` : 'date unknown';
  const label = kind === 'preference' ? 'stated preference' : 'user-stated';
  return `- ${text} (${label}, ${when})`;
}

/** The prompt block for remembered facts; empty string when there are none. */
export function formatUserStatedFacts(facts: PresentableFact[]): string {
  const lines = (facts ?? []).filter(f => f && String(f.fact || '').trim()).map(describeUserStatedFact);
  if (lines.length === 0) return '';
  return `${USER_STATED_FACTS_HEADING}\n${USER_STATED_FACTS_GUIDANCE}\n${lines.join('\n')}`;
}
