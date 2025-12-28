/**
 * Mobile Detection Hook
 * 
 * Sets body[data-mobile] attribute for CSS scoping
 * Ensures mobile CSS never leaks to desktop
 */

import { useEffect } from 'react';

export function useMobileDetection() {
  useEffect(() => {
    const updateMobileFlag = () => {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      document.body.dataset.mobile = isMobile ? 'true' : 'false';
    };

    // Set initial value
    updateMobileFlag();

    // Listen for resize events
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = () => updateMobileFlag();
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);
}



