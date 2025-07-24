import { useState } from 'react';
import { useAtom } from 'jotai';
import { mockModeAtom, dashboardDataAtom } from '../../utils/mockState';
import { mockDashboardData } from '../../utils/mockDashboardData';
import { Database, FlaskRound as Flask, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface MockModeToggleProps {
  className?: string;
}

const MockModeToggle = ({ className = '' }: MockModeToggleProps) => {
  const [mockMode, setMockMode] = useAtom(mockModeAtom);
  const [, setDashboardData] = useAtom(dashboardDataAtom);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleMockMode = () => {
    const newMode = !mockMode;
    setMockMode(newMode);
    
    if (newMode) {
      // Set mock data
      setDashboardData({
        income: mockDashboardData.totalIncome,
        expenses: mockDashboardData.totalExpenses,
        savingsRate: mockDashboardData.savingsRate,
        net: mockDashboardData.netSavings,
        categoryTotals: mockDashboardData.categoryTotals,
        transactions: mockDashboardData.transactions
      });
      toast.success('Mock mode enabled');
    } else {
      // Clear mock data
      setDashboardData(null);
      toast.success('Mock mode disabled');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        title="Mock Mode Settings"
      >
        <Flask size={20} className={mockMode ? "text-purple-600" : "text-gray-500"} />
      </button>
      
      {isExpanded && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Database size={16} className="text-gray-500 mr-2" />
              <span className="font-medium text-gray-900">Mock Mode</span>
            </div>
            <button
              onClick={toggleMockMode}
              className="focus:outline-none"
            >
              {mockMode ? (
                <ToggleRight size={24} className="text-purple-600" />
              ) : (
                <ToggleLeft size={24} className="text-gray-400" />
              )}
            </button>
          </div>
          
          <p className="text-xs text-gray-500">
            {mockMode 
              ? "Using mock data for development and testing" 
              : "Using live data from Supabase"}
          </p>
          
          {mockMode && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-purple-700">Mock Mode Active</p>
              <p className="text-xs text-gray-500">All data is simulated and changes will not be saved</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MockModeToggle;
