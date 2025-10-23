import React, { useState } from 'react';
import { PrimeChatDrawer } from './PrimeChatDrawer';
import { isPrimeEnabled } from '../../env';

interface PrimeDockButtonProps {
  conversationId?: string;
}

export function PrimeDockButton({ conversationId }: PrimeDockButtonProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // LEGACY: Consolidated into canonical header launcher (#prime-boss-button)
  // See: src/components/ui/DashboardHeader.tsx for single source of truth
  const isDockButtonDisabled = true;
  if (isDockButtonDisabled) {
    return null;
  }
  
  if (!isPrimeEnabled()) {
    return null;
  }
  
  return (
    <>
      {/* Dock Button */}
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40 flex items-center justify-center group"
        aria-label="Open Prime Assistant"
      >
        <svg 
          className="w-6 h-6 transition-transform group-hover:scale-110" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" 
          />
        </svg>
        
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-20" />
      </button>
      
      {/* Chat Drawer */}
      <PrimeChatDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        conversationId={conversationId}
      />
    </>
  );
}
