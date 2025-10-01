import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { mockModeAtom, dashboardDataAtom } from '../utils/mockState';
import { 
  mockData, 
  mockUser, 
  mockTransactions, 
  mockReceipts, 
  mockGoals, 
  mockInsights, 
  mockDashboardData,
  mockCategories,
  mockMerchants,
  mockAccounts,
  mockAIInsights,
  mockGamificationData,
  mockReportsData
} from '../utils/mockData';

/**
 * Hook to use comprehensive mock data in components
 * @param initialMockMode Whether to start in mock mode
 * @returns Object with mock state and comprehensive data access
 */
export const useMockData = (initialMockMode = false) => {
  const [mockMode, setMockMode] = useAtom(mockModeAtom);
  const [dashboardData, setDashboardData] = useAtom(dashboardDataAtom);
  const [loading, setLoading] = useState(false);

  // Initialize mock mode if requested
  useEffect(() => {
    if (initialMockMode && !mockMode) {
      setMockMode(true);
      
      // Set comprehensive mock dashboard data
      setDashboardData({
        income: mockDashboardData.summary.totalIncome,
        expenses: mockDashboardData.summary.totalExpenses,
        savingsRate: mockDashboardData.summary.savingsRate,
        net: mockDashboardData.summary.netSavings,
        categoryTotals: mockDashboardData.spendingByCategory.reduce((acc, cat) => {
          acc[cat.category] = cat.amount;
          return acc;
        }, {} as Record<string, number>),
        transactions: mockDashboardData.recentTransactions});
    }
  }, [initialMockMode, mockMode, setMockMode, setDashboardData]);

  // Get safe data with fallbacks
  const getSafeData = () => {
    const data = dashboardData ?? {};
    return {
      income: data.income ?? 0,
      expenses: data.expenses ?? 0,
      savingsRate: data.savingsRate ?? 0,
      net: data.net ?? 0,
      transactions: data.transactions ?? [],
      categoryTotals: data.categoryTotals ?? {}
    };
  };

  // Transform transactions for display
  const transformTransactions = (transactions: any[]) => {
    return transactions.map(tx => ({
      title: tx.description,
      subtitle: `${tx.category} • ${new Date(tx.date).toLocaleDateString()}`,
      amount: `${tx.amount >= 0 ? '+' : '-'}$${Math.abs(tx.amount).toFixed(2)} ${tx.needsReview ? '⚠️' : ''}`,
      image: tx.receipt_url || "https://via.placeholder.com/150x90.png?text=No+Receipt",
      category: tx.category,
      merchant: tx.merchant,
      date: tx.date,
      needsReview: tx.needsReview
    }));
  };

  // Mock API functions
  const mockAPI = {
    // User data
    getUser: () => Promise.resolve(mockUser),
    updateUser: (updates: any) => Promise.resolve({ ...mockUser, ...updates }),
    
    // Transactions
    getTransactions: (filters?: any) => {
      let filtered = [...mockTransactions];
      if (filters?.category) {
        filtered = filtered.filter(t => t.category === filters.category);
      }
      if (filters?.dateRange) {
        filtered = filtered.filter(t => {
          const date = new Date(t.date);
          return date >= filters.dateRange.start && date <= filters.dateRange.end;
        });
      }
      return Promise.resolve(filtered);
    },
    updateTransaction: (id: string, updates: any) => {
      const updated = mockTransactions.map(t => 
        t.id === id ? { ...t, ...updates } : t
      );
      return Promise.resolve(updated.find(t => t.id === id));
    },
    
    // Receipts
    getReceipts: () => Promise.resolve(mockReceipts),
    uploadReceipt: (file: File) => {
      const newReceipt = {
        id: `receipt-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        merchant: 'New Merchant',
        amount: Math.random() * 100 + 10,
        category: 'Other',
        items: [],
        tax: 0,
        tip: 0,
        imageUrl: URL.createObjectURL(file),
        status: 'processing'
      };
      return Promise.resolve(newReceipt);
    },
    
    // Goals
    getGoals: () => Promise.resolve(mockGoals),
    createGoal: (goal: any) => {
      const newGoal = {
        id: `goal-${Date.now()}`,
        ...goal,
        progress: 0
      };
      return Promise.resolve(newGoal);
    },
    updateGoal: (id: string, updates: any) => {
      const updated = mockGoals.map(g => 
        g.id === id ? { ...g, ...updates } : g
      );
      return Promise.resolve(updated.find(g => g.id === id));
    },
    
    // Insights
    getInsights: () => Promise.resolve(mockInsights),
    getAIInsights: () => Promise.resolve(mockAIInsights),
    
    // Dashboard
    getDashboardData: () => Promise.resolve(mockDashboardData),
    
    // Categories and merchants
    getCategories: () => Promise.resolve(mockCategories),
    getMerchants: () => Promise.resolve(mockMerchants),
    
    // Accounts
    getAccounts: () => Promise.resolve(mockAccounts),
    
    // Gamification
    getGamificationData: () => Promise.resolve(mockGamificationData),
    
    // Reports
    getReportsData: () => Promise.resolve(mockReportsData)
  };

  return {
    // State
    mockMode,
    setMockMode,
    loading,
    setLoading,
    
    // Data
    dashboardData: getSafeData(),
    setDashboardData,
    
    // Mock data exports
    user: mockUser,
    transactions: mockTransactions,
    receipts: mockReceipts,
    goals: mockGoals,
    insights: mockInsights,
    dashboard: mockDashboardData,
    categories: mockCategories,
    merchants: mockMerchants,
    accounts: mockAccounts,
    aiInsights: mockAIInsights,
    gamification: mockGamificationData,
    reports: mockReportsData,
    
    // Utilities
    transformTransactions,
    mockAPI,
    
    // Legacy support
    mockUserProfile: {
      name: mockUser.name,
      email: mockUser.email,
      xpLevel: mockGamificationData.level,
      streak: mockGamificationData.streaks.login,
      plan: mockUser.plan
    }
  };
};