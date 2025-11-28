import React from 'react';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { getEmployeeDisplayForSlug } from '../../utils/employeeUtils';
import { cn } from '../../lib/utils';

/**
 * Prime Floating Action Button (FAB)
 * 
 * Desktop-only floating button bottom-right for quick Prime chat access
 * MultipurposeThemes-inspired styling with gradient and glow effects
 */
export const PrimeFloatingButton: React.FC = () => {
  const {
    isOpen,
    activeEmployeeSlug,
    isWorking,
    hasActivity,
    openChat,
  } = useUnifiedChatLauncher();

  // Get display info for Prime
  const { emoji } = getEmployeeDisplayForSlug('prime-boss');

  // Determine visual activity state
  const showActivity = !isOpen && (isWorking || hasActivity);

  // Click handler - open Prime chat
  const handleClick = () => {
    openChat({ 
      initialEmployeeSlug: 'prime-boss',
      context: { source: 'dashboard-prime-fab' }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Ask Prime"
      className={cn(
        "hidden md:flex fixed bottom-6 right-6 z-30",
        "flex items-center gap-2 px-4 py-2.5 rounded-full",
        "bg-gradient-to-r from-sky-500/80 via-purple-500/80 to-fuchsia-500/80",
        "backdrop-blur-sm",
        "border border-white/20",
        "text-white font-medium text-sm",
        "shadow-[0_8px_32px_rgba(139,92,246,0.3)]",
        "hover:shadow-[0_12px_48px_rgba(139,92,246,0.4)]",
        "hover:scale-105 hover:brightness-110",
        "active:scale-95",
        "transition-all duration-200 ease-out",
        // Activity pulse
        showActivity && "animate-pulse ring-2 ring-purple-400/50 ring-offset-2 ring-offset-[#020617]"
      )}
    >
      {/* Prime emoji/icon */}
      <span className="text-lg leading-none" aria-hidden="true">
        {emoji}
      </span>

      {/* Label */}
      <span className="whitespace-nowrap">
        Ask Prime
      </span>

      {/* Activity indicator */}
      {showActivity && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#020617] animate-pulse" />
      )}
    </button>
  );
};
