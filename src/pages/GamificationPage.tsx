import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Award, Zap, Target, Camera, Brain, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import XPTracker from '../components/gamification/XPTracker';
import StreakTracker from '../components/gamification/StreakTracker';
import BadgeCard from '../components/gamification/BadgeCard';
import MissionCard from '../components/gamification/MissionCard';

const GamificationPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({
    xp: 0,
    level: 1,
    streak: 0
  });
  const [badges, setBadges] = useState<{
    badge: string;
    description: string;
    earned: boolean;
    progress?: number;
    total?: number;
    xpReward?: number;
  }[]>([
    {
      badge: "Budget Boss",
      description: "Categorize 50 expenses",
      earned: true,
      xpReward: 50
    },
    {
      badge: "Streak Stamina",
      description: "Maintain a 7-day streak",
      earned: false,
      progress: 3,
      total: 7,
      xpReward: 25
    },
    {
      badge: "Receipt Wizard",
      description: "Scan 10 receipts",
      earned: false,
      progress: 4,
      total: 10,
      xpReward: 30
    },
    {
      badge: "AI Explorer",
      description: "Use AI categorizer 5 times",
      earned: false,
      progress: 2,
      total: 5,
      xpReward: 20
    }
  ]);
  const [missions, setMissions] = useState<{
    mission: string;
    xpReward: number;
    progress: number;
    goal: number;
    icon?: React.ReactNode;
  }[]>([
    {
      mission: "Upload 5 receipts",
      xpReward: 50,
      progress: 3,
      goal: 5,
      icon: <Camera size={20} />
    },
    {
      mission: "Use AI categorizer 3x",
      xpReward: 30,
      progress: 0,
      goal: 3,
      icon: <Brain size={20} />
    },
    {
      mission: "Upload a bank statement",
      xpReward: 25,
      progress: 0,
      goal: 1,
      icon: <FileText size={20} />
    }
  ]);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('xp, level, streak')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      setUserProfile({
        xp: data.xp || 0,
        level: data.level || 1,
        streak: data.streak || 0
      });
      
      // In a real app, we would load badges and missions from the database
      // For now, we'll simulate some earned badges based on the user's XP
      if (data.xp > 500) {
        setBadges(prev => prev.map(badge => 
          badge.badge === "Budget Boss" ? { ...badge, earned: true } : badge
        ));
      }
      
      if (data.streak >= 7) {
        setBadges(prev => prev.map(badge => 
          badge.badge === "Streak Stamina" ? { ...badge, earned: true } : badge
        ));
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-3 mb-8"
      >
        <Trophy size={32} className="text-yellow-600" />
        <div>
          <h1 className="text-2xl font-bold">XP & Gamification</h1>
          <p className="text-gray-600">Master your finances while earning XP and unlocking achievements</p>
        </div>
      </motion.div>

      {/* XP Tracker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <XPTracker 
          userLevel={userProfile.level}
          xp={userProfile.xp}
          dailyStreak={userProfile.streak}
        />
      </motion.div>

      {/* Streak Tracker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <StreakTracker 
          current={userProfile.streak}
          goal={7}
          showCalendar={true}
        />
      </motion.div>

      {/* Weekly Missions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center space-x-2 mb-4">
          <Target size={24} className="text-primary-600" />
          <h2 className="text-xl font-semibold">Weekly Missions</h2>
        </div>
        
        <div className="space-y-4">
          {missions.map((mission, index) => (
            <MissionCard
              key={index}
              mission={mission.mission}
              xpReward={mission.xpReward}
              progress={mission.progress}
              goal={mission.goal}
              icon={mission.icon}
              onClick={() => {
                // In a real app, this would navigate to the relevant page
                console.log(`Navigate to complete mission: ${mission.mission}`);
              }}
            />
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Zap size={20} className="text-primary-600" />
            <h3 className="font-semibold text-gray-900">Weekly XP Bonus</h3>
          </div>
          <p className="text-sm text-gray-700">
            Complete all weekly missions to earn a bonus of <span className="font-semibold text-primary-600">+100 XP</span>!
            Reset happens every Sunday at midnight.
          </p>
        </div>
      </motion.div>

      {/* Badges & Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Award size={24} className="text-yellow-600" />
            <h2 className="text-xl font-semibold">Badges & Achievements</h2>
          </div>
          <Link to="/badges" className="text-sm text-primary-600 hover:text-primary-700">
            View All
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {badges.map((badge, index) => (
            <BadgeCard
              key={index}
              badge={badge.badge}
              description={badge.description}
              earned={badge.earned}
              xpReward={badge.xpReward}
              progress={badge.progress}
              total={badge.total}
            />
          ))}
        </div>
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <div className="flex items-center space-x-2 mb-6">
          <Star size={24} className="text-yellow-600" />
          <h2 className="text-xl font-semibold">How XP & Gamification Works</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-primary-50 rounded-lg p-5">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Zap size={24} className="text-primary-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Earn XP</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>Upload statements (+15 XP)</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>Scan receipts (+10 XP)</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>Categorize transactions (+20 XP)</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>Daily login streak (+2 XP/day)</span>
              </li>
            </ul>
          </div>

          <div className="bg-secondary-50 rounded-lg p-5">
            <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mb-4">
              <Target size={24} className="text-secondary-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Level Up</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="text-secondary-600 mr-2">•</span>
                <span>Gain levels as you earn XP</span>
              </li>
              <li className="flex items-start">
                <span className="text-secondary-600 mr-2">•</span>
                <span>Each level requires more XP</span>
              </li>
              <li className="flex items-start">
                <span className="text-secondary-600 mr-2">•</span>
                <span>Unlock new titles and badges</span>
              </li>
              <li className="flex items-start">
                <span className="text-secondary-600 mr-2">•</span>
                <span>Track your financial mastery</span>
              </li>
            </ul>
          </div>

          <div className="bg-accent-50 rounded-lg p-5">
            <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center mb-4">
              <Award size={24} className="text-accent-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Earn Badges</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Complete achievements</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Maintain daily streaks</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Reach milestone levels</span>
              </li>
              <li className="flex items-start">
                <span className="text-accent-600 mr-2">•</span>
                <span>Each badge awards bonus XP</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GamificationPage;
