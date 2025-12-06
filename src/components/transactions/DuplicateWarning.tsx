/**
 * DuplicateWarning Component
 * 
 * Highlight when a transaction is suspected duplicate
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DuplicateWarningProps {
  isDuplicate: boolean;
  message?: string;
}

export function DuplicateWarning({
  isDuplicate,
  message = 'Possible duplicate detected',
}: DuplicateWarningProps) {
  if (!isDuplicate) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-lg">
      <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
      <span className="text-xs font-medium text-orange-400">{message}</span>
    </div>
  );
}







