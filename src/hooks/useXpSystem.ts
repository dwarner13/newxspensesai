import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface XpSystemHook {
  awardXp: (amount: number, activityType: string, description?: string) => Promise<void>;
  checkDailyStreak: () => Promise<void>;
  userXp: number;
  userLevel: number;
  userStreak: number;
  isLoading: boolean;
}

export const useXpSystem = (): XpSystemHook => {
  const { user } = useAuth();
  const [userXp, setUserXp] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [userStreak, setUserStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Gamification disabled - not loading user XP data
      setIsLoading(false);
    }
  }, [user]);

  const loadUserXpData = async () => {
    // Gamification disabled - not loading user XP data
    setUserXp(0);
    setUserLevel(1);
    setUserStreak(0);
    setIsLoading(false);
  };

  const awardXp = async (amount: number, activityType: string, description?: string) => {
    // Gamification disabled - not awarding XP
    console.log('Gamification disabled - XP not awarded:', { amount, activityType, description});
  };

  const checkDailyStreak = async () => {
    // Gamification disabled - not checking daily streak
    console.log('Gamification disabled - streak not updated');
  };

  return {
    awardXp,
    checkDailyStreak,
    userXp,
    userLevel,
    userStreak,
    isLoading
  };
};