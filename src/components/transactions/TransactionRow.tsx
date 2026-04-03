/**
 * TransactionRow — bank-style feed row; category editing lives in the detail drawer.
 */

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { resolveMerchantAlias } from '../../lib/merchantAliases';
import { categoryDotClass } from '../../lib/transactionUi';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';

interface TransactionRowProps {
  transaction?: CommittedTransaction;
  pendingTransaction?: PendingTransaction;
  onClick: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  categories?: string[];
  onCategoryChange?: (txId: string, category: string) => void;
  showDate?: boolean;
  showActions?: boolean;
  isHighlighted?: boolean;
  /** Feed layout (default) vs legacy table (unused). */
  layout?: 'feed' | 'table';
  onAskTag?: () => void;
}

export function TransactionRow({
  transaction,
  pendingTransaction,
  onClick,
  onApprove,
  onReject,
  onEdit,
  showActions = true,
  isHighlighted = false,
  layout = 'feed',
  onAskTag,
}: TransactionRowProps) {
  const isPending = !!pendingTransaction;
  const isCommitted = !!transaction;

  const normalizeText = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (trimmed === 'null' || trimmed === 'undefined') return '';
    return trimmed;
  };

  const isGenericMerchantLabel = (value: string): boolean => {
    const normalized = value.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized) return true;
    const genericPatterns = [
      /^withdrawal$/, /^e-?transfer$/, /^transfer$/, /^payment$/,
      /^purchase$/, /^debit$/, /^credit$/, /^pos$/, /^atm$/,
      /^card$/, /^bank fee$/, /^fee$/, /^deposit$/, /^misc$/, /^other$/,
      /^description$/, /^merchant$/, /^memo$/, /^narration$/, /^particulars$/,
      /^payee$/, /^details$/, /^reference$/, /^transaction$/, /^type$/,
    ];
    if (genericPatterns.some((p) => p.test(normalized))) return true;
    if (/^date of (mailing|issue|posting|statement)\b/i.test(value)) return true;
    if (/^(account|statement|page|balance)\s+(number|no\.?|#|forward|brought)/i.test(value)) return true;
    return false;
  };

  const sanitizeMerchantFallback = (value: string): string =>
    value
      .replace(/\b(withdrawal|e-?transfer|debit|credit|purchase|payment|pos)\b[:\-\s]*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const looksLikeFileArtifact = (value: string): boolean => {
    const lower = value.toLowerCase().trim();
    return (
      /\.(jpe?g|png|webp|gif|pdf|heic|heif)$/i.test(lower) ||
      /\b(img|dsc|scan|screenshot|invoice|receipt)[-_ ]?\d{2,}/i.test(lower) ||
      /^invoice\s*[-_:]/i.test(lower)
    );
  };

  const toTitleCase = (value: string): string =>
    value
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const prettifyMerchant = (value: string): string => {
    if (!value) return 'Unknown merchant';
    const compact = value.replace(/[_\-]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    const hasLowercase = /[a-z]/.test(compact);
    const normalized = hasLowercase ? compact : toTitleCase(compact);
    return normalized;
  };

  const merchantEmoji = (merchant: string): string => {
    const m = merchant.toLowerCase();
    if (m.includes('apple')) return '🍎';
    if (m.includes('amazon')) return '📦';
    if (m.includes('uber') || m.includes('lyft')) return '🚗';
    if (m.includes('tim hortons') || m.includes('starbucks') || m.includes('coffee') || m.includes('cafe')) return '☕';
    if (m.includes('walmart') || m.includes('costco') || m.includes('grocery') || m.includes('supermarket')) return '🛒';
    if (m.includes('shell') || m.includes('esso') || m.includes('petro') || m.includes('gas')) return '⛽';
    return '';
  };

  const committedMerchant = normalizeText(transaction?.merchant_name);
  const committedDescription = normalizeText((transaction as Record<string, unknown>)?.description);
  const committedMemo = normalizeText((transaction as Record<string, unknown>)?.memo);
  const committedMerchantAlt = normalizeText((transaction as Record<string, unknown>)?.merchant);
  const pendingMerchant = normalizeText(pendingTransaction?.data_json?.merchant);
  const pendingDescription = normalizeText((pendingTransaction?.data_json as Record<string, unknown>)?.description);

  const merchantCandidate = isPending ? pendingMerchant : committedMerchant || committedMerchantAlt;
  const merchantFallback = isPending ? pendingDescription : committedDescription || committedMemo;
  const merchantResolved = (() => {
    if (merchantCandidate && !isGenericMerchantLabel(merchantCandidate)) return merchantCandidate;
    const cleaned = sanitizeMerchantFallback(merchantFallback);
    if (cleaned && !isGenericMerchantLabel(cleaned)) return cleaned;
    return merchantCandidate || 'Unknown merchant';
  })();
  const aliasMatch =
    resolveMerchantAlias(merchantCandidate) ||
    resolveMerchantAlias(merchantFallback) ||
    resolveMerchantAlias(committedDescription) ||
    resolveMerchantAlias(committedMemo) ||
    resolveMerchantAlias(pendingDescription);

  const pendingItems = Array.isArray((pendingTransaction?.data_json as Record<string, unknown>)?.items)
    ? ((pendingTransaction?.data_json as Record<string, unknown>).items as Array<{ name?: string }>)
    : [];
  const candidateItemHint = normalizeText(pendingItems[0]?.name) || merchantFallback;
  const cleanedItemHint = candidateItemHint
    .replace(/^invoice\s*[-:]\s*/i, '')
    .replace(/\.(jpe?g|png|webp|gif|pdf|heic|heif)$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const showItemHint =
    Boolean(cleanedItemHint) &&
    !looksLikeFileArtifact(cleanedItemHint) &&
    cleanedItemHint.toLowerCase() !== merchantResolved.toLowerCase() &&
    !isGenericMerchantLabel(cleanedItemHint);
  const merchantTitle = aliasMatch?.label || prettifyMerchant(merchantResolved);
  const icon = merchantEmoji(merchantTitle);

  const renderMerchantDisplay = () => {
    const t = merchantTitle;
    if (t.toLowerCase().includes('7-eleven')) {
      const parts = t.split(/(7-eleven)/i);
      return (
        <>
          {parts.map((part, i) =>
            part.toLowerCase() === '7-eleven' ? (
              <strong key={i} className="font-extrabold tracking-tight text-white">
                {part}
              </strong>
            ) : (
              part
            )
          )}
        </>
      );
    }
    return t;
  };

  const merchantSubtext = showItemHint ? cleanedItemHint : aliasMatch?.itemHint || '';

  const amount = isPending ? pendingTransaction.data_json.amount ?? 0 : transaction?.amount ?? 0;
  const pendingCategory = isPending
    ? pendingTransaction.tag_category || (pendingTransaction.data_json as { category?: string }).category
    : undefined;
  const displayCategory = isCommitted
    ? transaction?.category || 'Uncategorized'
    : pendingCategory || 'Uncategorized';
  const displaySubcategory = isCommitted ? transaction?.subcategory : undefined;

  const INCOME_PATTERNS_TR = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;
  const txMerchantUpper = String(
    isPending ? pendingTransaction.data_json?.merchant || '' : transaction?.merchant || transaction?.merchant_name || ''
  )
    .toUpperCase()
    .trim();
  const txType = String(isPending ? '' : (transaction as Record<string, unknown>)?.type || '').toLowerCase();
  const txCategoryLower = String(displayCategory || '').toLowerCase();
  const isIncomeTx =
    txType === 'income' || txCategoryLower === 'income' || INCOME_PATTERNS_TR.test(txMerchantUpper);
  const numAmount = Number(amount);
  // Do NOT use amount sign — expenses are stored as negative values
  const isCredit = isIncomeTx;
  const amountPrefix = isCredit ? '+' : '−';
  const amountClass = isCredit ? 'text-emerald-500' : 'text-red-500';
  const safeAmount = Number.isFinite(numAmount) ? Math.abs(numAmount) : 0;
  const amountStr = safeAmount.toFixed(2);

  const tagConf =
    isPending && pendingTransaction.tag_confidence != null
      ? Number(pendingTransaction.tag_confidence)
      : isCommitted
        ? Number((transaction as Record<string, unknown>)?.tag_confidence)
        : NaN;
  const showLowConfidenceHint = Number.isFinite(tagConf) && tagConf < 0.75;

  const isUncategorized =
    !displayCategory || String(displayCategory).trim() === '' || String(displayCategory).trim() === 'Uncategorized';
  const dotClass = categoryDotClass(isUncategorized ? 'Uncategorized' : displayCategory);

  if (layout === 'table') {
    return (
      <div
        className="px-4 py-2 text-sm text-slate-500 border-b border-slate-800"
        onClick={onClick}
      >
        Legacy table layout removed — use layout=&quot;feed&quot;.
      </div>
    );
  }

  const rowId = transaction?.id || pendingTransaction?.id || '';

  return (
    <div
      id={rowId ? `tx-row-${rowId}` : undefined}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative flex cursor-pointer items-center gap-4 border-b border-white/5 px-1 py-4 transition-all duration-200 ease-out hover:scale-[1.01] hover:bg-white/[0.05] ${
        isHighlighted ? 'bg-amber-500/[0.08] ring-1 ring-amber-400/30 ring-inset' : ''
      }`}
    >
      <div
        className={`relative flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full ${dotClass} text-lg shadow-inner`}
        aria-hidden
      >
        {isUncategorized ? (
          <span
            className="pointer-events-none absolute bottom-0 right-0 flex h-4 min-w-[1rem] items-center justify-center rounded-full border border-slate-500/80 bg-slate-900/95 px-0.5 text-[10px] font-bold leading-none text-slate-200"
            title="Uncategorized"
          >
            ?
          </span>
        ) : null}
        <span className="relative z-[1]">{icon || '\u00A0'}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold leading-tight text-slate-100 truncate">{renderMerchantDisplay()}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[14px] text-slate-500 truncate max-w-full">
            {displayCategory}{displaySubcategory ? <span className="text-slate-600"> · {displaySubcategory}</span> : null}
          </span>
          {showLowConfidenceHint ? (
            <span title="Tag assigned this category with lower confidence" className="inline-flex text-amber-400">
              <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
          ) : null}
        </div>
        {merchantSubtext ? (
          <div className="mt-0.5 text-xs text-slate-600 truncate">{merchantSubtext}</div>
        ) : null}
        {isPending && isUncategorized ? (
          <div className="mt-1.5 text-[13px] font-medium text-amber-400/95">Needs category</div>
        ) : null}
        {isPending && showActions && (onApprove || onReject) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {onApprove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove();
                }}
                className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200"
              >
                Approve
              </button>
            )}
            {onReject && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject();
                }}
                className="rounded-md border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-xs text-red-200"
              >
                Reject
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex min-w-[110px] shrink-0 flex-col items-end gap-1 pl-2 text-right">
        <div className={`whitespace-nowrap text-[18px] font-bold tabular-nums leading-none tracking-tight ${amountClass}`}>
          {amountPrefix}${amountStr}
        </div>
        {onAskTag && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAskTag();
            }}
            className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-200 transition-opacity"
          >
            Ask Tag
          </button>
        )}
        {showActions && onEdit && !isPending && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="opacity-0 group-hover:opacity-100 text-[11px] text-slate-500 hover:text-slate-300 transition-opacity"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
