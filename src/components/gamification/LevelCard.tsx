import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Star, 
  Award, 
  Trophy, 
  Crown, 
  Zap,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import XPProgressRing from './XPProgressRing';

interface LevelCardProps {
  compact?: boolean;
  className?: string;
}

const LevelCard = ({ compact = false, className = '' }: LevelCardProps) => {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [recentXp, setRecentXp] = useState<{
    amount: number;
    source: string;
    timestamp: Date;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadXpData();
    }
  }, [user]);

  const loadXpData = async () => {
    try {
      setLoading(true);
      
      // Get user's XP and level
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      
      setXp(profile?.xp || 0);
      setLevel(profile?.level || 1);
      
      // Get most recent XP activity
      const { data: activities, error: activitiesError } = await supabase
        .from('xp_activities')
        .select('xp_earned, activity_type, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (activitiesError) throw activitiesError;
      
      if (activities && activities.length > 0) {
        setRecentXp({
          amount: activities[0].xp_earned,
          source: formatActivityType(activities[0].activity_type),
          timestamp: new Date(activities[0].created_at)
        });
      }
      
    } catch (error) {
      console.error('Error loading XP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatActivityType = (type: string): string => {
    switch (type) {
      case 'transaction_upload': return 'Transaction Upload';
      case 'receipt_scan': return 'Receipt Scan';
      case 'ai_categorization': return 'AI Categorization';
      case 'streak_bonus': return 'Streak Bonus';
      case 'login': return 'Daily Login';
      case 'subscription_upgrade': return 'Premium Upgrade';
      default: return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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

  const getLevelIcon = () => {
    if (level >= 30) return <Crown size={24} className="text-yellow-600" />;
    if (level >= 20) return <Trophy size={24} className="text-orange-600" />;
    if (level >= 10) return <Award size={24} className="text-blue-600" />;
    return <Star size={24} className="text-primary-600" />;
  };

  const getLevelTitle = () => {
    if (level < 5) return 'Beginner';
    if (level < 10) return 'Explorer';
    if (level < 15) return 'Enthusiast';
    if (level < 20) return 'Expert';
    if (level < 30) return 'Master';
    return 'Legend';
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg h-32 ${className}`}></div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <XPProgressRing size="sm" showLevel={false} showNextMilestone={false} />
        <div>
          <div className="flex items-center space-x-1">
            <span className="font-semibold">Level {level}</span>
            <span className="text-xs text-gray-500">({getLevelTitle()})</span>
          </div>
          <div className="text-xs text-gray-600 flex items-center">
            <Zap size={12} className="text-yellow-500 mr-1" />
            {xp.toLocaleString()} XP total
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getLevelIcon()}
          <h3 className="font-semibold text-gray-900">XP Progress</h3>
        </div>
        <div className="text-sm text-gray-500">
          {xp.toLocaleString()} XP total
        </div>
      </div>
      
      <div className="flex items-center space-x-6">
        <XPProgressRing size="md" />
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900">Level {level}</span>
              <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-800 rounded-full">
                {getLevelTitle()}
              </span>
            </div>
            <span className="text-sm text-gray-600">
              {Math.round(getProgress())}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${getProgress()}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full"
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <TrendingUp size={12} />
              <span>{getXpToNextLevel()} XP to Level {level + 1}</span>
            </div>
            
            {recentXp && (
              <div className="flex items-center space-x-1">
                <Zap size={12} className="text-yellow-500" />
                <span>+{recentXp.amount} XP from {recentXp.source}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelCard;
