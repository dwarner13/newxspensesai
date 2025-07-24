import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { mockModeAtom, dashboardDataAtom } from '../../utils/mockState';
import { mockDashboardData } from '../../utils/mockDashboardData';
import MockModeToggle from './MockModeToggle';

interface MockModeControllerProps {
  initialMockMode?: boolean;
  className?: string;
}

const MockModeController = ({ 
  initialMockMode = false,
  className = ''
}: MockModeControllerProps) => {
  const [mockMode, setMockMode] = useAtom(mockModeAtom);
  const [, setDashboardData] = useAtom(dashboardDataAtom);

  // Initialize mock mode if requested
  useEffect(() => {
    if (initialMockMode && !mockMode) {
      setMockMode(true);
      
      // Set mock dashboard data
      setDashboardData({
        income: mockDashboardData.totalIncome,
        expenses: mockDashboardData.totalExpenses,
        savingsRate: mockDashboardData.savingsRate,
        net: mockDashboardData.netSavings,
        categoryTotals: mockDashboardData.categoryTotals,
        transactions: mockDashboardData.transactions
      });
    }
  }, [initialMockMode, mockMode, setMockMode, setDashboardData]);

  return (
    <div className={className}>
      <MockModeToggle />
    </div>
  );
};

export default MockModeController;
