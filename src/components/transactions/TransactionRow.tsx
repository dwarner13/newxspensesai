/**
 * TransactionRow Component
 *
 * Individual transaction row with inline category editing.
 * Clicking the category badge opens a fixed-position dropdown with search.
 * Saves directly to the transactions table with optimistic update.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfidenceBar } from './ConfidenceBar';
import { getSupabase } from '../../lib/supabase';
import { createCategoryRule } from '../../lib/categoryRules';
import { useAuth } from '../../contexts/AuthContext';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';

// Fallback list used if DB categories haven't loaded yet
const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Utilities',
  'Travel',
  'Income',
  'Business',
  'Education',
  'Home & Garden',
  'Personal Care',
  'Subscriptions',
  'Bank Fees',
  'Transfers',
  'Other',
];

interface TransactionRowProps {
  transaction?: CommittedTransaction;
  pendingTransaction?: PendingTransaction;
  onClick: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  categories?: string[];
  onCategoryChange?: (txId: string, category: string) => void;
}

export function TransactionRow({
  transaction,
  pendingTransaction,
  onClick,
  onApprove,
  onReject,
  onEdit,
  categories,
  onCategoryChange,
}: TransactionRowProps) {
  const isPending = !!pendingTransaction;
  const isCommitted = !!transaction;
  const { userId } = useAuth();

  const normalizeText = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim();
  };

  const isGenericMerchantLabel = (value: string): boolean => {
    const normalized = value.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized) return true;
    // Transaction-type words that carry no merchant information
    const genericPatterns = [
      /^withdrawal$/, /^e-?transfer$/, /^transfer$/, /^payment$/,
      /^purchase$/, /^debit$/, /^credit$/, /^pos$/, /^atm$/,
      /^card$/, /^bank fee$/, /^fee$/, /^deposit$/, /^misc$/, /^other$/,
      // OCR column headers stored as merchant names
      /^description$/, /^merchant$/, /^memo$/, /^narration$/, /^particulars$/,
      /^payee$/, /^details$/, /^reference$/, /^transaction$/, /^type$/,
    ];
    if (genericPatterns.some((p) => p.test(normalized))) return true;
    // OCR letter/document header artifacts (e.g. "DATE OF MAILING: …")
    if (/^date of (mailing|issue|posting|statement)\b/i.test(value)) return true;
    if (/^(account|statement|page|balance)\s+(number|no\.?|#|forward|brought)/i.test(value)) return true;
    return false;
  };

  const sanitizeMerchantFallback = (value: string): string =>
    value
      .replace(/\b(withdrawal|e-?transfer|debit|credit|purchase|payment|pos)\b[:\-\s]*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

  // ── Display data ─────────────────────────────────────────────────────────
  const date = isPending ? pendingTransaction.data_json.date : transaction?.posted_at;
  const committedMerchant = normalizeText(transaction?.merchant_name);
  const committedDescription = normalizeText((transaction as any)?.description);
  const committedMemo = normalizeText((transaction as any)?.memo);
  const committedMerchantAlt = normalizeText((transaction as any)?.merchant);
  const pendingMerchant = normalizeText(pendingTransaction?.data_json?.merchant);
  const pendingDescription = normalizeText((pendingTransaction?.data_json as any)?.description);

  const merchantCandidate = isPending ? pendingMerchant : committedMerchant || committedMerchantAlt;
  const merchantFallback = isPending ? pendingDescription : committedDescription || committedMemo;
  const merchantResolved = (() => {
    if (merchantCandidate && !isGenericMerchantLabel(merchantCandidate)) return merchantCandidate;
    const cleaned = sanitizeMerchantFallback(merchantFallback);
    if (cleaned && !isGenericMerchantLabel(cleaned)) return cleaned;
    return merchantCandidate || 'Unknown merchant';
  })();

  const amount = isPending ? pendingTransaction.data_json.amount ?? 0 : transaction?.amount ?? 0;
  const pendingCategory = isPending
    ? (pendingTransaction.tag_category || (pendingTransaction.data_json as { category?: string }).category)
    : undefined;
  const rawCategory = isCommitted ? transaction?.category : pendingCategory;

  // ── Category editing state ────────────────────────────────────────────────
  const [localCategory, setLocalCategory] = useState<string | undefined>(rawCategory);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Keep localCategory in sync when the row's source data changes
  useEffect(() => {
    setLocalCategory(rawCategory);
  }, [rawCategory]);

  const categoryList = categories?.length ? categories : DEFAULT_CATEGORIES;
  const filteredCategories = search
    ? categoryList.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : categoryList;

  const openDropdown = useCallback(
    (e: React.MouseEvent) => {
      if (!isCommitted) return; // pending editing not supported yet
      e.stopPropagation();
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(200, rect.width),
      });
      setSearch('');
      setIsDropdownOpen(true);
    },
    [isCommitted]
  );

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
    setDropdownRect(null);
  }, []);

  // Close on click-outside and scroll
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };
    const handleScroll = () => closeDropdown();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDropdown();
    };
    document.addEventListener('mousedown', handleOutside, true);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('keydown', handleKey);
    // Focus search box
    setTimeout(() => searchRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('mousedown', handleOutside, true);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isDropdownOpen, closeDropdown]);

  const handleSelectCategory = useCallback(
    async (cat: string) => {
      if (!transaction?.id) return;
      const prev = localCategory;
      setLocalCategory(cat); // optimistic
      closeDropdown();
      setIsSaving(true);
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not available');
        const { error } = await supabase
          .from('transactions')
          .update({ category: cat, category_source: 'manual', updated_at: new Date().toISOString() })
          .eq('id', transaction.id);
        if (error) throw error;
        onCategoryChange?.(transaction.id, cat);

        // Show rule-creation prompt for meaningful merchant names
        const merchant = merchantResolved;
        const isGeneric = !merchant || merchant === 'Unknown merchant' || isGenericMerchantLabel(merchant);
        if (!isGeneric && userId) {
          toast.custom(
            (t) => (
              <div
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border border-violet-500/30 bg-slate-900 shadow-xl max-w-sm transition-opacity ${
                  t.visible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Sparkles className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-100">
                    Always tag &ldquo;{merchant}&rdquo; as {cat}?
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Create a rule to auto-categorize future imports
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={async () => {
                        toast.dismiss(t.id);
                        const result = await createCategoryRule(userId, merchant, cat, 'contains');
                        if (result.ok) toast.success('Rule created');
                        else toast.error('Failed to create rule');
                      }}
                      className="px-2.5 py-1 text-xs rounded-md bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 font-medium transition-colors"
                    >
                      Yes, create rule
                    </button>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="px-2 py-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            ),
            { duration: 10000, position: 'bottom-right' }
          );
        } else {
          toast.success(`Category updated to ${cat}`, { duration: 1800 });
        }
      } catch (err: any) {
        setLocalCategory(prev); // revert
        toast.error(`Failed to save: ${err?.message || 'unknown error'}`);
      } finally {
        setIsSaving(false);
      }
    },
    [transaction?.id, localCategory, closeDropdown, onCategoryChange, merchantResolved, userId]
  );

  // ── Status badge ─────────────────────────────────────────────────────────
  let statusBadge: React.ReactNode = null;
  if (isPending) {
    const confidence = pendingTransaction.confidence.overall;
    if (pendingTransaction.possibleDuplicate) {
      statusBadge = (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 whitespace-nowrap">
          Dupe
        </span>
      );
    } else if (confidence >= 0.75) {
      statusBadge = (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 whitespace-nowrap">
          Pending
        </span>
      );
    } else {
      statusBadge = (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 whitespace-nowrap">
          Review
        </span>
      );
    }
  } else if (isCommitted) {
    const hasCategory = !!(localCategory && localCategory !== 'Uncategorized');
    statusBadge = hasCategory ? (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 whitespace-nowrap">
        Tagged
      </span>
    ) : (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 whitespace-nowrap">
        Untagged
      </span>
    );
  }

  const isExpense = amount < 0;
  const amountColor = isExpense ? 'text-red-400' : 'text-emerald-400';
  const amountDisplay = Math.abs(amount).toFixed(2);

  // ── Category dropdown (portal) ────────────────────────────────────────────
  const dropdown =
    isDropdownOpen && dropdownRect
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search */}
            <div className="border-b border-slate-800 p-2">
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>
            {/* Category list */}
            <ul className="max-h-56 overflow-y-auto py-1">
              {filteredCategories.length === 0 ? (
                <li className="px-3 py-2 text-xs text-slate-500">No categories match</li>
              ) : (
                filteredCategories.map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors text-left"
                      onClick={() => { void handleSelectCategory(cat); }}
                    >
                      <span className="flex-1">{cat}</span>
                      {localCategory === cat && (
                        <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className="grid grid-cols-[88px_minmax(180px,1.4fr)_120px_minmax(150px,1fr)_130px_auto] gap-2 items-center px-4 py-3 bg-slate-900/50 border-b border-slate-800 hover:bg-slate-900 transition-colors cursor-pointer group"
        onClick={onClick}
      >
        {/* Date */}
        <div className="text-xs text-slate-400">
          {date
            ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '—'}
        </div>

        {/* Merchant */}
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-100 truncate" title={merchantResolved}>
            {merchantResolved}
          </div>
          {isPending && (
            <ConfidenceBar score={pendingTransaction.confidence.overall} showPercentage={false} />
          )}
        </div>

        {/* Amount */}
        <div className={`text-sm font-semibold ${amountColor} text-right`}>
          {isExpense ? '-' : '+'}${amountDisplay}
        </div>

        {/* Category — clickable for committed transactions */}
        <div className="text-xs text-slate-300 min-w-0">
          {isCommitted ? (
            <div
              ref={triggerRef}
              role="button"
              tabIndex={0}
              onClick={openDropdown}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDropdown(e as any); }}
              className="inline-flex items-center gap-1 max-w-full cursor-pointer rounded px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors group/cat"
              title="Click to change category"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin text-slate-400 shrink-0" />
              ) : null}
              <span className="truncate max-w-[130px]">
                {localCategory || <span className="text-slate-500 italic">Uncategorized</span>}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0 text-slate-500 group-hover/cat:text-slate-300 transition-colors" />
            </div>
          ) : localCategory ? (
            <span
              className="inline-flex items-center gap-1 max-w-[160px] px-2 py-0.5 rounded bg-slate-800 text-slate-200"
              title={localCategory}
            >
              <span className="truncate">{localCategory}</span>
              {isPending && pendingTransaction?.tag_rule_source && (
                <span
                  className={`shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1 rounded ${
                    pendingTransaction.tag_rule_source === 'vendor_memory'
                      ? 'text-emerald-400'
                      : pendingTransaction.tag_rule_source === 'rules'
                      ? 'text-sky-400'
                      : 'text-violet-400'
                  }`}
                  title={`Source: ${pendingTransaction.tag_rule_source}`}
                >
                  {pendingTransaction.tag_rule_source === 'vendor_memory'
                    ? 'mem'
                    : pendingTransaction.tag_rule_source === 'rules'
                    ? 'rule'
                    : 'ai'}
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center">{statusBadge}</div>

        {/* Hover actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isPending && onApprove && (
            <button
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
              className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
            >
              Approve
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
            >
              Edit
            </button>
          )}
          {isPending && onReject && (
            <button
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
            >
              Reject
            </button>
          )}
        </div>
      </div>

      {dropdown}
    </>
  );
}
