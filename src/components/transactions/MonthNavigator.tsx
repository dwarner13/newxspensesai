/**
 * MonthNavigator
 *
 * Horizontal scrollable chip strip for switching between uploaded statements.
 * First chip is "All Statements" (importId = null); subsequent chips are one per import.
 */

import { useEffect, useRef } from 'react';
import type { ImportListItem } from '../../hooks/useImportList';

interface MonthNavigatorProps {
  imports: ImportListItem[];
  currentImportId: string | null;
  onSelect: (id: string | null) => void;
}

export function MonthNavigator({ imports, currentImportId, onSelect }: MonthNavigatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

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
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2">
        <span className="text-[11px] text-slate-500">No statements uploaded yet</span>
      </div>
    );
  }

  const isAllActive = currentImportId === null;

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 px-4 py-2 scrollbar-none"
    >
      {/* All Statements chip */}
      <button
        type="button"
        ref={isAllActive ? activeRef : undefined}
        onClick={() => onSelect(null)}
        className={[
          'flex-shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
          isAllActive
            ? 'border-violet-500/60 bg-violet-500/15 text-violet-200'
            : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:text-slate-200',
        ].join(' ')}
      >
        All Statements
      </button>

      {imports.map((imp) => {
        const isActive = currentImportId === imp.id;
        return (
          <button
            key={imp.id}
            type="button"
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelect(imp.id)}
            title={`${imp.statementLabel} • ${imp.docName} • Uploaded ${formatLongDate(imp.created_at)}`}
            className={[
              'flex-shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
              isActive
                ? 'border-violet-500/60 bg-violet-500/15 text-violet-200'
                : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:text-slate-200',
            ].join(' ')}
          >
            <span className="truncate max-w-[260px] inline-block align-middle">
              {imp.statementLabel} · {imp.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
