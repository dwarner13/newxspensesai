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
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute inset-y-0 left-0 w-[80vw] max-w-[320px] bg-[#0b0f2a] shadow-2xl border-r border-white/10 flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-lg font-semibold">Menu</span>
          <button
            aria-label="Close menu"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}
