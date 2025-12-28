/**
 * Prime Summary Ready Strip Component
 * 
 * Non-intrusive UI strip that appears when Prime summary is ready.
 * Shows a calm notification with a button to view the summary.
 */

import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';

interface PrimeSummaryReadyStripProps {
  importId: string;
  onViewSummary: () => void;
}

export function PrimeSummaryReadyStrip({ importId, onViewSummary }: PrimeSummaryReadyStripProps) {
  return (
    <div className="w-full mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span className="text-sm text-green-900 flex-1">
          <span className="font-medium">Prime summary ready</span>
          <span className="text-green-700 ml-1">Your categorized results and insights are available.</span>
        </span>
      </div>
      <Button
        onClick={onViewSummary}
        size="sm"
        className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs"
      >
        View Prime Summary
        <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}





