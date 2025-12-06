import React from "react";

export function PrimeSettingsPanel() {
  // TODO: load/save real settings from Supabase or API
  return (
    <div className="space-y-4 text-xs text-slate-200">
      <section>
        <h3 className="text-[13px] font-semibold mb-1">
          Prime Persona
        </h3>
        <p className="text-[11px] text-slate-400 mb-2">
          Adjust how Prime behaves as your AI CEO.
        </p>
        {/* Replace with real controls later */}
        <div className="space-y-2">
          <label className="flex items-center justify-between">
            <span>More strategic focus</span>
            <input 
              type="range" 
              min={0} 
              max={100} 
              defaultValue={70}
              className="w-24"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Direct vs. gentle tone</span>
            <input 
              type="range" 
              min={0} 
              max={100} 
              defaultValue={50}
              className="w-24"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="text-[13px] font-semibold mb-1">
          Routing Rules
        </h3>
        <p className="text-[11px] text-slate-400 mb-2">
          Choose which employees Prime should delegate to.
        </p>
        <ul className="space-y-1.5 text-[11px] text-slate-300">
          <li className="flex items-center gap-2">
            <span className="text-slate-500">•</span>
            <span>Debt & freedom → Blitz, Liberty</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-slate-500">•</span>
            <span>Receipt & docs → Byte</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-slate-500">•</span>
            <span>Spending analysis → Crystal</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-slate-500">•</span>
            <span>Forecasts → Finley</span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-[13px] font-semibold mb-1">
          Guardrails
        </h3>
        <p className="text-[11px] text-slate-400 mb-2">
          Safety and compliance level for AI responses.
        </p>
        <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200">
          <option>Balanced (recommended)</option>
          <option>Strict</option>
          <option>Experimental</option>
        </select>
      </section>
    </div>
  );
}







