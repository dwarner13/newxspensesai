import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  Award, 
  Zap, 
  CheckCircle, 
  Camera, 
  Brain, 
  FileText,
  ChevronRight,
  Flame
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface GamificationDashboardProps {
  compact?: boolean;
  className?: string;
}

const MobileGamificationDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    xp: 0,
    level: 1,
    streak: 0
  });
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [weeklyMissions, setWeeklyMissions] = useState([
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
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('xp, level, streak, last_activity_date')
        .eq('id', user?.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        // Create a default profile if it doesn't exist
        await supabase
          .from('profiles')
          .upsert({
            id: user?.id,
            xp: 0,
            level: 1,
            streak: 0,
            last_activity_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        setUserStats({
          xp: 0,
          level: 1,
          streak: 0
        });
      } else {
        setUserStats({
          xp: profile?.xp || 0,
          level: profile?.level || 1,
          streak: profile?.streak || 0
        });
      }
      
      // In a real app, we would load completed tasks from the database
      // For now, we'll simulate some completed tasks
      setCompletedTasks(['daily_login']);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="mobile-dashboard-container p-4">
      {/* Dashboard Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-header mb-4"
      >
        <h2 className="text-xl font-bold">Welcome back, {user?.email?.split('@')[0] || 'User'} 👋</h2>
        <p className="text-sm text-gray-600">
          You've earned <strong className="text-primary-600">{userStats.xp} XP</strong> so far. Keep going!
        </p>
        <div className="floating-xp-bar mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(userStats.xp % 100) / 100 * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
          />
        </div>
      </motion.div>

      {/* Dashboard Cards */}
      <div className="dashboard-cards space-y-4">
        {/* XP Level Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-white p-4 rounded-xl shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Trophy size={18} className="text-primary-600 mr-2" />
              XP Level
            </h3>
            <span className="text-sm bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
              {userStats.level < 5 ? 'Beginner' : 
               userStats.level < 10 ? 'Explorer' : 
               userStats.level < 15 ? 'Enthusiast' : 
               userStats.level < 20 ? 'Expert' : 
               userStats.level < 30 ? 'Master' : 'Legend'}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-lg">
              {userStats.level}
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Level {userStats.level}</span>
                <span>{Math.round((userStats.xp % 100) / 100 * 100)}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(userStats.xp % 100) / 100 * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full"
                />
              </div>
              
              <div className="flex items-center mt-1 text-xs text-gray-600">
                <Zap size={12} className="text-yellow-500 mr-1" />
                <span>{userStats.xp} / {(userStats.level) * 100} XP</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-white p-4 rounded-xl shadow"
        >
          <h3 className="font-semibold text-gray-900 flex items-center mb-3">
            <Flame size={18} className="text-orange-500 mr-2" />
            Daily Streak
          </h3>
          
          <p className="text-sm text-gray-700 mb-3">
            {userStats.streak}-day streak – keep it up!
          </p>
          
          <div className="streak-tracker flex justify-center space-x-2 mb-3">
            {[...Array(7)].map((_, i) => (
              <span 
                key={i} 
                className={`dot w-3 h-3 rounded-full ${
                  i < userStats.streak ? 'bg-orange-500' : 'bg-gray-200'
                }`}
              ></span>
            ))}
          </div>
          
          <div className="text-xs text-center text-gray-600">
            {userStats.streak < 7 ? (
              <span>{7 - userStats.streak} more days to earn +25 XP bonus!</span>
            ) : (
              <span>Streak goal reached! 🎉</span>
            )}
          </div>
        </motion.div>

        {/* Weekly Missions Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card bg-white p-4 rounded-xl shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <CheckCircle size={18} className="text-primary-600 mr-2" />
              Weekly Missions
            </h3>
            <Link to="/gamification" className="text-xs text-primary-600">
              View All
            </Link>
          </div>
          
          <div className="space-y-3">
            {weeklyMissions.map((mission, index) => (
              <div 
                key={index}
                className="p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {mission.icon}
                    <span className="ml-2 text-sm font-medium">{mission.mission}</span>
                  </div>
                  <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                    +{mission.xpReward} XP
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-secondary-500 h-1.5 rounded-full"
                    style={{ width: `${(mission.progress / mission.goal) * 100}%` }}
                  />
                </div>
                
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>{mission.progress} / {mission.goal}</span>
                  <Link 
                    to={mission.mission.includes("receipt") ? "/scan-receipt" : "/ai-categorizer"}
                    className="text-primary-600 flex items-center"
                  >
                    Complete <ChevronRight size={12} className="ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card bg-white p-4 rounded-xl shadow"
        >
          <h3 className="font-semibold text-gray-900 flex items-center mb-3">
            <Zap size={18} className="text-yellow-500 mr-2" />
            Quick XP Actions
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <Link 
              to="/scan-receipt"
              className="p-3 bg-primary-50 rounded-lg flex flex-col items-center text-center"
            >
              <Camera size={24} className="text-primary-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Scan Receipt</span>
              <span className="text-xs text-primary-600">+10 XP</span>
            </Link>
            
            <Link 
              to="/upload"
              className="p-3 bg-secondary-50 rounded-lg flex flex-col items-center text-center"
            >
              <FileText size={24} className="text-secondary-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Upload CSV</span>
              <span className="text-xs text-secondary-600">+15 XP</span>
            </Link>
            
            <Link 
              to="/ai-categorizer"
              className="p-3 bg-purple-50 rounded-lg flex flex-col items-center text-center"
            >
              <Brain size={24} className="text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">AI Categorize</span>
              <span className="text-xs text-purple-600">+20 XP</span>
            </Link>
            
            <Link 
              to="/badges"
              className="p-3 bg-yellow-50 rounded-lg flex flex-col items-center text-center"
            >
              <Award size={24} className="text-yellow-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Badges</span>
              <span className="text-xs text-yellow-600">View All</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MobileGamificationDashboard;
