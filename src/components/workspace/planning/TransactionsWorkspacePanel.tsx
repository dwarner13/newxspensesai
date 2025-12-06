/**
 * TransactionsWorkspacePanel Component
 * 
 * Left sidebar panel for Transactions workspace
 * Matches TagWorkspacePanel structure with KPIs and CTA buttons
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Filter } from 'lucide-react';

export type TransactionsQuickViewMode = "all" | "pending" | "uncategorized" | "lastImport";

interface TransactionsWorkspacePanelProps {
  totalCount: number;
  monthCount: number;
  pendingCount: number;
  uncategorizedCount: number;
  lastImportCount?: number;
  openQuickView: (mode: TransactionsQuickViewMode) => void;
}

export function TransactionsWorkspacePanel({
  totalCount,
  monthCount,
  pendingCount,
  uncategorizedCount,
  lastImportCount,
  openQuickView,
}: TransactionsWorkspacePanelProps) {
  return (
    <Card className="h-full flex flex-col bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-sm tracking-[0.18em] text-slate-400 uppercase">
          TRANSACTIONS WORKSPACE
        </CardTitle>
        <CardDescription className="text-sm text-slate-300">
          Transaction management
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* KPIs similar to Tag workspace */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400">Total</div>
            <div className="mt-1 text-lg font-semibold text-white">{totalCount}</div>
          </div>
          <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400">This month</div>
            <div className="mt-1 text-lg font-semibold text-white">{monthCount}</div>
          </div>
          <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400">Pending review</div>
            <div className="mt-1 text-lg font-semibold text-amber-300">
              {pendingCount}
            </div>
          </div>
          <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400">Uncategorized</div>
            <div className="mt-1 text-lg font-semibold text-pink-300">
              {uncategorizedCount}
            </div>
          </div>
        </div>

        {/* CTA buttons open the popup with pre-set view */}
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => openQuickView("all")}
            className="flex-1 min-w-0 text-xs"
          >
            View all
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => openQuickView("pending")}
            className="flex-1 min-w-0 text-xs"
          >
            Pending review
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => openQuickView("uncategorized")}
            className="flex-1 min-w-0 text-xs"
          >
            Uncategorized
          </Button>
          {lastImportCount !== undefined && lastImportCount > 0 && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => openQuickView("lastImport")}
              className="w-full text-xs"
            >
              Last import ({lastImportCount})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


