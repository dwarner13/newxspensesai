import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Star, 
  Zap, 
  Trophy, 
  Target, 
  Flame,
  TrendingUp,
  Award,
  Crown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface XPDisplayProps {
  showDetails?: boolean;
  className?: string;
}

interface ProfileXP {
  xp: number;
  level: number;
  streak: number;
  last_activity_date: string | null;
}

interface XPActivity {
  id: string;
  activity_type: string;
  xp_earned: number;
  description: string;
  created_at: string;
}

const XPDisplay = ({ showDetails = false, className = '' }: XPDisplayProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileXP | null>(null);
  const [recentActivities, setRecentActivities] = useState<XPActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadXPData();
    }
  }, [user]);

  const loadXPData = async () => {
    try {
      setLoading(true);
      
      // Get profile XP data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('xp, level, streak, last_activity_date')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Get recent XP activities if showing details
      if (showDetails) {
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('xp_activities')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (activitiesError) throw activitiesError;
        setRecentActivities(activitiesData || []);
      }
    } catch (error) {
      console.error('Error loading XP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getXPForNextLevel = (currentLevel: number) => {
    return Math.pow(currentLevel * 100, 2) / 100;
  };

  const getXPForCurrentLevel = (currentLevel: number) => {
    if (currentLevel <= 1) return 0;
    return Math.pow((currentLevel - 1) * 100, 2) / 100;
  };

  const getProgressToNextLevel = () => {
    if (!profile) return 0;
    
    const currentLevelXP = getXPForCurrentLevel(profile.level);
    const nextLevelXP = getXPForNextLevel(profile.level);
    const progressXP = profile.xp - currentLevelXP;
    const requiredXP = nextLevelXP - currentLevelXP;
    
    return Math.min((progressXP / requiredXP) * 100, 100);
  };

  const getLevelIcon = (level: number) => {
    if (level >= 50) return <Crown className="text-purple-600" />;
    if (level >= 25) return <Trophy className="text-yellow-600" />;
    if (level >= 10) return <Award className="text-blue-600" />;
    return <Star className="text-gray-600" />;
  };

  const getLevelColor = (level: number) => {
    if (level >= 50) return 'from-purple-500 to-pink-500';
    if (level >= 25) return 'from-yellow-500 to-orange-500';
    if (level >= 10) return 'from-blue-500 to-cyan-500';
    return 'from-gray-500 to-gray-600';
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'receipt_scan':
        return <Zap size={16} className="text-primary-600" />;
      case 'transaction_upload':
        return <TrendingUp size={16} className="text-success-600" />;
      case 'streak_bonus':
        return <Flame size={16} className="text-orange-600" />;
      case 'login':
        return <Target size={16} className="text-blue-600" />;
      default:
        return <Star size={16} className="text-gray-600" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-16 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!profile) return null;

  const progress = getProgressToNextLevel();
  const nextLevelXP = getXPForNextLevel(profile.level) - profile.xp;

  return (
    <div className={className}>
      {/* Main XP Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-4 border border-primary-100"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Level Badge */}
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getLevelColor(profile.level)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
              {profile.level}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-gray-900">Level {profile.level}</h3>
                {getLevelIcon(profile.level)}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Star size={14} className="text-primary-600" />
                  <span>{profile.xp.toLocaleString()} XP</span>
                </div>
                
                {profile.streak > 0 && (
                  <div className="flex items-center space-x-1">
                    <Flame size={14} className="text-orange-600" />
                    <span>{profile.streak} day streak</span>
                  </div>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress to Level {profile.level + 1}</span>
                  <span>{Math.ceil(nextLevelXP)} XP needed</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Detailed View */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 space-y-4"
        >
          {/* XP Earning Tips */}
          <div className="card">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Target size={20} className="mr-2 text-primary-600" />
              Earn More XP
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-3 p-3 bg-primary-50 rounded-lg">
                <Zap size={16} className="text-primary-600" />
                <div>
                  <p className="font-medium">Scan Receipts</p>
                  <p className="text-gray-600">+10 XP per receipt</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-success-50 rounded-lg">
                <TrendingUp size={16} className="text-success-600" />
                <div>
                  <p className="font-medium">Upload Transactions</p>
                  <p className="text-gray-600">+5 XP per transaction</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                <Flame size={16} className="text-orange-600" />
                <div>
                  <p className="font-medium">Daily Streak</p>
                  <p className="text-gray-600">+25 XP every 7 days</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <Target size={16} className="text-blue-600" />
                <div>
                  <p className="font-medium">Daily Login</p>
                  <p className="text-gray-600">+2 XP per day</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          {recentActivities.length > 0 && (
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Star size={20} className="mr-2 text-primary-600" />
                Recent XP Activities
              </h4>
              <div className="space-y-2">
                {recentActivities.map((activity) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {getActivityIcon(activity.activity_type)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(activity.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-primary-600">
                      +{activity.xp_earned} XP
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default XPDisplay;
