/**
 * L-A — "Prime checked with Tag" collaboration marker (owner GO).
 *
 * Shown only for consultation events the server actually recorded
 * (msg.meta.specialistConsultations, built by buildTagConsultationEvent from a tag_status
 * result that executed). Nothing is synthesized: no field, no marker. Reusable for future
 * specialists by adding them to SPECIALISTS once their consultation events exist.
 */

export interface SpecialistInfo {
  name: string;
  letter: string;
  color: string;
}

/** Specialists whose consultation events the server can emit today. */
export const SPECIALISTS: Readonly<Record<string, SpecialistInfo>> = {
  tag: { name: 'Tag', letter: 'T', color: '#22d3ee' },
};

export const SCOPE_LABEL_MAX = 60;

export interface ConsultationView {
  key: string;
  specialist: SpecialistInfo;
  scopeLabel: string;
  /** false when the consultation ran but could not complete (status 'query_error'). */
  completed: boolean;
  text: string;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Validated markers for one message. Returns [] unless the message is from the assistant
 * and every field checks out (known specialist, readOnly === true, string scope).
 */
export function parseSpecialistConsultations(meta: unknown, role: string | undefined): ConsultationView[] {
  if (role !== 'assistant' || !meta || typeof meta !== 'object') return [];
  const raw = (meta as { specialistConsultations?: unknown }).specialistConsultations;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: ConsultationView[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const ev = item as Record<string, unknown>;
    const specialist = typeof ev.employee === 'string' ? SPECIALISTS[ev.employee] : undefined;
    if (!specialist || ev.readOnly !== true || typeof ev.tool !== 'string') continue;
    const scope = typeof ev.scopeLabel === 'string' ? truncate(ev.scopeLabel.replace(/\s+/g, ' ').trim(), SCOPE_LABEL_MAX) : '';
    const completed = ev.status !== 'query_error';
    const key = `${ev.employee}|${ev.tool}|${scope}|${completed}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const text = completed
      ? `Prime checked with ${specialist.name}${scope ? ` · ${scope}` : ''}`
      : `Prime asked ${specialist.name}, but the check didn't complete`;
    out.push({ key, specialist, scopeLabel: scope, completed, text });
  }
  return out;
}
