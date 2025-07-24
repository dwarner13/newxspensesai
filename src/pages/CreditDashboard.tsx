import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronDown, 
  Info, 
  AlertTriangle, 
  Download, 
  ChevronRight,
  Key,
  Home,
  CreditCard,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const CreditDashboard = () => {
  const { user } = useAuth();
  const [creditScore, setCreditScore] = useState(682);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({
    display_name: '',
    xp: 0,
    level: 1,
    streak: 0,
    role: 'free'
  });
  const [scoreChange, setScoreChange] = useState(0);
  const [lastUpdated, setLastUpdated] = useState('Jun 8');
  const [nextUpdate, setNextUpdate] = useState('today');
  const [newInquiries, setNewInquiries] = useState(2);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, xp, level, streak, role')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      setUserProfile({
        display_name: data.display_name || user?.email?.split('@')[0] || 'User',
        xp: data.xp || 0,
        level: data.level || 1,
        streak: data.streak || 0,
        role: data.role || 'free'
      });
      
      // Simulate credit score data
      setCreditScore(Math.floor(Math.random() * (750 - 650 + 1) + 650));
      setScoreChange(Math.floor(Math.random() * 20) - 10);
      
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-indigo-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Status Bar */}
      <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
        <div className="text-xl font-bold">6:01</div>
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-1 h-3 bg-white opacity-30 rounded-sm"></div>
            <div className="w-1 h-4 bg-white opacity-40 rounded-sm"></div>
            <div className="w-1 h-5 bg-white opacity-50 rounded-sm"></div>
            <div className="w-1 h-6 bg-white opacity-70 rounded-sm"></div>
          </div>
          <span>LTE</span>
          <div className="bg-white text-indigo-900 rounded-full px-2 text-xs font-bold">
            82%
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-indigo-900 text-white p-4 flex justify-between items-center">
        <Link to="/" className="text-white">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">Your Equifax<sup>®</sup></h1>
        <div className="w-8 h-8 bg-white bg-opacity-10 rounded-full flex items-center justify-center">
          <Info size={18} />
        </div>
      </div>

      {/* Credit Report Title */}
      <div className="bg-indigo-900 text-white px-6 pb-20">
        <h2 className="text-4xl font-bold">Credit Report</h2>
      </div>

      {/* Main Content */}
      <div className="px-4 -mt-16">
        {/* Credit Score Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-indigo-600 text-white rounded-lg shadow-lg p-6 mb-4"
        >
          <div className="flex justify-between">
            <div>
              <div className="text-sm opacity-80 mb-1">Credit Score</div>
              <div className="text-4xl font-bold">{creditScore}</div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-80 mb-1">Report last pulled</div>
              <div className="text-lg">Jun 15, 2025</div>
            </div>
          </div>
        </motion.div>

        {/* Download Button */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-indigo-600 text-white rounded-full py-4 font-bold flex items-center justify-center mb-6"
        >
          DOWNLOAD CREDIT REPORT
          <Download size={18} className="ml-2" />
        </motion.button>

        {/* Sections */}
        <div className="space-y-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold text-gray-800">Trades and Accounts</div>
              <div className="text-indigo-600 font-semibold">14 items</div>
            </div>
            <ChevronRight size={24} className="text-indigo-600" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold text-gray-800">Inquiries</div>
              <div className="text-indigo-600 font-semibold">46 items</div>
            </div>
            <ChevronRight size={24} className="text-indigo-600" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold text-gray-800">Collections</div>
              <div className="text-indigo-600 font-semibold">1 item</div>
            </div>
            <ChevronRight size={24} className="text-indigo-600" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold text-gray-800">Legal Items</div>
              <div className="text-indigo-600 font-semibold">No report items</div>
            </div>
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white">
              <Info size={18} />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold text-gray-800">Bankruptcies</div>
              <div className="text-indigo-600 font-semibold">1 item</div>
            </div>
            <ChevronRight size={24} className="text-indigo-600" />
          </motion.div>
        </div>

        {/* Recommendation Banner */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 mb-20 bg-white rounded-lg shadow p-4 flex items-center"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
            <img src="https://images.pexels.com/photos/7821485/pexels-photo-7821485.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" alt="Logo" className="w-6 h-6 rounded-full" />
          </div>
          <div className="flex-1">
            <div className="text-gray-800 font-medium">
              Try our improved product recommendations engine.
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center p-2">
        <Link to="/" className="flex flex-col items-center p-2">
          <Home size={24} className="text-gray-400" />
          <span className="text-xs text-gray-500">Dashboard</span>
        </Link>
        <Link to="/report" className="flex flex-col items-center p-2">
          <TrendingUp size={24} className="text-indigo-600" />
          <span className="text-xs text-indigo-600 font-medium">Report</span>
        </Link>
        <Link to="/build" className="flex flex-col items-center p-2 relative">
          <div className="relative">
            <CreditCard size={24} className="text-gray-400" />
            <div className="absolute -top-1 -right-1 bg-teal-500 text-white text-xs px-1 rounded-sm">
              NEW
            </div>
          </div>
          <span className="text-xs text-gray-500">Build</span>
        </Link>
        <Link to="/rent" className="flex flex-col items-center p-2">
          <Key size={24} className="text-gray-400" />
          <span className="text-xs text-gray-500">Rent</span>
        </Link>
        <Link to="/recommend" className="flex flex-col items-center p-2 relative">
          <div className="relative">
            <div className="text-gray-400">⭐</div>
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              6
            </div>
          </div>
          <span className="text-xs text-gray-500">Recommend</span>
        </Link>
      </div>
    </div>
  );
};

export default CreditDashboard;
