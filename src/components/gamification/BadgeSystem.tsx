import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, 
  Star, 
  Crown,
  Target,
  Flame,
  Camera,
  TrendingUp,
  Zap,
  Lock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Badge {
  id: string;
  badge_key: string;
  name: string;
  description: string;
  earned_at: string | null;
  xp_reward: number;
  progress?: number;
  total?: number;
}

interface BadgeSystemProps {
  showProgress?: boolean;
  compact?: boolean;
  className?: string;
}

const BADGE_DEFINITIONS = [
  {
    key: 'first_receipt',
    name: '🧾 First Receipt',
    description: 'Upload your first receipt',
    icon: Camera,
    color: 'from-blue-500 to-blue-600',
    category: 'Getting Started'
  },
  {
    key: 'receipt_explorer',
    name: '📸 Receipt Explorer',
    description: 'Upload 5 receipts',
    icon: Camera,
    color: 'from-green-500 to-green-600',
    category: 'Receipt Master'
  },
  {
    key: 'receipt_master',
    name: '🏆 Receipt Master',
    description: 'Upload 10 receipts',
    icon: Award,
    color: 'from-purple-500 to-purple-600',
    category: 'Receipt Master'
  },
  {
    key: 'receipt_legend',
    name: '👑 Receipt Legend',
    description: 'Upload 25 receipts',
    icon: Crown,
    color: 'from-yellow-500 to-yellow-600',
    category: 'Receipt Master'
  },
  {
    key: 'streak_3',
    name: '🔥 3-Day Streak',
    description: 'Upload for 3 consecutive days',
    icon: Flame,
    color: 'from-orange-500 to-red-500',
    category: 'Consistency'
  },
  {
    key: 'streak_7',
    name: '🔥 7-Day Streak',
    description: 'Upload for 7 consecutive days',
    icon: Flame,
    color: 'from-red-500 to-red-600',
    category: 'Consistency'
  },
  {
    key: 'streak_30',
    name: '🔥 30-Day Streak',
    description: 'Upload for 30 consecutive days',
    icon: Flame,
    color: 'from-red-600 to-red-700',
    category: 'Consistency'
  },
  {
    key: 'level_5',
    name: '🎯 Level 5 Achieved',
    description: 'Reach Level 5',
    icon: Target,
    color: 'from-indigo-500 to-indigo-600',
    category: 'Progression'
  },
  {
    key: 'level_10',
    name: '⭐ Level 10 Master',
    description: 'Reach Level 10',
    icon: Star,
    color: 'from-pink-500 to-pink-600',
    category: 'Progression'
  },
  {
    key: 'transaction_tracker',
    name: '📊 Transaction Tracker',
    description: 'Record 50 transactions',
    icon: TrendingUp,
    color: 'from-teal-500 to-teal-600',
    category: 'Data Master'
  },
  {
    key: 'financial_guru',
    name: '💰 Financial Guru',
    description: 'Record 100 transactions',
    icon: Crown,
    color: 'from-emerald-500 to-emerald-600',
    category: 'Data Master'
  }
];

