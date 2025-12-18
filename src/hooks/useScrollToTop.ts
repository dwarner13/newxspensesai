import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to scroll to top when route changes
 * Handles both window scroll and nested scroll containers
 */
export function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll window to top
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // Also scroll any scrollable container to top
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo?.({ top: 0, left: 0, behavior: 'instant' });
      // Fallback for browsers that don't support scrollTo
      if (mainContent.scrollTop !== undefined) {
        mainContent.scrollTop = 0;
      }
    }
    
    // Scroll the dashboard content area if it exists
    const dashboardContent = document.querySelector('[data-dashboard-content]');
    if (dashboardContent) {
      dashboardContent.scrollTo?.({ top: 0, left: 0, behavior: 'instant' });
      if (dashboardContent.scrollTop !== undefined) {
        (dashboardContent as HTMLElement).scrollTop = 0;
      }
    }

    // Reset any scroll containers with specific IDs
    const mainScroll = document.getElementById('main-scroll');
    if (mainScroll) {
      mainScroll.scrollTo?.({ top: 0, left: 0, behavior: 'instant' });
      if (mainScroll.scrollTop !== undefined) {
        mainScroll.scrollTop = 0;
      }
    }
  }, [pathname]);
}










