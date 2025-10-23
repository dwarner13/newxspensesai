import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface PrimeIntroState {
  has_seen_intro?: boolean;
  intro_step?: number;
}

export function usePrimeIntro() {
  const { user } = useAuth();
  const [showIntro, setShowIntro] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch intro state on mount and when user changes
  useEffect(() => {
    const fetchIntroState = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/.netlify/functions/prime-intro", {
          headers: { "x-user-id": user.id },
        });
        const state: PrimeIntroState = await res.json();
        setShowIntro(!state?.has_seen_intro);
      } catch (err) {
        console.error("[usePrimeIntro] Failed to fetch intro state:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchIntroState();
  }, [user?.id]);

  // Mark intro as complete
  const complete = async () => {
    if (!user?.id) {
      setShowIntro(false);
      return;
    }

    try {
      await fetch("/.netlify/functions/prime-intro", {
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
    } catch (err) {
      console.error("[usePrimeIntro] Failed to mark intro complete:", err);
    } finally {
      setShowIntro(false);
    }
  };

  return { showIntro, complete, loading };
}




