/**
 * Status Indicator Component
 * 
 * Shows live status badges for ongoing operations
 */

import React from 'react';
import { Upload, Settings, RefreshCw, BarChart3, Loader2 } from 'lucide-react';

export type StatusType = 'uploading' | 'extracting' | 'categorizing' | 'analyzing' | 'processing';

interface StatusIndicatorProps {
  status: StatusType;
  message?: string;
}

const STATUS_CONFIG: Record<StatusType, { icon: React.ReactNode; label: string; color: string }> = {
  uploading: {
    icon: <Upload className="w-3 h-3" />,
    label: 'Uploading',
    color: 'text-sky-400',
  },
  extracting: {
    icon: <Settings className="w-3 h-3" />,
    label: 'Extracting',
    color: 'text-cyan-400',
  },
  categorizing: {
    icon: <RefreshCw className="w-3 h-3 animate-spin" />,
    label: 'Categorizing',
    color: 'text-amber-400',
  },
  analyzing: {
    icon: <BarChart3 className="w-3 h-3" />,
    label: 'Building insights',
    color: 'text-purple-400',
  },
  processing: {
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    label: 'Processing',
    color: 'text-emerald-400',
  },
};

export function StatusIndicator({ status, message }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-white/5">
      <div className={config.color}>
        {config.icon}
      </div>
      <span className="text-xs text-slate-300">
        {message || config.label}...
      </span>
    </div>
  );
}






