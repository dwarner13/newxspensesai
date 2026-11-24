/**
 * P-1 — the single preferred-name rule, shared by the server (chat.ts getUserProfile → Prime) and
 * the client greeting, so the greeting and Prime's replies always agree. Pure; no I/O.
 *
 * Chain: profiles.display_name → first_name → full_name → auth user_metadata.full_name → name.
 * Never the email address, never a client-sent page context. Blank, whitespace or the legacy
 * placeholder "there" counts as no name. Values that look like an email are rejected.
 */

export type PreferredNameSource =
  | 'display_name' | 'first_name' | 'full_name' | 'metadata_full_name' | 'metadata_name' | 'none';

export interface PreferredName {
  /** Display form, each word capitalized ("darrell warner" → "Darrell Warner"); null when none. */
  fullName: string | null;
  /** First word of fullName — what Prime and the greeting address the customer by; null when none. */
  firstName: string | null;
  source: PreferredNameSource;
}

type Profileish = { display_name?: unknown; first_name?: unknown; full_name?: unknown } | null | undefined;
type Metaish = { full_name?: unknown; name?: unknown } | null | undefined;

function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  if (!t || t.toLowerCase() === 'there' || t.includes('@')) return null;
  return t.slice(0, 80);
}

const capitalizeWords = (s: string) => s.split(' ').map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');

export function resolvePreferredName(profile: Profileish, metadata?: Metaish): PreferredName {
  const chain: Array<[unknown, PreferredNameSource]> = [
    [profile?.display_name, 'display_name'],
    [profile?.first_name, 'first_name'],
    [profile?.full_name, 'full_name'],
    [metadata?.full_name, 'metadata_full_name'],
    [metadata?.name, 'metadata_name'],
  ];
  for (const [value, source] of chain) {
    const c = clean(value);
    if (c) {
      const fullName = capitalizeWords(c);
      return { fullName, firstName: fullName.split(' ')[0] || fullName, source };
    }
  }
  return { fullName: null, firstName: null, source: 'none' };
}
