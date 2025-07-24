import { useEffect, useState, useCallback } from 'react';
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  Calendar,
  Download,
  FileText,
  ChevronDown,
  Camera,
  Receipt,
  Search,
  Bell,
  Moon,
  Sun,
  User,
  Settings,
  Users,
  CreditCard,
  Zap,
  Layers,
  BookOpen,
  Share2,
  HelpCircle,
  Home,
  RefreshCw,
  Brain,
  FileDown,
  FileUp,
  Sheet,
  ListChecks,
  BarChart2,
  LogOut,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { getTransactions } from '../lib/supabase';
import { Transaction } from '../types/database.types';
import StatCard from '../components/dashboard/StatCard';
import SpendingChart from '../components/dashboard/SpendingChart';
import MonthlyBreakdown from '../components/dashboard/MonthlyBreakdown';
import ChatBot from '../components/chat/ChatBot';
import FileList from '../components/dashboard/FileList';
import AskAI from '../components/AskAI';
import AskAIHighlight from '../components/AskAIHighlight';
import PremiumBadge from '../components/ui/PremiumBadge';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';
import toast from 'react-hot-toast';
import ReceiptsList from '../components/dashboard/ReceiptsList';
import XPProgressRing from '../components/gamification/XPProgressRing';
import XspensesScoreCard from '../components/dashboard/XspensesScoreCard';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { loadDashboardData, addLoadingTimeout } from '../utils/loadDashboardData';
import { useAtom } from 'jotai';
import { isDarkModeAtom, isMobileMenuOpenAtom } from '../lib/uiStore';
import MobileHeader from '../components/layout/MobileHeader';
import { Link, useNavigate } from 'react-router-dom';
import { mockModeAtom, dashboardDataAtom } from '../utils/mockState';
import MockModeToggle from '../components/dashboard/MockModeToggle';
import MockDashboard from '../components/dashboard/MockDashboard';
import { categorizeUncategorizedTransactions } from '../agents/agents/categorizerAgent';
import { matchReceiptsToTransactions } from '../agents/receiptMatcherAgent';
import { trainCategorizerFromUserChanges } from '../agents/categorizationTrainerAgent';
import { generateCategorizationRulesFromTransactions } from '../agents/ruleBuilderAgent';
import { generateMonthlySummary } from '../agents/monthlySummaryAgent';
import { exportTransactions, exportToGoogleSheets } from "../agents/exportAgent";
import GoalCard from '../components/GoalCard';
import GoalSettingPanel from '../components/GoalSettingPanel';
import PageHeader from '../components/layout/PageHeader';

