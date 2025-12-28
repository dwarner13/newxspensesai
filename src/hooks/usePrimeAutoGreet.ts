import { useEffect, useRef } from 'react';
import { emitBus } from '../lib/bus';
import { buildUserContext } from '../lib/userContextHelpers';

export const GREETING_SUGGESTIONS = [
  { 
    label: 'Upload statements', 
    event: { type: 'UPLOADER_OPEN', payload: { reason: 'prime' } }
  },
  { 
    label: 'See spending insights', 
    route: '/analytics'
  },
  { 
    label: 'Manage transactions', 
    route: '/transactions'
  },
  { 
    label: 'Set goals', 
    route: '/goals'
  },
  { 
    label: 'Roast my spending 😈', 
    route: '/roast'
  },
  { 
    label: 'Surprise me 🎲', 
    action: 'random'
  },
];

export const GREETING_TEXT = "Hi! I'm Prime. What do you feel like doing today?";

/**
 * Hook to auto-greet user on dashboard load (once per session)
 * Automatically opens Prime Chat and shows greeting message + suggestion chips
 * @param enabled - Whether auto-greeting is enabled
 * @param onOpen - Optional callback when chat should open
 */
export function usePrimeAutoGreet(enabled: boolean = true, onOpen?: () => void) {
  const greetedRef = useRef(false);
  const userContext = buildUserContext(); // Use buildUserContext helper

  useEffect(() => {
    if (!enabled || greetedRef.current) return;

    // Mark as greeted for this session
    greetedRef.current = true;

    // Small delay to ensure Prime Chat is mounted and ready
    const timer = setTimeout(() => {
      // Trigger chat open if callback provided
      if (onOpen) onOpen();

      // Use preferredName from userContext for personalized greeting
      const userName = userContext.preferredName;
      const personalizedGreeting = userName !== 'there' 
        ? `Hi ${userName}! I'm Prime. What do you feel like doing today?`
        : GREETING_TEXT;

      // Debug log (dev only)
      if (import.meta.env.DEV) {
        console.log('[usePrimeAutoGreet] Using preferred name:', userName, {
          source: 'buildUserContext',
          fullContext: userContext,
        });
      }

      // Send greeting via bus
      emitBus('CHAT_OPEN', {
        greeting: personalizedGreeting,
        suggestions: GREETING_SUGGESTIONS,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [enabled, onOpen, userContext.preferredName]);
}
