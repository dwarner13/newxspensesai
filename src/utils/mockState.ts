import { atom } from 'jotai';
import { mockDashboardData } from './mockDashboardData';

// Atom to control mock mode
export const mockModeAtom = atom<boolean>(false);

// Atom for dashboard data
export const dashboardDataAtom = atom<any>(null);

// Function to enable mock mode and set mock data
export const enableMockMode = (setAtom: (key: string, value: any) => void) => {
  // Enable mock mode
  setAtom('mockMode', true);
  
  // Set mock dashboard data
  setAtom('dashboardData', {
    income: mockDashboardData.totalIncome,
    expenses: mockDashboardData.totalExpenses,
    savingsRate: mockDashboardData.savingsRate,
    net: mockDashboardData.netSavings,
    categoryTotals: mockDashboardData.categoryTotals,
    transactions: mockDashboardData.transactions.map(tx => ({
      ...tx,
      receipt_url: tx.receipt_url
    }))
  });
};

// Function to get safe data with fallbacks
export const getSafeData = (getData: (key: string) => any) => {
  const data = getData('dashboardData') ?? {};
  return {
    income: data.income ?? 0,
    expenses: data.expenses ?? 0,
    savingsRate: data.savingsRate ?? 0,
    net: data.net ?? 0,
    transactions: data.transactions ?? [],
    categoryTotals: data.categoryTotals ?? {}
  };
};

// Function to transform transactions for display
export const transformTransactionsForDisplay = (transactions: any[]) => {
  return transactions.map(tx => ({
    title: tx.description,
    subtitle: `${tx.category} • ${new Date(tx.date).toLocaleDateString()}`,
    amount: `${tx.type === 'Credit' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)} ${tx.receipt_url ? '🧾' : ''}`,
    image: tx.receipt_url || "https://via.placeholder.com/150x90.png?text=No+Receipt"
  }));
};

// Mock user profile data
export const mockUserProfile = {
  name: "Darrell Warner",
  email: "darrell.warner13@gmail.com",
  xpLevel: 5,
  streak: 12,
  plan: "Pro"
};