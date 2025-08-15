import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function MobileSidebar({
  open,
  onClose,
  children,
}: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
      />
      
      {/* Sidebar */}
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute inset-y-0 left-0 w-full max-w-[85vw] sm:max-w-[320px] bg-[#0b0f2a] shadow-2xl border-r border-white/10 flex flex-col transform transition-transform duration-300 ease-in-out"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0b0f2a]/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">💰</span>
            </div>
            <span className="text-lg font-bold text-white">XspensesAI</span>
          </div>
          <button
            aria-label="Close menu"
            onClick={onClose}
            className="rounded-xl p-3 hover:bg-white/10 transition-colors duration-200 text-white/70 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content area with proper padding and spacing */}
        <div className="flex-1 overflow-y-auto py-6">
          {children}
        </div>
      </aside>
    </div>
  );
}