function TopNavbar() {
  const [dark, setDark] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  return (
    <header className="fixed top-0 left-64 right-0 h-16 flex items-center justify-between px-6 bg-white shadow z-10">
      <span className="font-bold text-lg text-primary-700 tracking-tight">XspensesAI</span>
      <div className="flex items-center gap-4">
        <button className="text-gray-500 hover:text-blue-600 transition"><Bell size={20} /></button>
        <button className="text-gray-500 hover:text-blue-600 transition" onClick={() => setDark((d) => !d)}>{dark ? <Sun size={20} /> : <Moon size={20} />}</button>
        <div className="relative">
          <button onClick={() => setDropdown((d) => !d)} className="flex items-center">
            <img src="https://i.pravatar.cc/40?img=3" alt="avatar" className="w-9 h-9 rounded-full border-2 border-gray-200 object-cover" />
          </button>
          {dropdown && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
              <a href="/settings" className="flex items-center px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition text-sm"><User size={16} className="mr-2" /> Account</a>
              <button className="flex items-center w-full px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition text-sm"><LogOut size={16} className="mr-2" /> Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function FinancialCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-4 rounded-md shadow p-4 bg-white">
      <div className={`p-2 rounded-full ${color} bg-opacity-10`}>{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{title}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

const mainPages = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Upload', path: '/upload' },
  { label: 'Transactions', path: '/transactions' },
  { label: 'Receipts', path: '/receipts' },
  { label: 'AI Insights', path: '/ai-insights' },
  { label: 'Goals', path: '/features/personal-business-goals' },
  { label: 'Reports', path: '/reports' },
];

const Dashboard = () => {
  const { user } = useAuth();
  const { userIsAdmin, hasAccess, userPlan } = useAdminAccess();
  const [dashboardData, setDashboardData] = useState(null);
  type TimeframeOption = 'month' | 'year' | 'all' | 'custom' | 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december';
  const [timeframe, setTimeframe] = useState<TimeframeOption>('month');
  const [loading, setLoading] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showReceipts, setShowReceipts] = useState(true);
  const [darkMode, setDarkMode] = useAtom(isDarkModeAtom);
  const [selectedMonth, setSelectedMonth] = useState('June');
  const [, setIsMobileMenuOpen] = useAtom(isMobileMenuOpenAtom);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  
  // Mock mode state
  const [mockMode] = useAtom(mockModeAtom);
  const [rawMockDashboardData] = useAtom(dashboardDataAtom);

  // Helper to normalize mock data to match real dashboardData shape
  const getNormalizedDashboardData = () => {
    if (mockMode && rawMockDashboardData) {
      return {
        transactions: rawMockDashboardData.transactions || [],
        categories: rawMockDashboardData.categories || [],
        stats: {
          income: rawMockDashboardData.income ?? 0,
          expenses: rawMockDashboardData.expenses ?? 0,
          net: rawMockDashboardData.net ?? 0,
          trend: 0 // You can add a mock trend if needed
        }
      };
    }
    return dashboardData;
  };

  const normalizedDashboardData = getNormalizedDashboardData();
  const transactions = normalizedDashboardData?.transactions || [];
  const categories = normalizedDashboardData?.categories || [];
  const stats = normalizedDashboardData?.stats || { income: 0, expenses: 0, net: 0, trend: 0 };

  const [categorizerLoading, setCategorizerLoading] = useState(false);
  const [categorizerResult, setCategorizerResult] = useState<string | null>(null);

  const [receiptMatchLoading, setReceiptMatchLoading] = useState(false);
  const [receiptMatchResult, setReceiptMatchResult] = useState<number | null>(null);

  const [trainerLoading, setTrainerLoading] = useState(false);
  const [trainerResult, setTrainerResult] = useState<number | null>(null);

  const [ruleBuilderLoading, setRuleBuilderLoading] = useState(false);
  const [ruleBuilderResult, setRuleBuilderResult] = useState<number | null>(null);

  const [monthlySummaryLoading, setMonthlySummaryLoading] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState<any[] | null>(null);

  const [exportMonth, setExportMonth] = useState<string>('');
  const [exportLoading, setExportLoading] = useState<'csv' | 'pdf' | null>(null);

  const [googleSheetsLoading, setGoogleSheetsLoading] = useState(false);

  const [goals, setGoals] = useState<any[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);

  const months = ['June', 'May', 'April', 'March', 'February', 'January'];

  const navigate = useNavigate();
  const currentPageIdx = mainPages.findIndex(p => location.pathname.startsWith(p.path));
  const pageTitle = mainPages[currentPageIdx]?.label || 'Dashboard';

  useEffect(() => {
    console.log('✅ Dashboard loaded');
    
    // If in mock mode, skip loading timeout and data loading
    if (mockMode) {
      setLoading(false);
      setLoadingCharts(false);
      setLoadingHistory(false);
      setDataLoaded(true);
      return;
    }
    
    // Set up timeout for loading indicator
    const clearLoadingTimeout = addLoadingTimeout(() => {
      setLoadingTimeout(true);
      
      // If data still hasn't loaded after 10 seconds, retry
      if (!dataLoaded && retryCount < 3) {
        console.warn("⏱ Loading stuck, auto-releasing...");
        setRetryCount(prev => prev + 1);
        loadData();
      }
    }, 10000); // 10 seconds timeout
    
    // Add resize listener for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Defer data loading to allow UI to render first
    const loadDataTimeout = setTimeout(() => {
      if (!dataLoaded && !mockMode) {
        loadData();
      }
    }, 100); // Small delay to let UI render
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearLoadingTimeout();
      clearTimeout(loadDataTimeout);
      // Reset the global flag when component unmounts
      window._loadingDashboard = false;
    };
  }, [retryCount, mockMode, dataLoaded]); // Include all dependencies
  
  // Separate effect for timeframe changes
  useEffect(() => {
    if (dataLoaded && !mockMode) {
      loadData();
    }
  }, [timeframe, mockMode]);
  
  const loadData = useCallback(async () => {
    // Skip loading if in mock mode
    if (mockMode) {
      setLoading(false);
      setLoadingCharts(false);
      setLoadingHistory(false);
      return;
    }
    
    // Prevent duplicate data loading
    if (window._loadingDashboard) {
      console.log('🛑 Dashboard already loading — skipping');
      return;
    }
    
    window._loadingDashboard = true;
    
    setLoading(true);
    setLoadingCharts(true);
    setLoadingHistory(true);
    setLoadingError(null);
    
    try {
      console.log(`🔍 Loading dashboard data for timeframe: ${timeframe}`);
      
      // Only allow valid timeframes for loadDashboardData
      const validTimeframe = ['month', 'year', 'all'].includes(timeframe) ? timeframe : 'month';
      // Load all data in parallel
      const data = await loadDashboardData(validTimeframe as 'month' | 'year' | 'all');
      
      console.log(`✅ Dashboard data received: ${data.transactions.length} transactions`);
      
      setDashboardData(data);
      setDataLoaded(true);
      
      // Reset loading states
      setLoading(false);
      setLoadingCharts(false);
      setLoadingHistory(false);
    } catch (error) {
      console.error('⚠️ Error loading dashboard:', error);
      setLoadingError('Failed to load dashboard data. Please try refreshing the page.');
      toast.error('Failed to load dashboard data. Retrying...');
      
      // Reset loading states on error too
      setLoading(false);
      setLoadingCharts(false);
      setLoadingHistory(false);
    } finally {
      window._loadingDashboard = false;
    }
  }, [mockMode, timeframe]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExportLoading(format);
    toast('Exporting data...');
    try {
      const result = await exportTransactions({ month: exportMonth || undefined, format });
      if (result.success && result.url) {
        const link = document.createElement('a');
        link.href = result.url;
        link.download = format === 'csv' ? 'transactions.csv' : 'transactions.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download ready!');
      } else {
        toast.error(result.message || 'Export failed');
      }
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportToGoogleSheets = async () => {
    setGoogleSheetsLoading(true);
    toast('Syncing to Google Sheets...');
    try {
      // You may want to get the userId and accessToken from context/auth/session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');
      // You need to get the user's Google OAuth access token from your auth/session store
      const accessToken = window.localStorage.getItem('google_access_token'); // Example: adjust as needed
      if (!accessToken) throw new Error('Google access token not found');
      const result = await exportToGoogleSheets({ userId: user.id, month: exportMonth || undefined, accessToken });
      if (result.success && result.url) {
        toast.success('Data synced!');
        window.open(result.url, '_blank');
      } else {
        toast.error(result.message || 'Sync failed.');
      }
    } catch (error) {
      toast.error('Sync failed.');
    } finally {
      setGoogleSheetsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const runCategorizerAgent = async () => {
    setCategorizerLoading(true);
    setCategorizerResult(null);
    try {
      const result = await categorizeUncategorizedTransactions();
      if (result.categorized > 0) {
        setCategorizerResult(`✅ Categorized ${result.categorized} transactions!`);
        toast.success(`Categorized ${result.categorized} transactions!`);
      } else if (result.processed > 0) {
        setCategorizerResult('No new transactions needed categorization.');
        toast('No new transactions needed categorization.');
      } else {
        setCategorizerResult('No uncategorized transactions found.');
        toast('No uncategorized transactions found.');
      }
    } catch (error) {
      setCategorizerResult('❌ Error running categorizer.');
      toast.error('Error running categorizer.');
    } finally {
      setCategorizerLoading(false);
    }
  };

  const runReceiptMatcher = async () => {
    setReceiptMatchLoading(true);
    setReceiptMatchResult(null);
    toast('Matching receipts...');
    try {
      const result = await matchReceiptsToTransactions();
      setReceiptMatchResult(result.matched);
      toast.success('Receipt matching complete!');
      console.log('Receipt matching result:', result);
    } catch (error) {
      toast.error('Receipt matching failed.');
      setReceiptMatchResult(null);
    } finally {
      setReceiptMatchLoading(false);
    }
  };

  const runTrainerAgent = async () => {
    setTrainerLoading(true);
    setTrainerResult(null);
    toast('Training from user changes...');
    try {
      const result = await trainCategorizerFromUserChanges();
      setTrainerResult(result.added + result.updated);
      toast.success('Training complete!');
      console.log('Training result:', result);
    } catch (error) {
      toast.error('Training failed.');
      setTrainerResult(null);
    } finally {
      setTrainerLoading(false);
    }
  };

  const runRuleBuilderAgent = async () => {
    setRuleBuilderLoading(true);
    setRuleBuilderResult(null);
    toast('Generating categorization rules...');
    try {
      const result = await generateCategorizationRulesFromTransactions();
      setRuleBuilderResult(result.created);
      toast.success('Rule generation complete!');
      console.log('Rule builder result:', result);
    } catch (error) {
      toast.error('Rule generation failed.');
      setRuleBuilderResult(null);
    } finally {
      setRuleBuilderLoading(false);
    }
  };

  const runMonthlySummaryAgent = async () => {
    setMonthlySummaryLoading(true);
    setMonthlySummary(null);
    toast('Generating monthly summary...');
    try {
      const result = await generateMonthlySummary();
      setMonthlySummary(result);
      toast.success('Monthly summary ready!');
      console.log('Monthly summary:', result);
    } catch (error) {
      toast.error('Failed to generate summary.');
      setMonthlySummary(null);
    } finally {
      setMonthlySummaryLoading(false);
    }
  };

  const fetchGoalSuggestions = async () => {
    setGoalsLoading(true);
    const res = await fetch("/api/generate-goals", {
      method: "POST",
      body: JSON.stringify({ userId: user?.id || 'dev-user-123' }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    setGoalsLoading(false);
    if (data.goals) {
      // For demo, just show as alert and add to goals as title
      alert("Suggested Goals:\n\n" + data.goals.join("\n"));
      setGoals(data.goals.map((g: string) => ({
        title: g,
        target_amount: 1000,
        current_total: 200,
        category: 'General',
        deadline: '2024-12-31',
      })));
    }
  };

  // If in mock mode, show the mock dashboard
  if (mockMode && rawMockDashboardData) {
    return (
      <div className={`flex h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="px-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex flex-wrap gap-3">
                <select
                  aria-label="Timeframe"
                  className={`input max-w-xs ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as typeof timeframe)}
                >
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom Range...</option>
                </select>
                
                <div className="relative">
                  <button 
                    className={`btn-outline flex items-center ${
                      darkMode 
                        ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' 
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    aria-label="Export data"
                  >
                    <Download size={16} className="mr-2" />
                    Export
                    <ChevronDown size={16} className="ml-2" />
                  </button>
                </div>
                
                <Link to="/upload" className={`btn-primary flex items-center ${
                  darkMode 
                    ? 'bg-primary-600 hover:bg-primary-700' 
                    : 'bg-primary-600 hover:bg-primary-700'
                }`} aria-label="Upload statement">
                  <FileText size={16} className="mr-2" />
                  Upload Statement
                </Link>
                
                <MockModeToggle />
              </div>
            </div>

            <MockDashboard />
          </div>
        </div>

        {/* AskAI Components */}
        <AskAI />
        <AskAIHighlight />
        <ChatBot />
      </div>
    );
  }

  // Show loading state
  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500  mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
          {loadingTimeout && (
            <p className="text-sm text-gray-500 mt-2">
              This is taking longer than usual. Please wait...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Mobile view simplified
  if (isMobile) {
    return (
      <div className="space-y-6 px-4">
        {/* Mobile Header with centered logo and title */}
        <MobileHeader title="Dashboard" />
        
        {/* XspensesScore Card */}
        <XspensesScoreCard darkMode={darkMode} compact={true} />
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link 
            to="/upload"
            className="p-3 bg-primary-50 rounded-lg flex flex-col items-center text-center"
            aria-label="Upload CSV"
          >
            <FileText size={24} className="text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Upload CSV</span>
          </Link>
          
          <Link 
            to="/scan-receipt"
            className="p-3 bg-secondary-50 rounded-lg flex flex-col items-center text-center"
            aria-label="Scan receipt"
          >
            <Camera size={24} className="text-secondary-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Scan Receipt</span>
          </Link>
        </div>
        
        {/* Stats */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Financial Summary</h3>
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Income:</span>
                <span className="font-medium text-success-600">{formatCurrency(stats?.income ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Expenses:</span>
                <span className="font-medium text-error-600">{formatCurrency(stats?.expenses ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Net:</span>
                <span className="font-medium">{formatCurrency(stats?.net ?? 0)}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Recent Receipts */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Recent Receipts</h3>
            <Link to="/receipts" className="text-sm text-primary-600">View All</Link>
          </div>
          <ReceiptsList />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader />
      <div className="flex flex-col min-h-screen mt-0 pt-0">
        <div className={`flex h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
          <div className="flex flex-col flex-1 overflow-y-auto">
            <div className="px-0 pt-0 mt-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex flex-wrap gap-3">
                  <select
                    aria-label="Timeframe"
                    className={`input max-w-xs ${
                      darkMode 
                        ? 'bg-gray-800 border-gray-700 text-white' 
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as typeof timeframe)}
                  >
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                    <option disabled>──────────</option>
                    <option value="january">January</option>
                    <option value="february">February</option>
                    <option value="march">March</option>
                    <option value="april">April</option>
                    <option value="may">May</option>
                    <option value="june">June</option>
                    <option value="july">July</option>
                    <option value="august">August</option>
                    <option value="september">September</option>
                    <option value="october">October</option>
                    <option value="november">November</option>
                    <option value="december">December</option>
                    <option value="custom">Custom Range...</option>
                  </select>
                  {timeframe === 'custom' && (
                    <div className="ml-2">
                      {/* TODO: Replace with a real date range picker */}
                      <span className="text-sm text-gray-500">[Custom date range picker here]</span>
                    </div>
                  )}
                  
                  <div className="relative">
                    <button 
                      className={`btn-outline flex items-center ${
                        darkMode 
                          ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' 
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      aria-label="Export data"
                    >
                      <Download size={16} className="mr-2" />
                      Export
                      <ChevronDown size={16} className="ml-2" />
                    </button>
                    
                    {showExportMenu && (
                      <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-10 ${
                        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                      }`}>
                        <div className="py-1" role="menu">
                          <button
                            className={`flex items-center w-full px-4 py-2 text-sm ${
                              darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              handleExport('pdf');
                              setShowExportMenu(false);
                            }}
                            aria-label="Export as PDF"
                          >
                            <FileText size={16} className="mr-2" />
                            Export as PDF
                          </button>
                          <button
                            className={`flex items-center w-full px-4 py-2 text-sm ${
                              darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              handleExport('csv');
                              setShowExportMenu(false);
                            }}
                            aria-label="Export as CSV"
                          >
                            <Download size={16} className="mr-2" />
                            Export as CSV
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Link to="/upload" className={`btn-primary flex items-center ${
                    darkMode 
                      ? 'bg-primary-600 hover:bg-primary-700' 
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`} aria-label="Upload statement">
                    <FileText size={16} className="mr-2" />
                    Upload Statement
                  </Link>
                  
                  <MockModeToggle />
                </div>
              </div>

              {/* Admin Premium Banner */}
              {userIsAdmin && (
                <div className={`bg-gradient-to-r ${
                  darkMode 
                    ? 'from-purple-900 to-indigo-900 border-purple-800' 
                    : 'from-purple-500 to-indigo-600 border-purple-400'
                } text-white p-4 rounded-lg border mb-6`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <DollarSign size={16} />
                      </div>
                      <div>
                        <h3 className="font-semibold">Admin Dashboard Access</h3>
                        <p className="text-sm text-purple-100">
                          You have full access to all premium features and admin controls.
                        </p>
                      </div>
                    </div>
                    <PremiumBadge variant="badge" size="sm" className="bg-white text-purple-600" />
                  </div>
                </div>
              )}

              {/* XspensesScore Card */}
              <div className="mb-6">
                <XspensesScoreCard darkMode={darkMode} />
              </div>

              {/* Categorizer Agent Button Row */}
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                <div>
                  <button
                    onClick={runCategorizerAgent}
                    disabled={categorizerLoading}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                    aria-label="Run AI Categorizer"
                  >
                    {categorizerLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                        Categorizing...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2" size={18} />
                        Run AI Categorizer
                      </>
                    )}
                  </button>
                  {categorizerResult && (
                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">{categorizerResult}</div>
                  )}
                </div>
                <div className="mt-4 sm:mt-0">
                  <button
                    onClick={runReceiptMatcher}
                    disabled={receiptMatchLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded mt-4 sm:mt-0"
                    aria-label="Match receipts to transactions"
                  >
                    {receiptMatchLoading ? 'Matching Receipts...' : 'Match Receipts to Transactions'}
                  </button>
                  {receiptMatchResult !== null && (
                    <p className="text-green-600 mt-2">Matched {receiptMatchResult} receipts!</p>
                  )}
                  {/* Trainer Button */}
                  <button
                    onClick={runTrainerAgent}
                    disabled={trainerLoading}
                    className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                    aria-label="Train categorizer from user changes"
                  >
                    {trainerLoading ? 'Training from user changes...' : 'Train Categorizer from User Changes'}
                  </button>
                  {trainerResult !== null && (
                    <p className="text-green-600 mt-2">Trained {trainerResult} new vendor-category mappings</p>
                  )}
                  {/* Rule Builder Button */}
                  <button
                    onClick={runRuleBuilderAgent}
                    disabled={ruleBuilderLoading}
                    className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded"
                    aria-label="Generate categorization rules"
                  >
                    {ruleBuilderLoading ? 'Generating categorization rules...' : 'Generate Categorization Rules'}
                  </button>
                  {ruleBuilderResult !== null && (
                    <p className="text-yellow-700 mt-2">Created {ruleBuilderResult} new categorization rules</p>
                  )}
                  {/* Monthly Summary Button and Table */}
                  <button
                    onClick={runMonthlySummaryAgent}
                    disabled={monthlySummaryLoading}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
                    aria-label="Generate monthly summary"
                  >
                    {monthlySummaryLoading ? 'Generating monthly summary...' : 'Generate Monthly Summary'}
                  </button>
                  {monthlySummary && monthlySummary.length > 0 && (
                    <div className="overflow-x-auto mt-4">
                      <table className="min-w-full bg-white border border-gray-200 rounded shadow">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 border-b text-left">Month</th>
                            <th className="px-4 py-2 border-b text-right">Total Income</th>
                            <th className="px-4 py-2 border-b text-right">Total Expenses</th>
                            <th className="px-4 py-2 border-b text-right">Net Savings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlySummary.map((row) => (
                            <tr key={row.month}>
                              <td className="px-4 py-2 border-b">{row.month}</td>
                              <td className="px-4 py-2 border-b text-right">${row.totalIncome.toLocaleString()}</td>
                              <td className="px-4 py-2 border-b text-right">${row.totalExpenses.toLocaleString()}</td>
                              <td className={`px-4 py-2 border-b text-right ${row.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>${row.net.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Export Month Selector and Buttons */}
              <div className="mt-4">
                <label htmlFor="export-month" className="block mb-2 text-sm font-medium text-gray-700">Export Month (optional):</label>
                <input
                  id="export-month"
                  type="month"
                  value={exportMonth}
                  onChange={e => setExportMonth(e.target.value)}
                  className="border rounded px-2 py-1 mr-4"
                  style={{ minWidth: 160 }}
                />
                <div className="flex flex-col sm:flex-row sm:space-x-4 mt-2">
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={exportLoading === 'csv'}
                    className="px-4 py-2 rounded text-white mt-4 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60"
                    aria-label="Export as CSV"
                  >
                    {exportLoading === 'csv' ? 'Exporting...' : 'Export as CSV'}
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={exportLoading === 'pdf'}
                    className="px-4 py-2 rounded text-white mt-4 bg-red-500 hover:bg-red-600 disabled:opacity-60"
                    aria-label="Export as PDF"
                  >
                    {exportLoading === 'pdf' ? 'Exporting...' : 'Export as PDF'}
                  </button>
                </div>
              </div>

              {/* Google Sheets Button */}
              <button
                onClick={handleExportToGoogleSheets}
                disabled={googleSheetsLoading}
                className="mt-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-60"
                aria-label="Export to Google Sheets"
              >
                {googleSheetsLoading ? 'Syncing to Google Sheets...' : 'Export to Google Sheets'}
              </button>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <Link 
                  to="/upload"
                  className={`card hover:shadow-lg transition-shadow ${
                    darkMode 
                      ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700' 
                      : 'bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200'
                  }`}
                  aria-label="Upload statements"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-primary-900' : 'bg-primary-600'
                    }`}>
                      <FileText size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Upload Statements</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">CSV or PDF bank statements</p>
                    </div>
                  </div>
                </Link>

                <Link 
                  to="/scan-receipt"
                  className={`card hover:shadow-lg transition-shadow ${
                    darkMode 
                      ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700' 
                      : 'bg-gradient-to-br from-secondary-50 to-secondary-100 border-secondary-200'
                  }`}
                  aria-label="Scan receipt"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-secondary-900' : 'bg-secondary-600'
                    }`}>
                      <Camera size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Scan Receipt</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">OCR-powered receipt scanning</p>
                    </div>
                  </div>
                </Link>

                <Link 
                  to="/ai-categorizer"
                  className={`card hover:shadow-lg transition-shadow ${
                    darkMode 
                      ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700' 
                      : 'bg-gradient-to-br from-purple-50 to-blue-100 border-purple-200'
                  }`}
                  aria-label="AI Categorizer"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-purple-900' : 'bg-purple-600'
                    }`}>
                      <Brain size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">AI Categorizer</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Smart transaction categorization</p>
                    </div>
                  </div>
                </Link>

                <Link 
                  to="/ai-insights"
                  className={`card hover:shadow-lg transition-shadow ${
                    darkMode 
                      ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700' 
                      : 'bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200'
                  }`}
                  aria-label="AI Insights"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-emerald-900' : 'bg-emerald-600'
                    }`}>
                      <Brain size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">AI Insights</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Smart financial analysis</p>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center">
                        <span className="bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 px-1.5 rounded-sm">AI</span>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link 
                  to="/credit"
                  className={`card hover:shadow-lg transition-shadow ${
                    darkMode 
                      ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700' 
                      : 'bg-gradient-to-br from-indigo-50 to-blue-100 border-indigo-200'
                  }`}
                  aria-label="Credit score"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-indigo-900' : 'bg-indigo-600'
                    }`}>
                      <TrendingUp size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Credit Score</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Monitor your credit score</p>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 flex items-center">
                        <span className="bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300 px-1.5 rounded-sm">NEW</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Receipts Section */}
              <div className={`card ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Receipt size={20} className={darkMode ? 'text-primary-400' : 'text-primary-600'} />
                    <h3 className="font-semibold">Recent Receipts</h3>
                  </div>
                  <Link to="/receipts" className={`text-sm ${darkMode ? 'text-primary-400' : 'text-primary-600'} hover:${darkMode ? 'text-primary-300' : 'text-primary-700'}`}>
                    View All
                  </Link>
                </div>
                
                <ReceiptsList />
              </div>

              {/* Personal Financial Goals Section */}
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold"> Personal Financial Goals</h2>
                  <button
                    onClick={fetchGoalSuggestions}
                    className="bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700"
                    aria-label="Get AI goal suggestions"
                  >
                    Get AI Goal Suggestions
                  </button>
                </div>
                {goalsLoading && <p>Loading suggestions...</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {goals.map((goal, idx) => (
                    <GoalCard key={idx} goal={goal} />
                  ))}
                </div>
              </div>

              {/* Goal Setting Panel */}
              <GoalSettingPanel />

              {/* XspensesScore block (existing) */}
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-2">XspensesScore™</h2>
                <p className="text-4xl text-red-600 font-bold">247</p>
                <p className="text-sm text-gray-500">Rating: Needs Work</p>
                <div className="h-2 bg-gray-200 rounded mt-2">
                  <div className="h-2 bg-red-500 rounded w-[20%]"></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Next Milestone: 500 – On the Right Track!</p>
              </div>

              {dashboardData && dashboardData.transactions.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    {/* Stat Cards with Skeleton Loading */}
                    {loadingCharts ? (
                      <>
                        <div className="card animate-pulse">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                              <div className="h-8 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            </div>
                            <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg h-12 w-12"></div>
                          </div>
                        </div>
                        <div className="card animate-pulse">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                              <div className="h-8 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            </div>
                            <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg h-12 w-12"></div>
                          </div>
                        </div>
                        <div className="card animate-pulse">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                              <div className="h-8 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            </div>
                            <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg h-12 w-12"></div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <StatCard
                          title="Total Income"
                          value={formatCurrency(stats?.income ?? 0)}
                          icon={<TrendingUp size={24} className="text-success-600" />}
                          trend={stats?.trend !== 0 ? {
                            value: stats?.trend,
                            label: "vs previous period"
                          } : undefined}
                          className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700' : 'bg-gradient-to-br from-success-50 to-success-100'}`}
                        />
                        
                        <StatCard
                          title="Total Expenses"
                          value={formatCurrency(stats?.expenses ?? 0)}
                          icon={<TrendingDown size={24} className="text-error-600" />}
                          className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700' : 'bg-gradient-to-br from-error-50 to-error-100'}`}
                        />
                        
                        <StatCard
                          title="Net Difference"
                          value={formatCurrency(stats?.net ?? 0)}
                          icon={<TrendingUp size={24} className="text-primary-600" />}
                          className={`${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-700' : 'bg-gradient-to-br from-primary-50 to-primary-100'}`}
                        />
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <div className={`card ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Spending by Category</h2>
                      {loadingCharts ? (
                        <div className="h-[400px] flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse">
                          <div className="text-gray-500 dark:text-gray-400">Loading chart data...</div>
                        </div>
                      ) : (
                        <SpendingChart transactions={transactions} type="bar" />
                      )}
                    </div>
                    
                    <div className={`card ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Distribution</h2>
                      {loadingCharts ? (
                        <div className="h-[400px] flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse">
                          <div className="text-gray-500 dark:text-gray-400">Loading chart data...</div>
                        </div>
                      ) : (
                        <SpendingChart transactions={transactions} type="pie" />
                      )}
                    </div>
                  </div>

                  <div className={`card mt-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Monthly Breakdown</h2>
                    {loadingHistory ? (
                      <div className="animate-pulse">
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                        <div className="space-y-3">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <MonthlyBreakdown 
                        transactions={transactions}
                        categories={categories}
                      />
                    )}
                  </div>

                  <div className={`card mt-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Uploaded Files</h2>
                    <FileList />
                  </div>
                </>
              ) : (
                <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="flex justify-center mb-4">
                    <Calendar className="h-12 w-12 opacity-50" />
                  </div>
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'} mb-2`}>No transactions found</h3>
                  <p className="mb-6">
                    Upload your first bank statement or scan a receipt to see your financial summary.
                  </p>
                  {loadingError && (
                    <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg  ">
                      <p className="font-medium">Error loading dashboard</p>
                      <p className="text-sm mt-1">{loadingError}</p>
                      <button 
                        onClick={() => {
                          setRetryCount(prev => prev + 1);
                          loadData();
                        }}
                        className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm flex items-center justify-center "
                        aria-label="Retry loading dashboard"
                      >
                        <RefreshCw size={14} className="mr-2" />
                        Retry Loading
                      </button>
                    </div>
                  )}
                  <div className="flex justify-center space-x-4">
                    <Link to="/upload" className={`btn-primary flex items-center ${
                      darkMode 
                        ? 'bg-primary-600 hover:bg-primary-700' 
                        : 'bg-primary-600 hover:bg-primary-700'
                    }`} aria-label="Upload statement">
                      <FileText size={16} className="mr-2" />
                      Upload Statement
                    </Link>
                    <Link to="/scan-receipt" className={`btn-outline flex items-center ${
                      darkMode 
                        ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' 
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`} aria-label="Scan receipt">
                      <Camera size={16} className="mr-2" />
                      Scan Receipt
                    </Link>
                  </div>
                </div>
              )}

              {/* AskAI Components */}
              <AskAI />
              <AskAIHighlight />
              <ChatBot />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;