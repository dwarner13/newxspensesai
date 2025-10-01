import { useState, useEffect } from 'react';
import { Star, Zap, Trophy, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface XPProgressRingProps {
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
  showNextMilestone?: boolean;
  className?: string;
}

const XPProgressRing = ({ 
  size = 'md', 
  showLevel = true,
  showNextMilestone = true,
  className = '' 
}: XPProgressRingProps) => {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);

  useEffect(() => {
    if (user) {
      loadXpData();
    }
  }, [user]);

  const loadXpData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      setXp(data.xp || 0);
      setLevel(data.level || 1);
    } catch (error) {
      console.error('Error loading XP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getXpForNextLevel = () => {
    // Exponential XP curve: each level requires more XP than the last
    return Math.pow(level * 100, 1.1);
  };

  const getXpForCurrentLevel = () => {
    if (level <= 1) return 0;
    return Math.pow((level - 1) * 100, 1.1);
  };

  const getProgress = () => {
    const currentLevelXp = getXpForCurrentLevel();
    const nextLevelXp = getXpForNextLevel();
    const xpInCurrentLevel = xp - currentLevelXp;
    const xpRequiredForNextLevel = nextLevelXp - currentLevelXp;
    
    return (xpInCurrentLevel / xpRequiredForNextLevel) * 100;
  };

  const getXpToNextLevel = () => {
    return Math.ceil(getXpForNextLevel() - xp);
  };

  const getRingSize = () => {
    switch (size) {
      case 'sm': return 'w-16 h-16';
      case 'lg': return 'w-32 h-32';
      default: return 'w-24 h-24';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm': return 'text-lg';
      case 'lg': return 'text-3xl';
      default: return 'text-2xl';
    }
  };

  const getStrokeWidth = () => {
    switch (size) {
      case 'sm': return 4;
      case 'lg': return 8;
      default: return 6;
    }
  };

  const getRadius = () => {
    switch (size) {
      case 'sm': return 30;
      case 'lg': return 60;
      default: return 45;
    }
  };

  const getTitle = () => {
    if (level < 5) return 'Beginner';
    if (level < 10) return 'Explorer';
    if (level < 15) return 'Enthusiast';
    if (level < 20) return 'Expert';
    if (level < 30) return 'Master';
    return 'Legend';
  };

  if (loading) {
    return (
      <div className={`${getRingSize()} animate-pulse bg-gray-200 rounded-full ${className}`}></div>
    );
  }

  const radius = getRadius();
  const circumference = 2 * Math.PI * radius;
  const progress = getProgress();
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const strokeWidth = getStrokeWidth();

  return (
    <div className={`relative ${getRingSize()} ${className}`}>
      {/* Background Ring */}
      <svg className="w-full h-full" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress Ring */}
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#xpGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform="rotate(-90 60 60)"
        />
        
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Level Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`font-bold ${getFontSize()}`}>{level}</div>
        {showLevel && (
          <div className="text-xs text-gray-500">Level</div>
        )}
      </div>
      
      {/* Level Title */}
      {showLevel && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs font-medium bg-gradient-to-r from-primary-500 to-secondary-500 text-transparent bg-clip-text">
            {getTitle()}
          </span>
        </div>
      )}
      
      {/* XP to Next Level */}
      {showNextMilestone && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs font-medium text-gray-600 flex items-center">
            <Zap size={12} className="mr-1 text-yellow-500" />
            {getXpToNextLevel()} XP to level {level + 1}
          </span>
        </div>
      )}
      
      {/* Level Up Animation */}
      {showLevelUpAnimation && (
        <div
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="bg-yellow-400 rounded-full p-8 flex items-center justify-center">
            <Trophy size={32} className="text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

export default XPProgressRing;
