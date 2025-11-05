import React from 'react';

interface FloatingPrimeButtonProps {
  onClick: () => void;
}

export default function FloatingPrimeButton({ onClick }: FloatingPrimeButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open Prime Chat"
      className="fixed z-50 rounded-full shadow-2xl text-white flex items-center justify-center transition-transform active:scale-95"
      style={{
        bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        right: 'calc(24px + env(safe-area-inset-right, 0px))',
        width: 56,
        height: 56,
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
      }}
    >
      <span className="text-2xl">👑</span>
    </button>
  );
}


