/**
 * TransactionRow Component
 * 
 * Individual transaction row in the list
 */

import React, { useState } from 'react';
import { ConfidenceBar } from './ConfidenceBar';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';

interface TransactionRowProps {
  transaction?: CommittedTransaction;
  pendingTransaction?: PendingTransaction;
  onClick: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
}

export function TransactionRow({
  transaction,
  pendingTransaction,
  onClick,
  onApprove,
  onReject,
  onEdit,
}: TransactionRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const normalizeText = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim();
  };

  const isGenericMerchantLabel = (value: string): boolean => {
    const normalized = value.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized) return true;
    const genericPatterns = [
      /^withdrawal$/,
      /^e-?transfer$/,
      /^transfer$/,
      /^payment$/,
      /^purchase$/,
      /^debit$/,
      /^credit$/,
      /^pos$/,
      /^atm$/,
      /^card$/,
      /^bank fee$/,
      /^fee$/,
      /^deposit$/,
      /^misc$/,
      /^other$/,
    ];
    return genericPatterns.some((pattern) => pattern.test(normalized));
  };

  const sanitizeMerchantFallback = (value: string): string => {
    // Remove common bank-feed prefixes so merchant names are easier to read.
    return value
      .replace(/\b(withdrawal|e-?transfer|debit|credit|purchase|payment|pos)\b[:\-\s]*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const isPending = !!pendingTransaction;
  const isCommitted = !!transaction;

  // Determine status
  let statusBadge: React.ReactNode = null;
  let statusColor = 'text-slate-400';

  if (isPending) {
    const confidence = pendingTransaction.confidence.overall;
    if (confidence >= 0.9) {
      statusBadge = <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 whitespace-nowrap">Pending</span>;
      statusColor = 'text-emerald-400';
    } else if (confidence >= 0.75) {
      statusBadge = <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 whitespace-nowrap">Pending</span>;
      statusColor = 'text-amber-400';
    } else {
      statusBadge = <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 whitespace-nowrap">Needs review</span>;
      statusColor = 'text-red-400';
    }

    if (pendingTransaction.possibleDuplicate) {
      statusBadge = (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 whitespace-nowrap">
          Duplicate
        </span>
      );
    }
  } else if (isCommitted) {
    statusBadge = <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-200 whitespace-nowrap">Reviewed</span>;
  }

  // Get display data
  const date = isPending
    ? pendingTransaction.data_json.date
    : transaction?.posted_at;
  const committedMerchant = normalizeText(transaction?.merchant_name);
  const committedDescription = normalizeText((transaction as any)?.description);
  const committedMemo = normalizeText((transaction as any)?.memo);
  const committedMerchantAlt = normalizeText((transaction as any)?.merchant);
  const pendingMerchant = normalizeText(pendingTransaction?.data_json?.merchant);
  const pendingDescription = normalizeText((pendingTransaction?.data_json as any)?.description);

  const merchantCandidate = isPending
    ? pendingMerchant
    : committedMerchant || committedMerchantAlt;
  const merchantFallback = isPending
    ? pendingDescription
    : committedDescription || committedMemo;
  const merchantResolved = (() => {
    if (merchantCandidate && !isGenericMerchantLabel(merchantCandidate)) {
      return merchantCandidate;
    }
    const cleanedFallback = sanitizeMerchantFallback(merchantFallback);
    if (cleanedFallback && !isGenericMerchantLabel(cleanedFallback)) {
      return cleanedFallback;
    }
    if (merchantCandidate) return merchantCandidate;
    return 'Unknown merchant';
  })();
  const amount = isPending
    ? pendingTransaction.data_json.amount ?? 0
    : transaction?.amount ?? 0;
  const pendingCategory = isPending ? (pendingTransaction.data_json as { category?: string }).category : undefined;
  const category = isCommitted ? transaction?.category : pendingCategory;

  const isExpense = amount < 0;
  const amountColor = isExpense ? 'text-red-400' : 'text-emerald-400';
  const amountDisplay = Math.abs(amount).toFixed(2);

  return (
    <div
      className="grid grid-cols-[88px_minmax(180px,1.4fr)_120px_minmax(150px,1fr)_130px_auto] gap-2 items-center px-4 py-3 bg-slate-900/50 border-b border-slate-800 hover:bg-slate-900 transition-colors cursor-pointer group"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Date */}
      <div className="text-xs text-slate-400">
        {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
      </div>

      {/* Merchant */}
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-100 truncate" title={merchantResolved}>{merchantResolved}</div>
        {isPending && (
          <ConfidenceBar
            score={pendingTransaction.confidence.overall}
            showPercentage={false}
          />
        )}
      </div>

      {/* Amount */}
      <div className={`text-sm font-semibold ${amountColor} text-right`}>
        {isExpense ? '-' : '+'}${amountDisplay}
      </div>

      {/* Category */}
      <div className="text-xs text-slate-300 min-w-0">
        {category ? (
          <span className="inline-block max-w-[160px] truncate px-2 py-0.5 rounded bg-slate-800 text-slate-200" title={category}>
            {category}
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center">
        {statusBadge}
      </div>

      {/* Actions (show on hover) */}
      {isHovered && isPending && (
        <div className="flex items-center gap-1">
          {onApprove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
              className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
            >
              Approve
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
            >
              Edit
            </button>
          )}
          {onReject && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReject();
              }}
              className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
            >
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}









