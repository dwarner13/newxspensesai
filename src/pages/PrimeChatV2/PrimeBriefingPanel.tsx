import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { isPrimeBriefingOpenAtom, primeChatModeAtom } from "@/lib/uiStore";
import { primePanelWidth } from "@/lib/primeChatMode";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { PrimeChatV2Content } from "./PrimeChatV2";

export function PrimeBriefingPanel() {
  const [isOpen, setIsOpen] = useAtom(isPrimeBriefingOpenAtom);
  // UX-P2: one mounted chat; the mode only changes this shell's width (no remount).
  const mode = useAtomValue(primeChatModeAtom);
  const isMobile = useIsMobile();
  // UX-P2d: on phones, size the panel to the visible viewport so the composer stays above
  // the on-screen keyboard (iOS keeps 100% height under the keyboard).
  const visibleViewport = useVisualViewport(isMobile && isOpen);

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
      {/* Panel - capture and stop all key events */}
      <div
        className="fixed top-0 right-0 z-[51] h-full shadow-[-8px_0_40px_rgba(0,0,0,0.5)]"
        data-prime-mode={mode}
        style={{
          width: isMobile ? "100%" : primePanelWidth(mode),
          ...(isMobile && visibleViewport ? { top: visibleViewport.offsetTop, height: visibleViewport.height } : null),
          transition: "width 0.25s cubic-bezier(0.16,1,0.3,1)",
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
