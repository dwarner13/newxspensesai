import { useState, useEffect } from 'react';
import { atom, useAtom } from 'jotai';

// Global state atom for selected month
export const selectedMonthAtom = atom('2025-07');

// Hook for managing month selection
export const useMonthSelection = () => {
  const [selectedMonth, setSelectedMonth] = useAtom(selectedMonthAtom);
  
  const updateSelectedMonth = (monthValue: string) => {
    setSelectedMonth(monthValue);
    // Store in localStorage for persistence
    localStorage.setItem('selectedMonth', monthValue);
    
    // Trigger data refresh for all components
    // This would typically dispatch events or update other global state
    console.log('Month changed to:', monthValue);
    
    // You can add custom event dispatching here
    window.dispatchEvent(new CustomEvent('monthChanged', { 
      detail: { month: monthValue } 
    }));
  };
  
  const getCurrentMonthData = () => {
    return {
      value: selectedMonth,
      label: formatMonthLabel(selectedMonth),
      isCurrent: selectedMonth === getCurrentMonth()
    };
  };
  
  // Load saved month from localStorage on mount
  useEffect(() => {
    const savedMonth = localStorage.getItem('selectedMonth');
    if (savedMonth) {
      setSelectedMonth(savedMonth);
    }
  }, [setSelectedMonth]);
  
  return {
    selectedMonth,
    updateSelectedMonth,
    getCurrentMonthData,
    formatMonthLabel: (monthValue: string) => formatMonthLabel(monthValue),
    getCurrentMonth: () => getCurrentMonth()
  };
};

// Helper functions
export const formatMonthLabel = (monthValue: string): string => {
  const date = new Date(monthValue + '-01');
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
};

export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Generate months list for dropdown
export const generateMonthsList = (count: number = 12) => {
  const months = [];
  const currentDate = new Date();
  
  for (let i = 0; i < count; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const isCurrent = i === 0;
    
    months.push({
      value: monthValue,
      label: formatMonthLabel(monthValue),
      isCurrent});
  }
  
  return months;
};

// Hook for listening to month changes
export const useMonthChangeListener = (callback: (month: string) => void) => {
  useEffect(() => {
    const handleMonthChange = (event: CustomEvent) => {
      callback(event.detail.month);
    };
    
    window.addEventListener('monthChanged', handleMonthChange as EventListener);
    
    return () => {
      window.removeEventListener('monthChanged', handleMonthChange as EventListener);
    };
  }, [callback]);
}; 