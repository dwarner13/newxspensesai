import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Action Receipt types — deterministic rendering of confirmed tool results.
// No LLM call, no search, no AI. Pure UI over verified action output.
// ---------------------------------------------------------------------------

export interface CategoryUpdateReceipt {
  type: 'action_receipt';
  action: 'transaction_category_updated';
  success: true;
  transactionId: string;
  merchantName: string | null;
  date: string | null;
  amount: number | null;
  oldCategory: string;
  newCategory: string;
  subcategory?: string | null;
}

export interface ActionFailureReceipt {
  type: 'action_receipt';
  action: string;
  success: false;
  merchantName?: string | null;
  message?: string;
}

export type ActionReceipt = CategoryUpdateReceipt | ActionFailureReceipt;

/**
 * Try to parse a toolConfirmationResult into a structured ActionReceipt.
 * Returns null if the result doesn't match a known action shape.
 */
export function parseActionReceipt(
  toolConfirmationResult: { tool: string; result: unknown; success: boolean } | undefined,
): ActionReceipt | null {
  if (!toolConfirmationResult) return null;

  const { tool, result, success } = toolConfirmationResult;

  if (tool !== 'tag_update_transaction_category') return null;

  const r = result as Record<string, unknown> | null | undefined;
  if (!r || typeof r !== 'object') return null;

  if (!success || r.success !== true) {
    return {
      type: 'action_receipt',
      action: tool,
      success: false,
      merchantName: typeof r.merchantName === 'string' ? r.merchantName : null,
      message: typeof r.message === 'string' ? r.message : undefined,
    };
  }

  return {
    type: 'action_receipt',
    action: 'transaction_category_updated',
    success: true,
    transactionId: String(r.transactionId || ''),
    merchantName: typeof r.merchantName === 'string' ? r.merchantName : null,
    date: typeof r.date === 'string' ? r.date : null,
    amount: typeof r.amount === 'number' ? r.amount : null,
    oldCategory: typeof r.oldCategory === 'string' ? r.oldCategory : 'Unknown',
    newCategory: typeof r.newCategory === 'string' ? r.newCategory : 'Unknown',
    subcategory: typeof r.subcategory === 'string' ? r.subcategory : null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  return `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Success Card
// ---------------------------------------------------------------------------

function SuccessReceiptCard({ receipt }: { receipt: CategoryUpdateReceipt }) {
  const navigate = useNavigate();

  const handleViewTransaction = useCallback(() => {
    navigate(`/dashboard/transactions?txId=${encodeURIComponent(receipt.transactionId)}`);
  }, [navigate, receipt.transactionId]);

  const details: string[] = [];
  if (receipt.date) details.push(formatDate(receipt.date));
  if (receipt.amount != null) details.push(formatAmount(receipt.amount));
  const detailLine = details.join(' \u00B7 ');

  const categoryLabel = receipt.subcategory
    ? `${receipt.newCategory} \u203A ${receipt.subcategory}`
    : receipt.newCategory;

  return (
    <div
      data-testid="action-receipt-card"
      role="status"
      aria-label="Category updated successfully"
      style={{
        margin: '8px 0',
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid rgba(52, 211, 153, 0.25)',
        background: 'rgba(16, 185, 129, 0.06)',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'rgba(52, 211, 153, 0.15)',
            fontSize: 13,
            flexShrink: 0,
          }}
          aria-hidden
        >
          &#x2713;
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#6ee7b7',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Category Updated
        </span>
      </div>

      {/* Merchant */}
      {receipt.merchantName && (
        <div
          data-testid="receipt-merchant"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#e2e8f0',
            marginBottom: 2,
            wordBreak: 'break-word',
          }}
        >
          {receipt.merchantName}
        </div>
      )}

      {/* Date + Amount */}
      {detailLine && (
        <div
          data-testid="receipt-details"
          style={{
            fontSize: 13,
            color: '#94a3b8',
            marginBottom: 10,
          }}
        >
          {detailLine}
        </div>
      )}

      {/* Category change */}
      <div
        data-testid="receipt-category-change"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: '#94a3b8',
            padding: '3px 10px',
            borderRadius: 6,
            background: 'rgba(148, 163, 184, 0.1)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            wordBreak: 'break-word',
          }}
        >
          {receipt.oldCategory}
        </span>
        <span style={{ fontSize: 13, color: '#64748b' }} aria-label="changed to">
          &rarr;
        </span>
        <span
          style={{
            fontSize: 13,
            color: '#6ee7b7',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 6,
            background: 'rgba(52, 211, 153, 0.1)',
            border: '1px solid rgba(52, 211, 153, 0.2)',
            wordBreak: 'break-word',
          }}
        >
          {categoryLabel}
        </span>
      </div>

      {/* View Transaction */}
      <button
        type="button"
        data-testid="receipt-view-transaction"
        onClick={handleViewTransaction}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: '#94a3b8',
          background: 'rgba(148, 163, 184, 0.08)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: 8,
          padding: '6px 14px',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(148, 163, 184, 0.15)';
          e.currentTarget.style.color = '#e2e8f0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(148, 163, 184, 0.08)';
          e.currentTarget.style.color = '#94a3b8';
        }}
      >
        View Transaction
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Failure Card
// ---------------------------------------------------------------------------

function FailureReceiptCard({ receipt }: { receipt: ActionFailureReceipt }) {
  const merchantDisplay = receipt.merchantName || 'The transaction';

  return (
    <div
      data-testid="action-receipt-failure"
      role="alert"
      aria-label="Action failed"
      style={{
        margin: '8px 0',
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid rgba(239, 68, 68, 0.25)',
        background: 'rgba(239, 68, 68, 0.06)',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            fontSize: 13,
            color: '#fca5a5',
            flexShrink: 0,
          }}
          aria-hidden
        >
          &#x2717;
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#fca5a5',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Couldn't Update Category
        </span>
      </div>
      <div
        style={{
          fontSize: 14,
          color: '#cbd5e1',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}
      >
        {merchantDisplay} was not changed.
        {receipt.message && (
          <span style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            {receipt.message}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported Card — dispatches based on success/failure
// ---------------------------------------------------------------------------

export function ActionReceiptCard({ receipt }: { receipt: ActionReceipt }) {
  if (receipt.success) {
    return <SuccessReceiptCard receipt={receipt as CategoryUpdateReceipt} />;
  }
  return <FailureReceiptCard receipt={receipt as ActionFailureReceipt} />;
}
