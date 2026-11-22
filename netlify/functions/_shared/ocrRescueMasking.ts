/**
 * C2-A2 — PII masking for "rescued" OCR text (SERVER-ONLY).
 *
 * smart-import-ocr-background can replace a corrupted, already-masked OCR result with text
 * rescued earlier from the raw PDF streams. Before C2-A2 that rescued text only went through
 * cleanupOcrText (unicode/whitespace cleanup) and was stored in user_documents.ocr_text and handed
 * to normalisation WITHOUT PII masking. This helper applies the same guardrail policy as the main
 * path:
 *  - guardrails mask the text; a PII-only block is allowed (redacted and continue);
 *  - any other block (moderation, jailbreak, ...) means the rescued text is NOT used;
 *  - if guardrails return empty text or throw, the regex PII masker is applied (fail closed);
 *  - if nothing usable remains, the caller keeps its existing (masked) text.
 * Never logs text.
 */

export type RescueGuardOutcome = {
  ok: boolean;
  text?: string | null;
  reasons?: string[] | null;
  signals?: { piiTypes?: string[] | null } | null;
};

export type RescueMaskDeps = {
  runGuard: (text: string) => Promise<RescueGuardOutcome>;
  fallbackMask: (text: string) => { masked: string; found: Array<{ type: string }> };
};

export type MaskedRescue = { text: string; piiTypes: string[] };

export async function maskRescuedOcrText(text: string, deps: RescueMaskDeps): Promise<MaskedRescue | null> {
  if (typeof text !== 'string' || text.trim().length === 0) return null;

  let outcome: RescueGuardOutcome | null = null;
  try {
    outcome = await deps.runGuard(text);
  } catch {
    outcome = null;
  }

  if (outcome && !outcome.ok) {
    const reasons = Array.isArray(outcome.reasons) ? outcome.reasons : [];
    const piiOnly = reasons.length > 0 && reasons.every((r) => String(r).includes('pii_blocked'));
    if (!piiOnly) return null;
  }

  const piiTypes = new Set<string>(outcome?.signals?.piiTypes || []);
  let masked = typeof outcome?.text === 'string' ? outcome.text : '';
  if (!masked.trim()) {
    const fallback = deps.fallbackMask(text);
    masked = fallback.masked || '';
    for (const f of fallback.found || []) piiTypes.add(f.type);
  }
  if (!masked.trim()) return null;
  return { text: masked, piiTypes: Array.from(piiTypes) };
}
