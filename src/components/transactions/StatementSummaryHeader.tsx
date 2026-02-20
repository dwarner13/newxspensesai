import React from 'react';

interface StatementSummaryHeaderProps {
  statementTransactions: number;
  income: number;
  spending: number;
  net: number;
  pendingReview: number;
  uncategorized: number;
  formatMoney: (value: number) => string;
}

export function StatementSummaryHeader({
  statementTransactions,
  income,
  spending,
  net,
  pendingReview,
  uncategorized,
  formatMoney,
}: StatementSummaryHeaderProps) {
  const summaryItems = [
    { label: 'Transactions Count', value: String(statementTransactions), colorClass: 'text-slate-100' },
    { label: 'Income', value: formatMoney(income), colorClass: 'text-emerald-400' },
    { label: 'Spending', value: formatMoney(spending), colorClass: 'text-red-400' },
    { label: 'Net', value: formatMoney(net), colorClass: net >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Pending review', value: String(pendingReview), colorClass: 'text-amber-300' },
    { label: 'Uncategorized', value: String(uncategorized), colorClass: 'text-slate-100' },
  ];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Statement summary
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {summaryItems.map((item) => (
          <div key={item.label} className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
            <div className="text-[11px] text-slate-400">{item.label}</div>
            <div className={`text-sm font-semibold ${item.colorClass}`}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

