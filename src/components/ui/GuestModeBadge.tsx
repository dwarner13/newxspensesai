/**
 * Guest Mode Badge
 * 
 * Small indicator shown when user is in guest/demo mode.
 * Only visible when guest session is active.
 */

import { isDemoMode, isGuestSession } from '../../lib/demoAuth';
import { useEffect, useState } from 'react';

export function GuestModeBadge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if guest mode is active
    if (isDemoMode() && isGuestSession()) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, []);

  if (!show) {
    return null;
  }

  return (
    <div className="inline-flex items-center px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium">
      Guest Mode
    </div>
  );
}




