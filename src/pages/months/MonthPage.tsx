import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeft,
  ChevronRight,
  Calendar, 
  Zap,
  Brain,
  MessageCircle,
  BarChart2,
  PieChart,
  Target,
  DollarSign, 
  FileText,
  MapPin,
  Repeat,
  Shield,
  Star,
  Users,
  Briefcase,
  FlaskConical,
  TrendingUp,
  BookOpen,
  Share2,
  HelpCircle,
  Download,
  Code,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const tabGroups = [
  {
    label: 'AI-Driven',
    tabs: [
      { key: 'ai-insights', label: 'AI Insights', icon: <Brain size={18} /> },
      { key: 'ai-categorizer', label: 'AI Categorizer', icon: <Zap size={18} /> },
      { key: 'ask-ai', label: 'Ask AI', icon: <MessageCircle size={18} /> },
    ]
  },
  {
    label: 'Financial Analysis',
    tabs: [
      { key: 'trends', label: 'Trends & Charts', icon: <BarChart2 size={18} /> },
      { key: 'budgets', label: 'Budgets', icon: <PieChart size={18} /> },
      { key: 'goals', label: 'Goals', icon: <Target size={18} /> },
    ]
  },
  {
    label: 'Utility & Tracking',
    tabs: [
      { key: 'receipts', label: 'Receipts & OCR', icon: <FileText size={18} /> },
      { key: 'mileage', label: 'Mileage & Travel', icon: <MapPin size={18} /> },
      { key: 'recurring', label: 'Recurring Payments', icon: <Repeat size={18} /> },
      { key: 'tax', label: 'Tax Center', icon: <Shield size={18} /> },
    ]
  },
  {
    label: 'Learning & Reporting',
    tabs: [
      { key: 'scorecard', label: 'Financial Scorecard', icon: <Star size={18} /> },
      { key: 'report', label: 'Monthly Report', icon: <Download size={18} /> },
    ]
  },
  {
    label: 'Collaboration',
    tabs: [
      { key: 'shared', label: 'Shared Access', icon: <Users size={18} /> },
      { key: 'client', label: 'Client View', icon: <Briefcase size={18} /> },
    ]
  },
  {
    label: 'Experimental',
    tabs: [
      { key: 'rules', label: 'Smart Rules (Beta)', icon: <FlaskConical size={18} /> },
      { key: 'forecast', label: 'Financial Forecast', icon: <TrendingUp size={18} /> },
    ]
  },
];

function getMonthIndex(month: string) {
  return monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
}

function getCurrentYear() {
  return new Date().getFullYear();
}

export default function MonthPage() {
  const { month } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tab = searchParams.get('tab') || 'ai-insights';
  const [currentYear, setCurrentYear] = useState(getCurrentYear());

  // Get month index, default to current month if invalid
  const getValidMonthIndex = () => {
    const monthIdx = getMonthIndex(month || '');
    if (monthIdx === -1) {
      // If invalid month, redirect to current month
      const currentMonth = new Date().getMonth();
      navigate(`/months/${monthNames[currentMonth].toLowerCase()}?tab=${tab}`, { replace: true });
      return currentMonth;
    }
    return monthIdx;
  };

  const monthIdx = getValidMonthIndex();

  // Handlers for month navigation
  const goToMonth = (idx: number) => {
    if (idx < 0) {
      // Go to previous year, December
      setCurrentYear(prev => prev - 1);
      navigate(`/months/december?tab=${tab}`);
    } else if (idx > 11) {
      // Go to next year, January
      setCurrentYear(prev => prev + 1);
      navigate(`/months/january?tab=${tab}`);
    } else {
      navigate(`/months/${monthNames[idx].toLowerCase()}?tab=${tab}`);
    }
  };

  // Tab click handler
  const handleTabClick = (tabKey: string) => {
    navigate(`/months/${monthNames[monthIdx].toLowerCase()}?tab=${tabKey}`);
  };

  // Handle year change
  const handleYearChange = (newYear: number) => {
    setCurrentYear(newYear);
  };

  // Get month data (placeholder for now)
  const getMonthData = () => {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      transactions: 0,
      receipts: 0,
      categories: [],
      trends: []
    };
  };

  const monthData = getMonthData();

  return (
    <div className="space-y-6">
      <PageHeader />
      
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-6">
        <button 
          onClick={() => goToMonth(monthIdx - 1)} 
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Previous month"
        >
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {monthNames[monthIdx]} {currentYear}
            </h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleYearChange(currentYear - 1)}
                className="text-sm text-gray-500 hover:text-primary-600 transition-colors px-2 py-1 rounded"
              >
                {currentYear - 1}
              </button>
              <button 
                onClick={() => handleYearChange(currentYear + 1)}
                className="text-sm text-gray-500 hover:text-primary-600 transition-colors px-2 py-1 rounded"
              >
                {currentYear + 1}
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {monthData.transactions} transactions • {monthData.receipts} receipts
          </div>
        </div>
        
        <button 
          onClick={() => goToMonth(monthIdx + 1)} 
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Next month"
        >
          <ChevronRight size={24} className="text-gray-600" />
        </button>
      </div>

      {/* Tab Bar */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="flex flex-wrap gap-1 p-4 border-b bg-gray-50">
          {tabGroups.map(group => (
            <div key={group.label} className="flex items-center gap-1">
              {group.tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => handleTabClick(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    tab === t.key 
                      ? 'bg-primary-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </div>
            
        {/* Tab Content */}
        <div className="p-6">
          {tabGroups.flatMap(g => g.tabs).map(t => (
            <div key={t.key} style={{ display: tab === t.key ? 'block' : 'none' }}>
              <div className="min-h-[400px]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{t.label}</h2>
                  <div className="text-sm text-gray-500">
                    {monthNames[monthIdx]} {currentYear}
                  </div>
                </div>
                
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    {t.icon}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {t.label} for {monthNames[monthIdx]} {currentYear}
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    This feature will be implemented with real data and functionality. 
                    Currently showing placeholder content for demonstration purposes.
                  </p>
                  
                  {/* Quick stats for some tabs */}
                  {t.key === 'ai-insights' && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">0</div>
                        <div className="text-sm text-blue-600">AI Insights</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">0</div>
                        <div className="text-sm text-green-600">Smart Categories</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">0</div>
                        <div className="text-sm text-purple-600">Predictions</div>
                      </div>
                    </div>
                  )}
                  
                  {t.key === 'trends' && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">$0</div>
                        <div className="text-sm text-orange-600">Total Income</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">$0</div>
                        <div className="text-sm text-red-600">Total Expenses</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">0</div>
                        <div className="text-sm text-gray-600">Transactions</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
