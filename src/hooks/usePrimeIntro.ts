import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface PrimeIntroState {
  has_seen_intro?: boolean;
  intro_step?: number;
}

export function usePrimeIntro() {
  const { user, isDemoUser, ready } = useAuth();
  const [showIntro, setShowIntro] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch intro state on mount and when user changes
  useEffect(() => {
    const fetchIntroState = async () => {
      // Only fetch when auth is ready AND user exists AND is NOT a demo user
      if (!ready || !user?.id || isDemoUser) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/.netlify/functions/prime-intro", {
          headers: { "x-user-id": user.id },
        });
        
        // Handle 404 gracefully (endpoint may not exist)
        if (res.status === 404) {
          console.warn("[usePrimeIntro] Endpoint not found (404) - skipping intro check");
          setShowIntro(false);
          return;
        }
        
        if (!res.ok) {
          throw new Error(`Failed to fetch intro state: ${res.status} ${res.statusText}`);
        }
        
        const state: PrimeIntroState = await res.json();
        setShowIntro(!state?.has_seen_intro);
      } catch (err) {
        // Silently fail - don't spam console with errors for missing endpoints
        if (import.meta.env.DEV) {
          console.warn("[usePrimeIntro] Failed to fetch intro state (endpoint may not exist):", err);
        }
        setShowIntro(false);
      } finally {
        setLoading(false);
      }
    };

    fetchIntroState();
  }, [ready, user?.id, isDemoUser]);

  // Mark intro as complete
  const complete = async () => {
    // Only mark complete when auth is ready AND user exists AND is NOT a demo user
    if (!ready || !user?.id || isDemoUser) {
      setShowIntro(false);
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/prime-intro", {
        method: "PATCH",
        headers: { 
          "x-user-id": user.id,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          has_seen_intro: true, 
          intro_step: 2 
        }),
      });
      
      // Handle 404 gracefully (endpoint may not exist)
      if (res.status === 404) {
        if (import.meta.env.DEV) {
          console.warn("[usePrimeIntro] Endpoint not found (404) - skipping intro completion");
        }
        return;
      }
      
      if (!res.ok) {
        throw new Error(`Failed to mark intro complete: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      // Silently fail - don't spam console with errors for missing endpoints
      if (import.meta.env.DEV) {
        console.warn("[usePrimeIntro] Failed to mark intro complete (endpoint may not exist):", err);
      }
    } finally {
      setShowIntro(false);
    }
  };

  return { showIntro, complete, loading };
}





