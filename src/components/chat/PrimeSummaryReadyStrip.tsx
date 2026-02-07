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
  onApprove: () => void;
  onDismiss: () => void;
}

export function PrimeSummaryReadyStrip({ summaryText, onApprove, onDismiss }: PrimeSummaryReadyStripProps) {
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





