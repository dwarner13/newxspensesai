/**
 * Honest non-figure states for every financial screen (owner: honest unavailable, partial and
 * no-data states). One wording set, matching the fst2 contract's status table.
 */
import type { AggregateState } from '@/hooks/useFinancialSummary';

export const FINANCIAL_STATE_TEXT = {
  loading: 'Loading your figures…',
  partial: "Couldn't read every transaction, so no figures are shown. Please try again.",
  no_data: 'No statements imported yet. Upload a statement to see your figures.',
  verified_zero: 'No transactions in this period.',
  unavailable: "Figures couldn't be loaded; nothing was guessed. Please try again.",
  signed_out: 'Your sign-in has expired. Please sign in again to see your figures.',
} as const;

/** True when the state carries figures that may be shown. */
export function hasFigures(s: AggregateState): s is Extract<AggregateState, { status: 'verified' | 'verified_zero' }> {
  return s.status === 'verified' || s.status === 'verified_zero';
}

export function FinancialStateNotice({ state, onRetry, compact = false }: { state: AggregateState; onRetry?: () => void; compact?: boolean }) {
  if (state.status === 'verified') return null;
  const text = FINANCIAL_STATE_TEXT[state.status];
  const warn = state.status === 'partial' || state.status === 'unavailable' || state.status === 'signed_out';
  return (
    <div role="status" data-testid={`financial-state-${state.status}`}
      style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
        padding: compact ? '8px 12px' : '12px 16px', borderRadius: 12, fontSize: 14, lineHeight: 1.5,
        ...(warn
          ? { background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.35)', color: '#fde68a' }
          : { background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.2)', color: '#cbd5e1' }),
      }}>
      <span style={{ flex: 1, minWidth: 0 }}>{text}</span>
      {onRetry && (state.status === 'partial' || state.status === 'unavailable') && (
        <button type="button" onClick={onRetry}
          style={{ minHeight: 40, padding: '0 14px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'transparent', border: '1px solid rgba(251,191,36,0.45)', color: '#fcd34d', cursor: 'pointer' }}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Money formatting only (no arithmetic): the server's amount in the scope currency. */
export function formatMoney(amount: number, currency = 'CAD'): string {
  const abs = Math.abs(amount).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = amount < 0 ? '−' : '';
  return `${sign}${currency === 'CAD' ? 'CA$' : currency === 'USD' ? 'US$' : ''}${abs}`;
}
