import React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export type PrimePanelId = "team" | "settings" | "memory" | "integrations";

export type PrimeRightPanelProps = {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  panelId?: PrimePanelId;
  onPanelChange?: (id: PrimePanelId) => void;
  panelRef?: React.RefObject<HTMLDivElement>;
};

export function PrimeRightPanel({
  title,
  description,
  open,
  onClose,
  children,
  panelId,
  onPanelChange,
  panelRef,
}: PrimeRightPanelProps) {
  if (!open) return null;

  return (
    <>
      {/* Slideout */}
      <aside
        ref={panelRef}
        className={cn(
          "fixed z-[60] right-0 top-10 bottom-10",
          "w-[480px]",
          "bg-slate-900/90 backdrop-blur-xl border border-slate-800",
          "rounded-xl shadow-2xl",
          "flex flex-col overflow-hidden"
        )}
        style={{
          height: "calc(100vh - 80px)",
          marginTop: "40px",
          marginBottom: "40px",
        }}
      >
        <header className="flex items-start justify-between px-4 py-3 border-b border-slate-800">
          <div className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">{title}</h2>
              {description && (
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
              )}
            </div>

            {onPanelChange && (
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 p-1">
                {[
                  { id: "team", label: "Team" },
                  { id: "settings", label: "Settings" },
                  { id: "memory", label: "Memory" },
                  { id: "integrations", label: "Tools" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onPanelChange(tab.id as PrimePanelId)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] rounded-full transition-colors",
                      panelId === tab.id
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-800 text-slate-300"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto pl-16 pr-4 py-3 space-y-4">
          {children}
        </div>
      </aside>
    </>
  );
}