const BadgeSystem = ({ showProgress = true, compact = false, className = '' }: BadgeSystemProps) => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userStats, setUserStats] = useState({
    receipts: 0,
    transactions: 0,
    streak: 0,
    level: 1
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (user) {
      loadBadges();
      loadUserStats();
    }
  }, [user]);

  const loadBadges = async () => {
    try {
      const { data: earnedBadges, error } = await supabase
        .from('badges')
        .select('*')
        .eq('user_id', user?.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      // Combine earned badges with definitions
      const allBadges = BADGE_DEFINITIONS.map(def => {
        const earned = earnedBadges?.find(b => b.badge_key === def.key);
        return {
          id: earned?.id || def.key,
          badge_key: def.key,
          name: def.name,
          description: def.description,
          earned_at: earned?.earned_at || null,
          xp_reward: earned?.xp_reward || getBadgeXPReward(def.key),
          ...def
        };
      });

      setBadges(allBadges);
    } catch (error) {
      console.error('Error loading badges:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('streak, level, transaction_count')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;

      // Get receipt count
      const { count: receiptCount, error: receiptError } = await supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('processing_status', 'completed');

      if (receiptError) throw receiptError;

      setUserStats({
        receipts: receiptCount || 0,
        transactions: profile?.transaction_count || 0,
        streak: profile?.streak || 0,
        level: profile?.level || 1
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeXPReward = (badgeKey: string): number => {
    const rewards: Record<string, number> = {
      'first_receipt': 10,
      'receipt_explorer': 25,
      'receipt_master': 50,
      'receipt_legend': 100,
      'streak_3': 25,
      'streak_7': 75,
      'streak_30': 200,
      'level_5': 50,
      'level_10': 100,
      'transaction_tracker': 75,
      'financial_guru': 150
    };
    return rewards[badgeKey] || 0;
  };

  const getBadgeProgress = (badge: Badge): { progress: number; total: number } => {
    switch (badge.badge_key) {
      case 'first_receipt':
        return { progress: Math.min(userStats.receipts, 1), total: 1 };
      case 'receipt_explorer':
        return { progress: Math.min(userStats.receipts, 5), total: 5 };
      case 'receipt_master':
        return { progress: Math.min(userStats.receipts, 10), total: 10 };
      case 'receipt_legend':
        return { progress: Math.min(userStats.receipts, 25), total: 25 };
      case 'streak_3':
        return { progress: Math.min(userStats.streak, 3), total: 3 };
      case 'streak_7':
        return { progress: Math.min(userStats.streak, 7), total: 7 };
      case 'streak_30':
        return { progress: Math.min(userStats.streak, 30), total: 30 };
      case 'level_5':
        return { progress: Math.min(userStats.level, 5), total: 5 };
      case 'level_10':
        return { progress: Math.min(userStats.level, 10), total: 10 };
      case 'transaction_tracker':
        return { progress: Math.min(userStats.transactions, 50), total: 50 };
      case 'financial_guru':
        return { progress: Math.min(userStats.transactions, 100), total: 100 };
      default:
        return { progress: 0, total: 1 };
    }
  };

  const categories = ['All', ...Array.from(new Set(BADGE_DEFINITIONS.map(b => b.category)))];
  const filteredBadges = selectedCategory === 'All' 
    ? badges 
    : badges.filter(b => BADGE_DEFINITIONS.find(def => def.key === b.badge_key)?.category === selectedCategory);

  const earnedCount = badges.filter(b => b.earned_at).length;
  const totalCount = badges.length;

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Award size={20} className="text-yellow-600" />
          <span className="font-semibold">{earnedCount}/{totalCount} Badges</span>
        </div>
        <div className="flex -space-x-2">
          {badges.filter(b => b.earned_at).slice(0, 3).map((badge, index) => {
            const def = BADGE_DEFINITIONS.find(d => d.key === badge.badge_key);
            const IconComponent = def?.icon || Award;
            return (
              <div
                key={badge.id}
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${def?.color || 'from-gray-400 to-gray-500'} flex items-center justify-center text-white border-2 border-white`}
                title={badge.name}
              >
                <IconComponent size={14} />
              </div>
            );
          })}
          {earnedCount > 3 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white">
              +{earnedCount - 3}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Award size={24} className="text-yellow-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
              <p className="text-sm text-gray-600">{earnedCount} of {totalCount} badges earned</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-600">{earnedCount}</div>
            <div className="text-xs text-gray-500">badges</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
            <span>Overall Progress</span>
            <span>{Math.round((earnedCount / totalCount) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(earnedCount / totalCount) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredBadges.map((badge, index) => {
              const def = BADGE_DEFINITIONS.find(d => d.key === badge.badge_key);
              const IconComponent = def?.icon || Award;
              const isEarned = !!badge.earned_at;
              const progress = getBadgeProgress(badge);
              const progressPercent = (progress.progress / progress.total) * 100;

              return (
                <motion.div
                  key={badge.badge_key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
                    isEarned
                      ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-md'
                      : 'border-gray-200 bg-gray-50 opacity-75'
                  }`}
                >
                  {/* Badge Icon */}
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isEarned
                        ? `bg-gradient-to-br ${def?.color || 'from-yellow-500 to-orange-500'} text-white shadow-lg`
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {isEarned ? (
                        <IconComponent size={20} />
                      ) : (
                        <Lock size={20} />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className={`font-semibold ${isEarned ? 'text-gray-900' : 'text-gray-500'}`}>
                        {badge.name}
                      </h4>
                      <p className={`text-sm ${isEarned ? 'text-gray-600' : 'text-gray-400'}`}>
                        {badge.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar (for unearned badges) */}
                  {!isEarned && showProgress && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{progress.progress}/{progress.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-yellow-400 to-orange-400 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* XP Reward */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Zap size={14} className={isEarned ? 'text-yellow-600' : 'text-gray-400'} />
                      <span className={`text-sm font-medium ${isEarned ? 'text-yellow-600' : 'text-gray-400'}`}>
                        +{badge.xp_reward} XP
                      </span>
                    </div>
                    
                    {isEarned && (
                      <div className="text-xs text-gray-500">
                        Earned {new Date(badge.earned_at!).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Earned Badge Overlay */}
                  {isEarned && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white shadow-lg"
                    >
                      <Award size={16} />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default BadgeSystem;
