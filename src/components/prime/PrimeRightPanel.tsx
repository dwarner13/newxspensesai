import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useRightPanel } from "../../context/RightPanelContext";

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
  const { registerPanel } = useRightPanel();

  // Register panel state with context (idempotent - registerPanel handles deduplication)
  useEffect(() => {
    const panelIdKey = panelId || "prime-panel";
    registerPanel(panelIdKey, open);
  }, [open, panelId, registerPanel]);

  // Toggle body class when panel opens/closes (for CSS-based rail dimming)
  useEffect(() => {
    document.body.classList.toggle("has-right-panel-open", open);
    return () => {
      document.body.classList.remove("has-right-panel-open");
    };
  }, [open]);

  // Always render container, toggle visibility via CSS (prevents unmount/remount)
  // This preserves greeting state and prevents blink

  return (
    <>
      {/* Slideout - Always rendered, visibility controlled by CSS */}
      <aside
        ref={panelRef}
        data-right-drawer="true"
        className={cn(
          "fixed z-[60] top-10 bottom-10",
          "w-[480px]",
          "bg-slate-900/90 backdrop-blur-xl border border-slate-800",
          "rounded-xl shadow-2xl",
          "flex flex-col overflow-hidden",
          // CSS handles offset via body.has-right-panel-open [data-right-drawer="true"]
          "right-0",
          // Toggle visibility instead of unmounting
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{
          height: "calc(100vh - 80px)",
          marginTop: "40px",
          marginBottom: "40px",
          transition: "right 0.3s ease, opacity 0.3s ease",
          // Hide off-screen when closed (but keep mounted)
          transform: open ? "translateX(0)" : "translateX(100%)",
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

        {/* ✅ IMPORTANT: no internal vertical scrolling */}
        <div className="flex-1 min-h-0 overflow-y-visible pl-16 pr-4 py-3 space-y-4">
          {children}
        </div>
      </aside>
    </>
  );
}



