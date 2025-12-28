/**
 * Page Cinematic Fade Component
 * 
 * Lightweight wrapper that provides a one-time fade-in animation
 * when navigating from the Prime Welcome Overlay.
 * 
 * Checks sessionStorage for 'xspenses_nav_fade' flag and animates
 * children on mount if flag is present.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PageCinematicFadeProps {
  children: React.ReactNode;
  className?: string;
}

export function PageCinematicFade({ children, className = '' }: PageCinematicFadeProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    // Check for fade flag on mount
    const fadeFlag = sessionStorage.getItem('xspenses_nav_fade');
    if (fadeFlag === '1') {
      // Clear flag immediately
      sessionStorage.removeItem('xspenses_nav_fade');
      // Trigger animation
      setShouldAnimate(true);
    }
  }, []);

  // If no animation needed, render normally
  if (!shouldAnimate) {
    return <>{children}</>;
  }

  // Animate fade-in
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}




