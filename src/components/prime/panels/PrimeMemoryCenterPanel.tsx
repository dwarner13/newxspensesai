import React from "react";
// TODO: import real hook later, e.g. usePrimeMemorySummary
// For now, mock a simple list.

export function PrimeMemoryCenterPanel() {
  const mockFacts = [
    {
      id: "1",
      category: "Profile",
      text: "User is a small business owner and sales rep.",
    },
    {
      id: "2",
      category: "Goals",
      text: "Wants to retire around age 60–62.",
    },
    {
      id: "3",
      category: "Preferences",
      text: "Prefers detailed explanations over quick summaries.",
    },
  ];

  return (
    <div className="space-y-3 text-xs text-slate-200">
      <p className="text-[11px] text-slate-400">
        Prime uses memories to personalize financial insights and keep
        context across chats.
      </p>

      <div className="space-y-2">
        {mockFacts.map((fact) => (
          <div
            key={fact.id}
            className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                {fact.category}
              </span>
              {/* TODO: actions for pin/edit/delete */}
              <button
                type="button"
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                Edit
              </button>
            </div>
            <div className="text-[13px] text-slate-100">{fact.text}</div>
          </div>
        ))}
      </div>

      {/* TODO: Add controls to edit/delete memories once backend is wired */}
      <button
        type="button"
        className="w-full mt-4 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/50 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
      >
        + Add Memory
      </button>
    </div>
  );
}







