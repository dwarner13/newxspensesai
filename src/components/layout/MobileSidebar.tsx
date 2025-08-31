import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import Logo from '../common/Logo';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function MobileSidebar({ open, onClose, children }: MobileSidebarProps) {
  const location = useLocation();

  // CORRECT LOGIC: Only show sidebar on dashboard routes
  if (!location.pathname.startsWith('/dashboard')) {
    return null; // Hide sidebar on ALL non-dashboard routes
  }
  
  // Show sidebar ONLY on dashboard routes
  // Continue with sidebar rendering

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
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-[#0b0f2a] to-[#1a1f3a] backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Logo size="lg" showText={false} />
            <span className="font-bold text-2xl leading-tight tracking-tight text-white drop-shadow-sm">XspensesAI</span>
          </div>
          <button
            aria-label="Close menu"
            onClick={onClose}
            className="rounded-xl p-3 hover:bg-white/10 transition-all duration-300 text-white/80 hover:text-white hover:scale-110 active:scale-95"
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
