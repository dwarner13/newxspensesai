/**
 * Prime Floating Button Component
 * 
 * Floating action button that opens unified chat slideout with Prime.
 * Positioned at bottom-right of the screen.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

interface PrimeFloatingButtonProps {
  /** Handler for when Prime button is clicked (optional, uses unified chat if not provided) */
  onPrimeClick?: () => void;
  
  /** Whether to hide the button */
  hidden?: boolean;
}

export function PrimeFloatingButton({ onPrimeClick, hidden = false }: PrimeFloatingButtonProps) {
  const location = useLocation();
  const { openChat } = useUnifiedChatLauncher();
  
  // Hide on all dashboard routes
  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  if (hidden || isDashboardRoute) return null;

  const handleClick = () => {
    if (onPrimeClick) {
      // If custom handler provided, use it (for backward compatibility)
      onPrimeClick();
    } else {
      // Default: open unified chat slideout with Prime
      openChat({ initialEmployeeSlug: 'prime-boss' });
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Open Prime Chat"
      className="fixed z-30 rounded-full shadow-lg transition-transform active:scale-95 hover:scale-105"
      style={{
        bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        right: 'calc(24px + env(safe-area-inset-right, 0px))',
        width: 56,
        height: 56,
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      }}
    >
      <span className="text-2xl">👑</span>
    </button>
  );
}
