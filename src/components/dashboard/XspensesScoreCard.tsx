import React from "react";
import { nextUpdateText } from "../../utils/nextUpdate";

export function XspensesScoreCard({
  score,
  breakdown,
  lastCalculatedAt,
  onReview,
  onSettings
}: {
  score: number;
  breakdown: { hasNewData:boolean; categorizeRate:number; budgetScore:number; goalsScore:number; streak:number };
  lastCalculatedAt: string | null;
  onReview: () => void;
  onSettings: () => void;
}) {
  const ringPct = Math.max(0, Math.min(100, Math.round((score/900)*100)));
  const nextTxt = nextUpdateText(lastCalculatedAt ? new Date(lastCalculatedAt) : null);

  const pulse = breakdown?.hasNewData ? "" : "animate-pulse";

  return (
    <div className="rounded-2xl bg-[#0b1120] border border-white/10 p-5 shadow-[0_0_40px_-10px_rgba(99,102,241,.25)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Financial Health Score</h3>
        <span className="text-sm text-white/60">{nextTxt}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className={`relative h-24 w-24 ${pulse}`}>
          <svg viewBox="0 0 100 100" className="h-24 w-24">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7"/>
                <stop offset="100%" stopColor="#60a5fa"/>
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="42" stroke="#1f2937" strokeWidth="10" fill="none"/>
            <circle cx="50" cy="50" r="42" stroke="url(#grad)" strokeWidth="10" fill="none"
              strokeDasharray={`${2*Math.PI*42}`}
              strokeDashoffset={`${2*Math.PI*42 * (1 - ringPct/100)}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"/>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-2xl font-bold text-white">{score}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 flex-1">
          <Badge label="Sync" value={breakdown?.hasNewData ? "Fresh" : "Stale"} ok={breakdown?.hasNewData}/>
          <Badge label="Categorized" value={`${Math.round((breakdown?.categorizeRate||0)*100)}%`} ok={(breakdown?.categorizeRate||0) >= 0.9}/>
          <Badge label="Budget" value={`${Math.round((breakdown?.budgetScore||0)*100)}%`} ok={(breakdown?.budgetScore||0) >= 0.8}/>
          <Badge label="Goals" value={`${Math.round((breakdown?.goalsScore||0)*100)}%`} ok={(breakdown?.goalsScore||0) >= 0.7}/>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={onReview} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
            Review
          </button>
          <button onClick={onSettings} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({label, value, ok}:{label:string; value:string; ok:boolean}) {
  return (
    <div className={`px-3 py-2 rounded-xl border ${ok ? "border-white/20 bg-white/5" : "border-amber-400/40 bg-amber-400/10"} text-white`}>
      <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
