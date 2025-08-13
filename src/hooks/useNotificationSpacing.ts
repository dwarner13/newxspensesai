import { useEffect, useState } from 'react';

export const useNotificationSpacing = () => {
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    const checkForNotifications = () => {
      const notifications = document.querySelectorAll('[class*="fixed top-0"][class*="z-50"]');
      setHasNotifications(notifications.length > 0);
    };

    // Check initially
    checkForNotifications();

    // Set up observer to watch for notification changes
    const observer = new MutationObserver(checkForNotifications);
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return { hasNotifications };
}; 