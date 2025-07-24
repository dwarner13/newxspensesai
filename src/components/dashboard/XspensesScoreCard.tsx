import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Info, 
  AlertTriangle,
  Zap,
  BarChart2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface XspensesScoreCardProps {
  className?: string;
  darkMode?: boolean;
  compact?: boolean;
}

const XspensesScoreCard = ({ 
  className = '', 
  darkMode = false,
  compact = false
}: XspensesScoreCardProps) => {
  const { user } = useAuth();
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [scoreHistory, setScoreHistory] = useState<{date: string, score: number}[]>([]);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (user) {
      calculateScore();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateScore = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would be an API call to a backend service
      // that calculates the score based on the user's financial data
      // For demo purposes, we'll generate a random score
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use mock data in development mode
      if (import.meta.env.DEV) {
        const mockScore = Math.floor(Math.random() * (850 - 650 + 1) + 650);
        setScore(mockScore);
        setPreviousScore(mockScore - Math.floor(Math.random() * 20) - 10);
        setLoading(false);
        return;
      }
      
      // Use mock data in development mode
      const mockTransactions = [
        { type: 'Credit', amount: 5000, category: 'Income' },
        { type: 'Debit', amount: 1200, category: 'Food' },
        { type: 'Debit', amount: 800, category: 'Transportation' }
      ];
      
      const mockProfile = { streak: 7 };
      
      const transactions = import.meta.env.DEV ? mockTransactions : [];
      const profile = import.meta.env.DEV ? mockProfile : null;
      
      // Calculate score components
      // In a real app, this would be a complex calculation based on various factors
      
      // 1. Budget Balance (30%) - Income vs expenses ratio
      const incomeTotal = transactions?.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amount, 0) || 0;
      const expensesTotal = transactions?.filter(t => t.type === 'Debit').reduce((sum, t) => sum + t.amount, 0) || 0;
      
      const budgetRatio = incomeTotal > 0 ? (incomeTotal - expensesTotal) / incomeTotal : 0;
      const budgetScore = Math.min(Math.max(budgetRatio * 300, 0), 300); // 0-300 points (30%)
      
      // 2. Debt-to-Income Ratio (20%) - Simulated for demo
      const debtToIncomeScore = Math.random() * 200; // 0-200 points (20%)
      
      // 3. Spending Trends (20%) - Simulated for demo
      const spendingTrendsScore = Math.random() * 200; // 0-200 points (20%)
      
      // 4. Goal Progress (10%) - Based on profile data
      const goalProgressScore = profile?.streak ? Math.min(profile.streak * 10, 100) : Math.random() * 100; // 0-100 points (10%)
      
      // 5. Document Usage (10%) - Based on transaction count
      const documentUsageScore = Math.min((transactions?.length || 0) * 2, 100); // 0-100 points (10%)
      
      // 6. AI Categorization Accuracy (10%) - Simulated for demo
      const aiAccuracyScore = Math.random() * 100; // 0-100 points (10%)
      
      // Calculate total score (0-1000)
      const calculatedScore = Math.round(
        budgetScore + 
        debtToIncomeScore + 
        spendingTrendsScore + 
        goalProgressScore + 
        documentUsageScore + 
        aiAccuracyScore
      );
      
      // Generate previous score (slightly different for trend)
      const prevScore = Math.max(calculatedScore - 20 + Math.floor(Math.random() * 40), 0);
      
      // Generate score history (last 3 months)
      const history = [
        { date: '2 months ago', score: Math.max(prevScore - 30 + Math.floor(Math.random() * 60), 0) },
        { date: '1 month ago', score: prevScore },
        { date: 'Current', score: calculatedScore }
      ];
      
      // Generate AI tip based on score components
      let tip = '';
      if (budgetRatio < 0) {
        tip = "Your expenses exceed your income. Consider reviewing your budget to reduce unnecessary spending.";
      } else if (transactions?.length === 0) {
        tip = "Start tracking your transactions to get personalized financial insights.";
      } else if (Math.random() > 0.5) {
        tip = "Your dining expenses rose 14% this month. Try meal prepping to save money!";
      } else {
        tip = "Setting up automatic savings can help improve your financial health score.";
      }
      
      setScore(calculatedScore);
      setPreviousScore(prevScore);
      setScoreHistory(history);
      setAiTip(tip);
      
    } catch (error) {
      console.error('Error calculating XspensesAI Score:', error);
      toast.error('Failed to calculate your financial score');
    } finally {
      setLoading(false);
    }
  };

  const getScoreRating = (score: number): { label: string, rating: string } => {
    if (score >= 800) return { label: "Financial Pro", rating: "Excellent" };
    if (score >= 650) return { label: "Budget Master", rating: "Good" };
    if (score >= 500) return { label: "On the Right Track", rating: "Fair" };
    return { label: "Room for Improvement", rating: "Needs Work" };
  };

  const getScoreColor = (score: number): string => {
    if (score >= 800) return darkMode ? 'text-green-400' : 'text-green-600';
    if (score >= 650) return darkMode ? 'text-blue-400' : 'text-blue-600';
    if (score >= 500) return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    return darkMode ? 'text-red-400' : 'text-red-600';
  };

  const getScoreTrend = () => {
    if (!score || !previousScore) return null;
    
    const difference = score - previousScore;
    const isPositive = difference > 0;
    
    return {
      difference,
      isPositive,
      text: `${isPositive ? '+' : ''}${difference} points since last month`
    };
  };

  const trend = getScoreTrend();

  if (loading) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6 animate-pulse ${className}`}>
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (score === null) {
    return (
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>XspensesScore™</h3>
          <div className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            New
          </div>
        </div>
        <div className="text-center py-6">
          <AlertTriangle size={40} className={` mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
            Not enough data to calculate your score yet.
          </p>
          <button 
            onClick={() => toast.success('Start by uploading transactions or receipts')}
            className={`px-4 py-2 rounded-lg ${
              darkMode 
                ? 'bg-primary-600 hover:bg-primary-700' 
                : 'bg-primary-600 hover:bg-primary-700'
            } text-white font-medium`}
          >
            Start Tracking
          </button>
        </div>
      </div>
    );
  }

  const { label, rating } = getScoreRating(score);
  const scoreColor = getScoreColor(score);

  if (compact) {
    return (
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center">
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>XspensesScore™</h3>
              <div className={`ml-2 text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                New
              </div>
            </div>
            <div className={`text-2xl font-bold ${scoreColor}`}>{score}</div>
          </div>
          
          <div className="text-right">
            <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</div>
            {trend && (
              <div className={`text-xs flex items-center ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {trend.isPositive ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                {trend.text}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Award size={20} className={darkMode ? 'text-primary-400' : 'text-primary-600'} />
          <h3 className={`ml-2 font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>XspensesScore™</h3>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className={`${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Info size={16} />
          </button>
          
          {showInfo && (
            <div className={`absolute right-0 mt-2 w-64 p-3 rounded-lg shadow-lg z-10 text-sm ${
              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'
            } border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <h4 className="font-medium mb-2">About XspensesScore™</h4>
              <p className="mb-2">A score from 0-1000 that reflects your financial health based on:</p>
              <ul className="space-y-1 text-xs">
                <li>• Budget Balance (30%)</li>
                <li>• Debt-to-Income Ratio (20%)</li>
                <li>• Spending Trends (20%)</li>
                <li>• Goal Progress (10%)</li>
                <li>• Document Usage (10%)</li>
                <li>• AI Categorization (10%)</li>
              </ul>
              <div className="mt-2 pt-2 border-t border-gray-600 text-xs">
                <p>Score ranges:</p>
                <p>800-1000: Excellent</p>
                <p>650-799: Good</p>
                <p>500-649: Fair</p>
                <p>&lt;500: Needs Work</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className={`text-4xl font-bold ${scoreColor}`}>{score}</div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rating: {rating}</div>
        </div>
        
        <div className="text-right">
          <div className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</div>
          {trend && (
            <div className={`text-sm flex items-center justify-end ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
              {trend.text}
            </div>
          )}
        </div>
      </div>
      
      {/* Score Progress Bar */}
      <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score / 10}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${
            score >= 800 ? 'bg-green-500' :
            score >= 650 ? 'bg-blue-500' :
            score >= 500 ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
        />
      </div>
      
      {/* Next Milestone */}
      <div className="flex items-center justify-between text-xs mb-4">
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>0</span>
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>500</span>
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>650</span>
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>800</span>
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>1000</span>
      </div>
      
      {/* Score History Graph (simplified) */}
      <div className="h-20 mb-4 relative">
        <div className="absolute inset-0 flex items-end justify-between">
          {scoreHistory.map((point, index) => (
            <div key={index} className="flex flex-col items-center">
              <div 
                className={`w-2 rounded-t-sm ${
                  point.score >= 800 ? 'bg-green-500' :
                  point.score >= 650 ? 'bg-blue-500' :
                  point.score >= 500 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} 
                style={{ height: `${(point.score / 1000) * 100}%` }}
              ></div>
              <span className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {point.date}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* AI Tip */}
      {aiTip && (
        <div className={`p-3 rounded-lg ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        } mb-2`}>
          <div className="flex items-start">
            <Zap size={16} className={`mr-2 mt-0.5 flex-shrink-0 ${darkMode ? 'text-primary-400' : 'text-primary-600'}`} />
            <div>
              <div className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                AI Tip:
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {aiTip}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Next Milestone */}
      <div className="text-center">
        <div className="flex items-center justify-center">
          <BarChart2 size={14} className={`mr-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {score < 800 ? (
              <>Next Milestone: {score < 500 ? 500 : score < 650 ? 650 : 800} – {
                score < 500 ? "On the Right Track" : score < 650 ? "Budget Master" : "Financial Pro"
              }!</>
            ) : (
              <>You've reached the highest tier: Financial Pro!</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default XspensesScoreCard;
