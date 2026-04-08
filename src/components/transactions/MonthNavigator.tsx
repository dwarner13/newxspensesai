/**
 * MonthNavigator
 *
 * Horizontal scrollable chip strip for switching between uploaded statements.
 * First chip is "All Statements" (importId = null); subsequent chips are one per import.
 */

import { useEffect, useMemo, useRef } from 'react';
import type { ImportListItem } from '../../hooks/useImportList';
import { sanitizeIssuerPillLabel } from '../../lib/transactionUi';

interface MonthNavigatorProps {
  imports: ImportListItem[];
  currentImportId: string | null;
  onSelect: (id: string | null) => void;
}

function dedupeImportsByDisplay(imports: ImportListItem[]): ImportListItem[] {
  const seen = new Set<string>();
  const out: ImportListItem[] = [];
  for (const imp of imports) {
    const key = [
      sanitizeIssuerPillLabel(imp.statementLabel),
      sanitizeIssuerPillLabel(imp.label),
      imp.docName.trim().toLowerCase(),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(imp);
  }
  return out;
}

export function MonthNavigator({ imports, currentImportId, onSelect }: MonthNavigatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const uniqueImports = useMemo(() => dedupeImportsByDisplay(imports), [imports]);

  const formatLongDate = (raw: string) => {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw || 'Unknown date';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Scroll active chip into view whenever selection changes
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [currentImportId]);

  if (imports.length === 0) {
    return (
      <div className="flex items-center py-1">
        <span className="text-xs text-slate-500">No statements uploaded yet</span>
      </div>
    );
  }

  const isAllActive = currentImportId === null;

  const pillBase =
    'flex-shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all duration-200';

  return (
    <div
      ref={containerRef}
      className="scrollbar-none flex items-center gap-4 overflow-x-auto py-1"
    >
      <button
        type="button"
        ref={isAllActive ? activeRef : undefined}
        onClick={() => onSelect(null)}
        className={[
          pillBase,
          isAllActive
            ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]'
            : 'border-transparent bg-white/[0.03] text-slate-500 hover:bg-white/[0.06] hover:text-slate-300',
        ].join(' ')}
      >
        All statements
      </button>

      {uniqueImports.map((imp) => {
        const isActive = currentImportId === imp.id;
        return (
          <button
            key={imp.id}
            type="button"
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelect(imp.id)}
            title={`${sanitizeIssuerPillLabel(imp.statementLabel)} - ${imp.docName} - Uploaded ${formatLongDate(imp.created_at)}`}
            className={[
              pillBase,
              isActive
                ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]'
                : 'border-transparent bg-white/[0.03] text-slate-500 hover:bg-white/[0.06] hover:text-slate-300',
            ].join(' ')}
          >
            <span className="inline-block max-w-[220px] truncate align-middle">
              {sanitizeIssuerPillLabel(imp.statementLabel)} · {sanitizeIssuerPillLabel(imp.label)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
