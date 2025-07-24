import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  Zap, 
  Star, 
  Award,
  Calendar,
  Upload,
  Camera,
  FileText,
  Brain
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import XPProgressRing from './XPProgressRing';
import LevelCard from './LevelCard';
import DailyGoals from './DailyGoals';
import StreakTracker from './StreakTracker';
import BadgeSystem from './BadgeSystem';
import TaskCard from './TaskCard';
import toast from 'react-hot-toast';

interface GamificationDashboardProps {
  compact?: boolean;
  className?: string;
}

const GamificationDashboard = ({ compact = false, className = '' }: GamificationDashboardProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    xp: 0,
    level: 1,
    streak: 0,
    badgesEarned: 0,
    totalBadges: 0,
    lastActivity: null as Date | null
  });
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadUserStats();
      loadCompletedTasks();
    }
  }, [user]);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      
      // Get user profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('xp, level, streak, last_activity_date')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      
      // Get badge counts
      const { data: badges, error: badgesError } = await supabase
        .from('badges')
        .select('id')
        .eq('user_id', user?.id);

      if (badgesError) throw badgesError;
      
      // For total badges count, we'll use a fixed number for now
      // In a real app, you'd query this from a badges_definitions table
      const totalBadges = 11; // Matches the number in BadgeSystem.tsx
      
      setUserStats({
        xp: profile?.xp || 0,
        level: profile?.level || 1,
        streak: profile?.streak || 0,
        badgesEarned: badges?.length || 0,
        totalBadges,
        lastActivity: profile?.last_activity_date ? new Date(profile.last_activity_date) : null
      });
      
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedTasks = async () => {
    try {
      // Get today's activities to determine completed tasks
      const today = new Date().toISOString().split('T')[0];
      
      const { data: activities } = await supabase
        .from('xp_activities')
        .select('activity_type')
        .eq('user_id', user?.id)
        .gte('created_at', today);
      
      if (activities) {
        const completedTypes = activities.map(a => a.activity_type);
        setCompletedTasks(completedTypes);
      }
    } catch (error) {
      console.error('Error loading completed tasks:', error);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`card ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Trophy size={20} className="text-primary-600" />
            <h3 className="font-semibold text-gray-900">Your Progress</h3>
          </div>
          <Link to="/badges" className="text-sm text-primary-600 hover:text-primary-700">
            View All
          </Link>
        </div>
        
        <div className="flex items-center justify-between">
          <LevelCard compact />
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Award size={16} className="text-yellow-600" />
              <span className="text-sm font-medium">
                {userStats.badgesEarned}/{userStats.totalBadges}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar size={16} className="text-orange-600" />
              <span className="text-sm font-medium">
                {userStats.streak} day streak
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-3 mb-4"
      >
        <Trophy size={32} className="text-primary-600" />
        <div>
          <h2 className="text-2xl font-bold">Gamification Dashboard</h2>
          <p className="text-gray-600">Track your progress and earn rewards</p>
        </div>
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Level Card */}
          <LevelCard />
          
          {/* Daily Goals */}
          <div className="card">
            <DailyGoals />
          </div>
          
          {/* Task Cards */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Target size={20} className="text-primary-600" />
              <h3 className="font-semibold text-gray-900">XP Opportunities</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TaskCard
                title="Upload a Statement"
                description="Import your bank statement to track expenses"
                xpReward={15}
                icon={<Upload size={24} />}
                completed={completedTasks.includes('file_upload')}
                onClick={() => window.location.href = '/upload'}
              />
              
              <TaskCard
                title="Scan a Receipt"
                description="Use OCR to scan and process a receipt"
                xpReward={10}
                icon={<Camera size={24} />}
                completed={completedTasks.includes('receipt_scan')}
                onClick={() => window.location.href = '/scan-receipt'}
              />
              
              <TaskCard
                title="AI Categorization"
                description="Use AI to categorize your transactions"
                xpReward={20}
                icon={<Brain size={24} />}
                completed={completedTasks.includes('ai_categorization')}
                onClick={() => window.location.href = '/ai-categorizer'}
              />
              
              <TaskCard
                title="Complete Your Profile"
                description="Add a profile picture and display name"
                xpReward={5}
                icon={<Star size={24} />}
                completed={completedTasks.includes('profile_update')}
                onClick={() => window.location.href = '/settings/profile'}
              />
            </div>
          </div>
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          {/* Streak Tracker */}
          <StreakTracker compact={false} />
          
          {/* Badges Preview */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Award size={20} className="text-yellow-600" />
                <h3 className="font-semibold text-gray-900">Achievements</h3>
              </div>
              <Link to="/badges" className="text-sm text-primary-600 hover:text-primary-700">
                View All
              </Link>
            </div>
            
            <BadgeSystem compact showProgress={false} />
          </div>
          
          {/* XP Leaderboard Teaser */}
          <div className="card bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Trophy size={20} className="text-primary-600" />
                <h3 className="font-semibold text-gray-900">XP Leaderboard</h3>
              </div>
              <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Compete with other users to earn the most XP and climb the leaderboard!
            </p>
            
            <div className="text-center">
              <button
                onClick={() => toast.success('Leaderboard coming soon!')}
                className="btn-outline text-sm"
              >
                Get Notified
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamificationDashboard;
