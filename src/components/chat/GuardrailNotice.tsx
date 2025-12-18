/**
 * GuardrailNotice Component
 * 
 * Reusable guardrails info pill for chat interfaces
 */

import React from 'react';

export interface GuardrailNoticeProps {
  /** Optional custom message */
  message?: string;
  
  /** Optional className */
  className?: string;
}

export function GuardrailNotice({ 
  message = 'Guardrails are active • Prime filters unsafe content and protects your data. This is not legal, tax, or investment advice.',
  className = '',
}: GuardrailNoticeProps) {
  return (
    <div className={`mx-8 mb-3 mt-3 flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs text-slate-300 shrink-0 ${className}`}>
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
        ⚡
      </span>
      <span className="truncate">
        {message}
      </span>
    </div>
  );
}


