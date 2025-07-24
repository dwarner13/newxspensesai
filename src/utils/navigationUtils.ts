/**
 * Navigation utilities for page persistence and user experience
 */

/**
 * Store the current page for later restoration
 */
export const storeCurrentPage = (path: string) => {
  const authPages = ['/login', '/auth/callback', '/logout'];
  if (!authPages.includes(path)) {
    sessionStorage.setItem('xspensesai-last-page', path);
  }
};

/**
 * Get the stored page path
 */
export const getStoredPage = (): string | null => {
  return sessionStorage.getItem('xspensesai-last-page');
};

/**
 * Clear stored page data
 */
export const clearStoredPage = () => {
  sessionStorage.removeItem('xspensesai-last-page');
  sessionStorage.removeItem('xspensesai-intended-path');
};

/**
 * Check if a path is an authentication-related page
 */
export const isAuthPage = (path: string): boolean => {
  const authPages = ['/login', '/auth/callback', '/logout', '/terms', '/privacy'];
  return authPages.includes(path);
};

/**
 * Get the appropriate redirect path after authentication
 */
export const getRedirectPath = (): string => {
  const intendedPath = sessionStorage.getItem('xspensesai-intended-path');
  const lastPage = sessionStorage.getItem('xspensesai-last-page');
  
  // Priority: intended path > last page > dashboard
  if (intendedPath && !isAuthPage(intendedPath)) {
    return intendedPath;
  }
  
  if (lastPage && !isAuthPage(lastPage)) {
    return lastPage;
  }
  
  return '/';
};

/**
 * Navigate to a page and store it for persistence
 */
export const navigateAndStore = (navigate: (path: string) => void, path: string) => {
  storeCurrentPage(path);
  navigate(path);
};