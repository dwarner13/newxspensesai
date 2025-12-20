/**
 * Guest Mode Banner
 * 
 * Visible banner shown in Guest mode indicating local storage.
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isDemoMode } from '../../lib/demoAuth';
import { Info } from 'lucide-react';

export function GuestModeBanner() {
  const { isDemoUser } = useAuth();

  if (!isDemoMode() || !isDemoUser) {
    return null;
  }

  return (
    <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-blue-300 font-medium mb-1">
            Guest Mode — changes are stored locally
          </p>
          <p className="text-xs text-blue-400/80">
            Create an account to sync your data across devices and access all features.
          </p>
        </div>
      </div>
    </div>
  );
}






