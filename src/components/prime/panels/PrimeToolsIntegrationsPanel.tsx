import React from "react";

type IntegrationItem = {
  id: string;
  name: string;
  category: "Data" | "AI" | "Entertainment";
  status: "connected" | "not_connected" | "coming_soon";
  description: string;
};

const mockIntegrations: IntegrationItem[] = [
  {
    id: "gmail",
    name: "Gmail Receipts",
    category: "Data",
    status: "not_connected",
    description: "Forward email receipts directly into XspensesAI.",
  },
  {
    id: "ocr",
    name: "OCR Engines",
    category: "AI",
    status: "connected",
    description: "OCR.space + Google Vision for reading PDFs & images.",
  },
  {
    id: "spotify",
    name: "Spotify",
    category: "Entertainment",
    status: "connected",
    description: "Use music to make finances more fun and focused.",
  },
  {
    id: "openai",
    name: "OpenAI GPT-4",
    category: "AI",
    status: "connected",
    description: "Powering Prime's intelligence and conversations.",
  },
];

export function PrimeToolsIntegrationsPanel() {
  return (
    <div className="space-y-3 text-xs text-slate-200">
      <p className="text-[11px] text-slate-400">
        Connect data sources and AI tools that Prime can use while
        coaching you.
      </p>

      <div className="space-y-2">
        {mockIntegrations.map((item) => {
          const statusLabel =
            item.status === "connected"
              ? "Connected"
              : item.status === "not_connected"
              ? "Not connected"
              : "Coming soon";

          const statusClass =
            item.status === "connected"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
              : item.status === "not_connected"
              ? "bg-slate-800 text-slate-300 border-slate-600"
              : "bg-amber-500/10 text-amber-300 border-amber-500/40";

          return (
            <div
              key={item.id}
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-[13px] font-semibold text-slate-100">
                    {item.name}
                  </div>
                  <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-800">
                    {item.category}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {item.description}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] border ${statusClass}`}
                >
                  {statusLabel}
                </span>
                <button
                  type="button"
                  className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Manage
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}









