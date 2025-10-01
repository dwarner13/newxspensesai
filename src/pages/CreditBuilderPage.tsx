import { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  Info, 
  ChevronRight,
  Home,
  CreditCard,
  Key,
  Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const CreditBuilderPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({
    display_name: '',
    xp: 0,
    level: 1,
    streak: 0,
    role: 'free'
  });

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
        <div className="w-8"></div>
        <h1 className="text-2xl font-bold">Build Credit</h1>
        <div className="w-8 h-8 bg-white bg-opacity-10 rounded-full flex items-center justify-center">
          <Info size={18} />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Credit Builder</h2>
        <p className="text-xl text-gray-600 mb-6">Hello {userProfile.display_name}, welcome!</p>

        {/* Overview Card */}
        <div
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <h3 className="text-2xl text-gray-700 mb-4">Overview</h3>
          
          <div className="flex justify-between items-center mb-4">
            <div className="text-gray-700">Next Payment Date</div>
            <div className="font-semibold">Tuesday, June 17</div>
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center text-gray-700">
              Payment Amount
              <ChevronDown size={18} className="ml-1 text-indigo-600" />
            </div>
            <div className="font-semibold">$10</div>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center text-gray-700">
              Credit Builder Savings
              <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white ml-1">
                <Info size={12} />
              </div>
            </div>
            <div className="font-semibold">$0</div>
          </div>
          
          <button className="w-full text-center text-indigo-600 font-bold py-2">
            VIEW AGREEMENTS
          </button>
        </div>

        {/* Improvement Section */}
        <div
          className="mb-6"
        >
          <h3 className="text-xl font-bold text-gray-800">
            Let's further improve your <span className="underline">credit mix</span> and <span className="underline">payment history</span>!
          </h3>
        </div>

        {/* Tradeline Card */}
        <div
          className="bg-white rounded-lg shadow-md p-4 mb-6"
        >
          <div className="flex items-start">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
              <div className="text-yellow-500">⭐</div>
            </div>
            <div className="font-semibold text-gray-800">Open tradeline</div>
          </div>
        </div>

        {/* Rent Advantage Card */}
        <div
          className="bg-white rounded-lg shadow-md p-4 mb-20"
        >
          <div className="flex items-start">
            <div className="w-16 h-16 bg-amber-50 rounded-lg flex items-center justify-center mr-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-md flex items-center justify-center">
                <Check size={20} className="text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 mb-1">Rent Advantage™</h4>
              <p className="text-gray-700 mb-3">
                Improve your credit history using your rent payments.
              </p>
              <button className="text-indigo-600 font-bold">
                LEARN MORE
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center p-2">
        <Link to="/" className="flex flex-col items-center p-2">
          <Home size={24} className="text-gray-400" />
          <span className="text-xs text-gray-500">Dashboard</span>
        </Link>
        <Link to="/report" className="flex flex-col items-center p-2">
          <div className="text-gray-400">📊</div>
          <span className="text-xs text-gray-500">Report</span>
        </Link>
        <Link to="/build" className="flex flex-col items-center p-2 relative">
          <div className="relative">
            <CreditCard size={24} className="text-indigo-600" />
            <div className="absolute -top-1 -right-1 bg-teal-500 text-white text-xs px-1 rounded-sm">
              NEW
            </div>
          </div>
          <span className="text-xs text-indigo-600 font-medium">Build</span>
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

export default CreditBuilderPage;
