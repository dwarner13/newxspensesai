/**
 * Utility to assert only one mobile nav is rendered in development
 */

export function assertSingleMobileNav() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const mobileNavs = document.querySelectorAll('[data-testid="mobile-nav"]');
  if (mobileNavs.length > 1) {
    console.error(
      `[MobileNav] Found ${mobileNavs.length} mobile navs in DOM. Expected 1.`,
      'This usually means multiple mobile nav components are being rendered.',
      'Check for duplicate MobileNav imports or components.'
    );
  }
}

// Auto-check on DOM changes in development
if (process.env.NODE_ENV === 'development') {
  const observer = new MutationObserver(() => {
    assertSingleMobileNav();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
















