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
  return null; // Replaced by global Prime chat mount
  
  if (!isPrimeEnabled()) {
    return null;
  }
  
  
}
