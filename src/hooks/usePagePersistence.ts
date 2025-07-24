import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to persist the current page in sessionStorage
 * This helps maintain user's location across page refreshes
 */
export const usePagePersistence = () => {
  const location = useLocation();

  useEffect(() => {
    // Store current path (excluding auth pages)
    const authPages = ['/login', '/auth/callback', '/logout'];
    if (!authPages.includes(location.pathname)) {
      sessionStorage.setItem('xspensesai-last-page', location.pathname);
    }
  }, [location.pathname]);

  const getLastPage = () => {
    return sessionStorage.getItem('xspensesai-last-page') || '/';
  };

  const clearLastPage = () => {
    sessionStorage.removeItem('xspensesai-last-page');
  };

  return {
    getLastPage,
    clearLastPage,
    currentPath: location.pathname
  };
};