import React, { useEffect, useState } from 'react';
import { PrimeChatDrawer } from './PrimeChatDrawer';

export function PrimeChatMount() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    window.addEventListener('openPrimeChat', open as EventListener);
    window.addEventListener('closePrimeChat', close as EventListener);
    return () => {
      window.removeEventListener('openPrimeChat', open as EventListener);
      window.removeEventListener('closePrimeChat', close as EventListener);
    };
  }, []);

  return (
    <>
      {/* Floating launcher visible on all pages */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open Prime Assistant"
          className="fixed z-40 rounded-full shadow-lg transition-transform"
          style={{
            bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            right: 'calc(24px + env(safe-area-inset-right, 0px))',
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          }}
        >
          <span style={{ fontSize: 24 }}>👑</span>
        </button>
      )}

      {/* Slide-out drawer */}
      <PrimeChatDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

export default PrimeChatMount;

