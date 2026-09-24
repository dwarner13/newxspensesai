/**
 * TransactionCandidateListCard — deterministic numbered transaction list.
 *
 * Renders the authoritative tx_resolution candidate frame IN ARRAY ORDER.
 * Ordinals are derived as index + 1, matching select_transaction resolution.
 *
 * This component owns identity-sensitive ordering. The model's prose does
 * not control which transaction is at which ordinal.
 */

export interface TxCandidate {
  ordinal: number;
  id: string;
  merchant: string | null;
  date: string | null;
  amount: number | null;
  category: string | null;
  subcategory: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '';
  const abs = Math.abs(amount);
  return `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function parseTxCandidates(
  meta: Record<string, unknown> | undefined,
): TxCandidate[] | null {
  if (!meta) return null;
  const raw = meta.txCandidates;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const candidates: TxCandidate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || !item.id) continue;
    candidates.push({
      ordinal: typeof item.ordinal === 'number' ? item.ordinal : candidates.length + 1,
      id: String(item.id),
      merchant: typeof item.merchant === 'string' ? item.merchant : null,
      date: typeof item.date === 'string' ? item.date : null,
      amount: typeof item.amount === 'number' ? item.amount : null,
      category: typeof item.category === 'string' ? item.category : null,
      subcategory: typeof item.subcategory === 'string' ? item.subcategory : null,
    });
  }
  return candidates.length > 0 ? candidates : null;
}

export function TransactionCandidateListCard({
  candidates,
}: {
  candidates: TxCandidate[];
}) {
  return (
    <div
      data-testid="tx-candidate-list-card"
      style={{
        margin: '8px 0',
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid rgba(148, 163, 184, 0.15)',
        background: 'rgba(148, 163, 184, 0.04)',
      }}
    >
      {candidates.map((tx) => (
        <div
          key={tx.id}
          data-testid={`tx-candidate-${tx.ordinal}`}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            padding: '6px 4px',
            borderBottom: tx.ordinal < candidates.length
              ? '1px solid rgba(148, 163, 184, 0.08)'
              : 'none',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#94a3b8',
              minWidth: 20,
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            {tx.ordinal}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              {tx.date && (
                <span style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }}>
                  {formatDate(tx.date)}
                </span>
              )}
              {tx.merchant && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#e2e8f0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tx.merchant}
                </span>
              )}
              {tx.amount !== null && (
                <span style={{ fontSize: 13, fontWeight: 500, color: '#cbd5e1', flexShrink: 0, marginLeft: 'auto' }}>
                  {formatAmount(tx.amount)}
                </span>
              )}
            </div>
            {(tx.category || tx.subcategory) && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                {tx.category}{tx.subcategory ? ` \u203A ${tx.subcategory}` : ''}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
