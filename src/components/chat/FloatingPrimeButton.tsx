import React from 'react';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { getEmployeeDisplayForSlug } from '../../utils/employeeUtils';
import { cn } from '../../lib/utils';

/**
 * Floating Prime Chat Launcher Button
 * 
 * Modern floating button in bottom-right corner for desktop
 * Replaces the vertical tab design with a more modern approach
 */

export const FloatingPrimeButton: React.FC = () => {
  const {
    isOpen,
    activeEmployeeSlug,
    isWorking,
    hasActivity,
    openChat,
    closeChat,
  } = useUnifiedChatLauncher();

  // Get display info for current employee
  const { emoji, shortName } = getEmployeeDisplayForSlug(activeEmployeeSlug ?? 'prime-boss');

  // Build label
  const label = shortName === 'Prime' ? 'Ask Prime' : `Chat with ${shortName}`;

  // Determine visual activity state
  const showActivity = !isOpen && (isWorking || hasActivity);

  // Click handler - toggle unified chat
  const handleClick = () => {
    if (isOpen) {
      closeChat();
    } else {
      openChat({ initialEmployeeSlug: activeEmployeeSlug ?? 'prime-boss' });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isOpen ? "Close chat" : "Open XspensesAI Assistant"}
      className={cn(
        "hidden md:flex fixed bottom-6 z-[998]",
        "flex items-center gap-3 px-4 py-3 rounded-full",
        "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500",
        "text-white font-medium text-sm",
        "shadow-lg hover:shadow-xl transition-all duration-300 ease-out",
        "hover:scale-105 active:scale-95",
        // Position: shift left when chat panel is open (chat panel is 420px wide)
        isOpen ? "right-[440px]" : "right-6",
        // Activity states
        !isOpen && !showActivity && "shadow-lg hover:shadow-xl",
        showActivity && !isOpen && "animate-pulse ring-2 ring-indigo-300 ring-offset-2 ring-offset-[#0b1220]",
        isOpen && "shadow-2xl brightness-110"
      )}
    >
      {/* Emoji */}
      <span className="text-xl leading-none" aria-hidden="true">
        {emoji}
      </span>

      {/* Label - hidden on very small screens, shown on md+ */}
      <span className="hidden md:block whitespace-nowrap">
        {label}
      </span>

      {/* Activity indicator dot */}
      {showActivity && !isOpen && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0b1220] animate-pulse" />
      )}
    </button>
  );
};

