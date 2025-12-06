/**
 * Unified Chat Launcher Component
 * 
 * Renders the Prime floating button (crown bubble) with route-based visibility.
 * Hides the crown bubble on all /dashboard/... routes.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export function UnifiedChatLauncher() {
  const location = useLocation();
  const { openChat } = useUnifiedChatLauncher();
  
  // Hide crown bubble on all dashboard routes
  const isDashboardRoute = location.pathname.startsWith('/dashboard');

  if (isDashboardRoute) {
    return null;
  }

  const handleClick = () => {
    // Open unified chat slideout with Prime
    openChat({ initialEmployeeSlug: 'prime-boss' });
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

