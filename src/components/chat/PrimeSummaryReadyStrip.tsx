/**
 * Prime Summary Ready Strip Component
 * 
 * Non-intrusive UI strip that appears when Prime summary is ready.
 * Shows a calm notification with a button to view the summary.
 */

import { CheckCircle2, ArrowRight, X } from 'lucide-react';
import { Button } from '../ui/button';

interface PrimeSummaryReadyStripProps {
  summaryText: string;
  needsReviewCount?: number | null;
  taggedCount?: number | null;
  autoCount?: number | null;
  aiCount?: number | null;
  tagRan?: boolean | null;
  onApprove: () => void;
  onDismiss: () => void;
}

export function PrimeSummaryReadyStrip({
  summaryText,
  needsReviewCount,
  taggedCount,
  autoCount,
  aiCount,
  tagRan,
  onApprove,
  onDismiss,
}: PrimeSummaryReadyStripProps) {
  return (
    <div className="w-full mb-2 px-3 py-3 bg-green-50 border border-green-200 rounded-lg flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        <div className="text-sm text-green-900">
          <span className="font-medium">Summary ready</span>
          <span className="text-green-700 ml-1">Approve to send to Smart Categories.</span>
        </div>
      </div>
      <div className="text-xs text-green-900/90 whitespace-pre-wrap">
        {summaryText}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {needsReviewCount !== null && needsReviewCount !== undefined && (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            Needs review: {needsReviewCount}
          </span>
        )}
        {(taggedCount !== null && taggedCount !== undefined) && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Tagged: {taggedCount}
          </span>
        )}
        {(autoCount !== null && autoCount !== undefined) && (
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            Auto: {autoCount}
          </span>
        )}
        {(aiCount !== null && aiCount !== undefined) && (
          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            AI inferred: {aiCount}
          </span>
        )}
        {tagRan !== null && tagRan !== undefined && (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            TAG run: {tagRan ? 'yes' : 'no'}
          </span>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={onDismiss}
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-green-800 hover:text-green-900"
        >
          <X className="h-3 w-3 mr-1" />
          Dismiss
        </Button>
        <Button
          onClick={onApprove}
          size="sm"
          className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
        >
          Send to Smart Categories
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}





