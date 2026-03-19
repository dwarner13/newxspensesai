import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { renderInlineStrong } from './TypingMessage';

export type PrimeUploadStageState = 'pending' | 'active' | 'done' | 'error';

export type PrimeUploadProgressStages = {
  byte: PrimeUploadStageState;
  tag: PrimeUploadStageState;
  saving: PrimeUploadStageState;
};

interface PrimeUploadProgressBlockProps {
  stages: PrimeUploadProgressStages;
}

function StageRow(props: { label: React.ReactNode; state: PrimeUploadStageState }) {
  const { label, state } = props;
  if (state === 'done') {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </div>
    );
  }
  if (state === 'active') {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-100">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        <span>{label}</span>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="flex items-center gap-2 text-xs text-rose-200">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs text-slate-300">
      <Circle className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

export function PrimeUploadProgressBlock({ stages }: PrimeUploadProgressBlockProps) {
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-lg">
      <div className="mb-2 text-xs font-medium text-slate-200">Processing Document</div>
      <div className="space-y-1.5">
        <StageRow label="Byte is extracting transactions" state={stages.byte} />
        <StageRow label="Tag is organizing categories" state={stages.tag} />
        <StageRow label="Saving to your account" state={stages.saving} />
      </div>
    </div>
  );
}
