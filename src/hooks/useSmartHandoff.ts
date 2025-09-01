// Hook for AI employees to retrieve and use smart handoff context
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getHandoffContext, 
  markHandoffUsed, 
  HandoffContext 
} from '../lib/smartHandoff';

export interface UseSmartHandoffReturn {
  handoffContext: HandoffContext | null;
  isLoading: boolean;
  error: string | null;
  markAsUsed: () => Promise<boolean>;
  hasHandoff: boolean;
}

export function useSmartHandoff(): UseSmartHandoffReturn {
  const { user } = useAuth();
  const [handoffContext, setHandoffContext] = useState<HandoffContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const retrieveHandoff = async () => {
      if (!user?.id) return;

      // Check if there's a handoff ID in session storage
      const handoffId = sessionStorage.getItem('current_handoff_id');
      if (!handoffId) return;

      setIsLoading(true);
      setError(null);

      try {
        const context = await getHandoffContext(handoffId);
        if (context) {
          setHandoffContext(context);
          // Clear the handoff ID from session storage since we've retrieved it
          sessionStorage.removeItem('current_handoff_id');
        }
      } catch (err) {
        console.error('Error retrieving handoff context:', err);
        setError('Failed to retrieve handoff context');
      } finally {
        setIsLoading(false);
      }
    };

    retrieveHandoff();
  }, [user?.id]);

  const markAsUsed = async (): Promise<boolean> => {
    if (!handoffContext) return false;

    try {
      const success = await markHandoffUsed(handoffContext.id);
      if (success) {
        setHandoffContext(null);
      }
      return success;
    } catch (err) {
      console.error('Error marking handoff as used:', err);
      return false;
    }
  };

  return {
    handoffContext,
    isLoading,
    error,
    markAsUsed,
    hasHandoff: !!handoffContext
  };
}
