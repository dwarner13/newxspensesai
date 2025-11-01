import React, { useEffect, useRef } from 'react';

interface PrimeChatSlideoutProps {
  isOpen: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  children: React.ReactNode;
}

export default function PrimeChatSlideout({ isOpen, onClose, header, children }: PrimeChatSlideoutProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Mobile 100vh fix and body scroll lock
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          onClick={onClose}
        />
      )}

      <div
        ref={panelRef}
        className={
          `fixed z-50 top-0 right-0 w-screen bg-[#0b1220] text-white shadow-2xl rounded-none md:rounded-l-2xl
           transition-transform duration-300 ease-in-out
           ${isOpen ? 'translate-x-0' : 'translate-x-full'}
           md:max-w-[410px]`
        }
        style={{
          height: 'calc(var(--vh, 1vh) * 100)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="text-sm font-semibold">{header || 'Prime Assistant'}</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div
          className="overflow-hidden flex flex-col"
          style={{ height: 'calc((var(--vh, 1vh) * 100) - 64px)' }}
        >
          {children}
        </div>
      </div>
    </>
  );
}


