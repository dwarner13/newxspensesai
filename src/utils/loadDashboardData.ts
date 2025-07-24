import { supabase } from '../lib/supabase';
import { Transaction } from '../types/database.types';
import toast from 'react-hot-toast';
import { fetchMockDashboardData } from './mockDashboardData';

// Flag to use mock data instead of real data
const USE_MOCK_DATA = true;

/**
 * Loads dashboard data in parallel for improved performance
 * @param timeframe The selected timeframe ('month', 'year', 'all')
 * @returns Object containing transactions, categories, and stats
 */
export const loadDashboardData = async (timeframe: 'month' | 'year' | 'all') => {
  try {
    // Use mock data if flag is set
    if (USE_MOCK_DATA) {
      console.log("🔍 Using mock dashboard data...");
      return await fetchMockDashboardData(timeframe);
    }
    
    // Prevent duplicate timer starts
    if (!window.timerStarted) {
      window.timerStarted = true;
      console.time('dashboard-data-load');
    }
    
    console.log("🔍 Loading dashboard data in parallel...");
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    // Calculate date ranges based on timeframe
    const now = new Date();
    let startDate;
    
    if (timeframe === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeframe === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    const currentPeriodFilter = startDate ? {
      startDate: startDate.toISOString().split('T')[0]
    } : {};
    
    // Historical data for charts (6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const historicalFilter = {
      startDate: sixMonthsAgo.toISOString().split('T')[0]
    };
    
    console.log('Current period filter:', currentPeriodFilter);
    console.log('Historical filter:', historicalFilter);
    
    // Check for stuck loading state and force unlock if needed
    if (window._loadingDashboard) {
      console.log("❗ Force unlocking stuck loading state");
      window._loadingDashboard = false;
    }
    
    // Set loading flag
    window._loadingDashboard = true;
    
    try {
      // Run all queries in parallel
      const [currentTransactionsResult, historicalTransactionsResult, categoriesResult] = 
        await Promise.allSettled([
          // Current period transactions
          supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .gte('date', currentPeriodFilter.startDate || '2000-01-01')
            .order('date', { ascending: false }),
            
          // Historical data for charts
          supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .gte('date', historicalFilter.startDate)
            .order('date', { ascending: false }),
            
          // Get unique categories
          supabase
            .from('transactions')
            .select('category')
            .eq('user_id', user.id)
            .not('category', 'is', null)
        ]);
      
      // Log results for debugging
      console.log('Current transactions result status:', currentTransactionsResult.status);
      console.log('Historical transactions result status:', historicalTransactionsResult.status);
      console.log('Categories result status:', categoriesResult.status);
      
      // Process results
      let currentTransactions: Transaction[] = [];
      let historicalTransactions: Transaction[] = [];
      let categories: string[] = [];
      let stats = {
        income: 0,
        expenses: 0,
        net: 0,
        trend: 0
      };
      
      // Process current transactions
      if (currentTransactionsResult.status === 'fulfilled' && !currentTransactionsResult.value.error) {
        currentTransactions = currentTransactionsResult.value.data || [];
        console.log(`Loaded ${currentTransactions.length} current transactions`);
        
        // Calculate stats
        const income = currentTransactions
          .filter(t => t.type === 'Credit')
          .reduce((sum, t) => sum + t.amount, 0);
          
        const expenses = currentTransactions
          .filter(t => t.type === 'Debit')
          .reduce((sum, t) => sum + t.amount, 0);
          
        const net = income - expenses;
        
        // Calculate trend (comparing to previous period)
        const previousPeriodEnd = new Date(startDate || now);
        const previousPeriodStart = new Date(previousPeriodEnd);
        
        if (timeframe === 'month') {
          previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
        } else if (timeframe === 'year') {
          previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);
        }
        
        // For simplicity, we'll use a random trend if we don't have previous data
        // In a real app, you'd fetch previous period data and calculate the actual trend
        const trend = Math.floor(Math.random() * 20) - 10; // Random trend between -10 and 10
        
        stats = { income, expenses, net, trend };
      } else if (currentTransactionsResult.status === 'rejected') {
        console.error('Error loading current transactions:', currentTransactionsResult.reason);
        throw new Error('Failed to load transactions');
      }
      
      // Process historical transactions
      if (historicalTransactionsResult.status === 'fulfilled' && !historicalTransactionsResult.value.error) {
        historicalTransactions = historicalTransactionsResult.value.data || [];
        console.log(`Loaded ${historicalTransactions.length} historical transactions`);
        
        // Merge with current transactions, removing duplicates
        const allTransactionIds = new Set(currentTransactions.map(t => t.id));
        const uniqueHistoricalTransactions = historicalTransactions.filter(t => !allTransactionIds.has(t.id));
        
        // Combine current and historical transactions
        const allTransactions = [...currentTransactions, ...uniqueHistoricalTransactions];
        
        // Update current transactions with the combined set
        currentTransactions = allTransactions;
      } else if (historicalTransactionsResult.status === 'rejected') {
        console.error('Error loading historical transactions:', historicalTransactionsResult.reason);
      }
      
      // Process categories
      if (categoriesResult.status === 'fulfilled' && !categoriesResult.value.error) {
        const categoryData = categoriesResult.value.data || [];
        const uniqueCategories = Array.from(new Set(categoryData.map(t => t.category)))
          .filter(c => c !== 'Income')
          .sort();
        
        categories = uniqueCategories;
        console.log(`Loaded ${categories.length} categories`);
      } else if (categoriesResult.status === 'rejected') {
        console.error('Error loading categories:', categoriesResult.reason);
      }
      
      // Only end the timer if we started it
      if (window.timerStarted) {
        console.timeEnd('dashboard-data-load');
        window.timerStarted = false;
      }
      
      console.log(`✅ Loaded ${currentTransactions.length} transactions and ${categories.length} categories`);
      
      // IMPORTANT: Reset loading flag
      window._loadingDashboard = false;
      
      return {
        transactions: currentTransactions,
        categories,
        stats
      };
    } catch (error) {
      // IMPORTANT: Reset loading flag on error too
      window._loadingDashboard = false;
      throw error;
    }
  } catch (error) {
    console.error('Error in loadDashboardData:', error);
    
    // IMPORTANT: Reset loading flag on error
    window._loadingDashboard = false;
    
    // Return empty data to prevent UI issues
    return {
      transactions: [],
      categories: [],
      stats: {
        income: 0,
        expenses: 0,
        net: 0,
        trend: 0
      }
    };
  }
};

/**
 * Adds a timeout to show a loading message if data takes too long to load
 * @param callback Function to call if loading takes too long
 * @param timeout Timeout in milliseconds
 * @returns Function to clear the timeout
 */
export const addLoadingTimeout = (callback: () => void, timeout = 5000) => {
  const timeoutId = setTimeout(() => {
    callback();
  }, timeout);
  
  return () => clearTimeout(timeoutId);
};

// Add type declaration for window object
declare global {
  interface Window {
    timerStarted?: boolean;
    _loadingDashboard?: boolean;
  }
}