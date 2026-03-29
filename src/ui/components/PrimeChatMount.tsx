import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PrimeChatDrawer } from './PrimeChatDrawer';

export function PrimeChatMount() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

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
      {!isOpen && !location.pathname.includes('/inbox') && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open Prime Assistant"
          className="fixed z-40 rounded-full shadow-lg transition-transform"
          style={{
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            right: 'calc(24px + env(safe-area-inset-right, 0px))',
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #c8a64e, #a07830)',
          }}
        >
          <span style={{ fontSize: 24 }}>{"\u265B"}</span>
        </button>
      )}
      <PrimeChatDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentPage={location.pathname}
      />
    </>
  );
}

export default PrimeChatMount;

