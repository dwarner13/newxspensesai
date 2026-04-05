import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { isPrimeBriefingOpenAtom } from "@/lib/uiStore";
import { PrimeChatV2Content } from "./PrimeChatV2";

export function PrimeBriefingPanel() {
  const [isOpen, setIsOpen] = useAtom(isPrimeBriefingOpenAtom);

  // Stop ALL keyboard events from escaping the panel into the dashboard.
  // This prevents the old Prime chat modal / command palette / any global
  // listener from intercepting keystrokes while the user types here.
  const stopKeyPropagation = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflowY = 'scroll';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflowY = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close Prime briefing"
        className="fixed inset-0 z-[50] bg-slate-950/50 backdrop-blur-[2px]"
        onClick={() => setIsOpen(false)}
      />
      {/* Panel — capture and stop all key events */}
      <div
        className="fixed top-0 right-0 z-[51] h-full w-full md:w-[560px] shadow-[-8px_0_40px_rgba(0,0,0,0.5)]"
        style={{
          animation: "primePanelSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
        onKeyDown={stopKeyPropagation}
        onKeyUp={stopKeyPropagation}
        onKeyPress={stopKeyPropagation}
      >
        <style>{`
          @keyframes primePanelSlideIn {
            from { transform: translateX(100%); opacity: 0.8; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
        <PrimeChatV2Content onClose={() => setIsOpen(false)} />
      </div>
    </>,
    document.body
  );
}
