import React from "react";

type Worker = { name: string; pct: number };

const workers: Worker[] = [
  { name: "Byte - Smart Import AI", pct: 67 },
  { name: "Crystal - Prediction Engine", pct: 45 },
  { name: "Tag - AI Categorization Engine", pct: 78 },
  { name: "Ledger - Tax Assistant", pct: 52 },
];

export default function RightSidebar() {
  return (
    <aside className="hidden lg:block w-[360px] shrink-0 border-l border-white/10 bg-[#0b1220]">
      <div className="sticky top-0 h-screen overflow-y-auto px-5 py-6 space-y-8">
        <section>
          <h3 className="text-white font-semibold tracking-wide">LIVE ACTIVITY</h3>
          <ul className="mt-4 space-y-4">
            {[
              "Byte processing chase statement",
              "Crystal analyzing trends",
              "Tag categorizing transactions",
              "Ledger tax analysis",
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-sky-400" />
                <div className="text-sm">
                  <div className="text-slate-200">{item}</div>
                  <div className="text-slate-500">2–12 min ago</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h3 className="text-white font-semibold tracking-wide">WORKERS</h3>
            <span className="text-slate-400 text-sm">4/4</span>
          </div>
          <div className="mt-4 space-y-4">
            {workers.map((w) => (
              <div key={w.name}>
                <div className="text-sm text-slate-200 mb-1">{w.name}</div>
                <div className="h-2 rounded bg-white/10 overflow-hidden">
                  <div className="h-full bg-sky-400" style={{ width: `${w.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}













