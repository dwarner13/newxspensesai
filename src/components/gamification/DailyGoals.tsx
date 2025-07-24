import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Upload, 
  Camera, 
  FileText, 
  Zap,
  Calendar,
  Star,
  Brain
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Goal {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  icon: React.ReactNode;
  completed: boolean;
  path: string;
  key: string;
}

const DailyGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayDate, setTodayDate] = useState('');

  useEffect(() => {
    if (user) {
      loadGoals();
      setTodayDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
    }
  }, [user]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      
      // Get user's activity for today
      const today = new Date().toISOString().split('T')[0];
      
      const { data: activities } = await supabase
        .from('xp_activities')
        .select('activity_type')
        .eq('user_id', user?.id)
        .gte('created_at', today);
      
      const completedActivities = new Set(activities?.map(a => a.activity_type) || []);
      
      // Define default goals
      const defaultGoals: Goal[] = [
        {
          id: 'upload_statement',
          title: 'Upload a Statement',
          description: 'Upload a bank statement to track your finances',
          xpReward: 15,
          icon: <Upload size={24} />,
          completed: completedActivities.has('file_upload'),
          path: '/upload',
          key: 'file_upload'
        },
        {
          id: 'scan_receipt',
          title: 'Scan a Receipt',
          description: 'Use OCR to scan and process a receipt',
          xpReward: 10,
          icon: <Camera size={24} />,
          completed: completedActivities.has('receipt_scan'),
          path: '/scan-receipt',
          key: 'receipt_scan'
        },
        {
          id: 'categorize_transactions',
          title: 'Categorize Transactions',
          description: 'Use AI to categorize your transactions',
          xpReward: 20,
          icon: <Brain size={24} />,
          completed: completedActivities.has('ai_categorization'),
          path: '/ai-categorizer',
          key: 'ai_categorization'
        }
      ];
      
      setGoals(defaultGoals);
      
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalClick = async (goal: Goal) => {
    if (goal.completed) return;
    
    // For demo purposes, we'll just navigate to the path
    // In a real app, you'd track goal progress here
    
    toast.success(`Navigate to ${goal.path} to complete this goal!`);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const completedGoals = goals.filter(g => g.completed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="text-primary-600">
            <CheckCircle size={20} />
          </div>
          <h3 className="font-semibold text-gray-900">Daily Goals</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar size={16} className="text-gray-500" />
          <span className="text-sm text-gray-500">{todayDate}</span>
        </div>
      </div>
      
      {/* Progress Summary */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Daily Progress</span>
          <span className="text-sm font-medium text-gray-700">{completedGoals}/{goals.length} completed</span>
        </div>
        <div className="w-full bg-white rounded-full h-2.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedGoals / goals.length) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2.5 rounded-full"
          />
        </div>
        
        {completedGoals === goals.length && completedGoals > 0 ? (
          <div className="mt-3 text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-800">
              <CheckCircle size={14} className="mr-1" />
              All goals completed! +25 XP bonus
            </div>
          </div>
        ) : (
          <div className="mt-3 text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
              <Star size={14} className="mr-1" />
              Complete all goals for +25 XP bonus
            </div>
          </div>
        )}
      </div>
      
      {/* Goals List */}
      <div className="space-y-3">
        {goals.map((goal) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center p-3 rounded-lg border ${
              goal.completed 
                ? 'bg-gray-50 border-gray-200' 
                : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm'
            } transition-all duration-200 ${!goal.completed ? 'cursor-pointer' : ''}`}
            onClick={() => !goal.completed && handleGoalClick(goal)}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
              goal.completed ? 'bg-success-100 text-success-600' : 'bg-primary-100 text-primary-600'
            }`}>
              {goal.completed ? <CheckCircle size={20} /> : goal.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`font-medium ${goal.completed ? 'text-gray-500' : 'text-gray-900'}`}>
                  {goal.title}
                </h4>
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  goal.completed ? 'bg-success-100 text-success-800' : 'bg-primary-100 text-primary-800'
                }`}>
                  <Zap size={12} className="mr-1" />
                  {goal.completed ? 'Earned' : `+${goal.xpReward} XP`}
                </div>
              </div>
              <p className={`text-sm truncate ${goal.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                {goal.description}
              </p>
            </div>
            
            {!goal.completed && (
              <Link 
                to={goal.path}
                className="ml-2 p-1 text-primary-600 hover:text-primary-800 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </Link>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DailyGoals;
