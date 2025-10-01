import { useState, useEffect } from 'react';
import { Star, Zap, Trophy, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface XPTrackerProps {
  userLevel?: number;
  xp?: number;
  xpToNext?: number;
  title?: string;
  dailyStreak?: number;
  nextMilestone?: string;
  milestoneReward?: string;
  compact?: boolean;
  className?: string;
}

const XPTracker = ({
  userLevel: propLevel,
  xp: propXp,
  xpToNext: propXpToNext,
  title: propTitle,
  dailyStreak: propStreak,
  nextMilestone: propMilestone,
  milestoneReward: propReward,
  compact = false,
  className = ''
}: XPTrackerProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(propLevel || 1);
  const [xp, setXp] = useState(propXp || 0);
  const [xpToNext, setXpToNext] = useState(propXpToNext || 1000);
  const [title, setTitle] = useState(propTitle || 'Expense Novice');
  const [dailyStreak, setDailyStreak] = useState(propStreak || 0);
  const [nextMilestone, setNextMilestone] = useState(propMilestone || '7-Day Streak');
  const [milestoneReward, setMilestoneReward] = useState(propReward || '25 XP');

  useEffect(() => {
    if (user && !propLevel) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [user, propLevel]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('xp, level, streak')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      setXp(data.xp || 0);
      setUserLevel(data.level || 1);
      setDailyStreak(data.streak || 0);
      
      // Calculate XP to next level (100 XP per level)
      const nextLevelXp = (data.level || 1) * 100;
      setXpToNext(nextLevelXp);
      
      // Set title based on level
      setTitle(getLevelTitle(data.level || 1));
      
      // Set next milestone based on streak
      setNextMilestone(getNextMilestone(data.streak || 0));
      setMilestoneReward(getMilestoneReward(data.streak || 0));
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelTitle = (level: number): string => {
    if (level < 2) return 'Expense Novice';
    if (level < 5) return 'Expense Explorer';
    if (level < 10) return 'Money Tracker';
    if (level < 15) return 'XP Pathfinder';
    if (level < 20) return 'Finance Master';
    return 'Budget Legend';
  };

  const getNextMilestone = (streak: number): string => {
    if (streak < 3) return '3-Day Streak';
    if (streak < 7) return '7-Day Streak';
    if (streak < 14) return '14-Day Streak';
    if (streak < 30) return '30-Day Streak';
    return '60-Day Streak';
  };

  const getMilestoneReward = (streak: number): string => {
    if (streak < 3) return '15 XP';
    if (streak < 7) return '25 XP';
    if (streak < 14) return '50 XP';
    if (streak < 30) return '100 XP';
    return '200 XP';
  };

  const getProgress = () => {
    return ((xp % 100) / 100) * 100;
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-blue-500 rounded-xl h-24 ${className}`}></div>
    );
  }

  if (compact) {
    return (
      <div className={`w-full p-4 rounded-xl shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white ${className}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Star className="text-yellow-300" size={20} />
            <span className="font-bold">{xp} XP</span>
          </div>
          <div className="flex items-center space-x-2">
            <Trophy className="text-yellow-300" size={20} />
            <span>Level {userLevel}</span>
          </div>
        </div>
        <div className="mt-2 w-full bg-white/20 rounded-full h-1.5">
          <div
            animate={{ width: `${getProgress()}%` }}
            className="bg-yellow-300 h-1.5 rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full p-5 rounded-xl shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <div>
          <div className="text-4xl font-bold">{xp} XP</div>
          <div className="text-sm opacity-90 mt-1">Next milestone: {milestoneReward} in {nextMilestone}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end space-x-1">
            <Trophy size={18} className="text-yellow-300" />
            <span className="font-semibold">Level {userLevel}</span>
          </div>
          <div className="text-sm opacity-90">{title}</div>
        </div>
      </div>
      
      <div className="w-full bg-white/20 rounded-full h-2.5 mb-2">
        <div
          animate={{ width: `${getProgress()}%` }}
          className="bg-yellow-300 h-2.5 rounded-full"
        />
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-1">
          <Zap size={16} className="text-yellow-300" />
          <span className="text-sm">{Math.floor(xpToNext - (xp % 100))} XP to Level {userLevel + 1}</span>
        </div>
        
        {dailyStreak > 0 && (
          <div className="flex items-center space-x-1">
            <Award size={16} className="text-yellow-300" />
            <span className="text-sm">{dailyStreak} day streak</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default XPTracker;
