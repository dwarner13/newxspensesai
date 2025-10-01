/**
 * React Hook for AI Employee System
 * 
 * Provides easy access to the AI employee system from React components
 */

import { useState, useEffect, useCallback } from 'react';
import { aiEmployeeProcessor, AIEmployeeRequest, AIEmployeeResponse } from '../lib/aiEmployeeProcessor';
import { sharedFinancialData, FinancialData } from '../lib/sharedFinancialData';

export interface UseAIEmployeesReturn {
  // State
  isLoading: boolean;
  error: string | null;
  lastResponse: AIEmployeeResponse | null;
  systemStatus: {
    initialized: boolean;
    dataLoaded: boolean;
    availableEmployees: string[];
    lastDataUpdate: Date | null;
  };
  
  // Actions
  askAIEmployee: (request: Omit<AIEmployeeRequest, 'userId'>) => Promise<AIEmployeeResponse>;
  loadFinancialData: (userId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Employee info
  getAvailableEmployees: () => string[];
  getEmployeeCapabilities: (employeeName: string) => string[];
  
  // Data access
  getFinancialData: () => FinancialData;
  subscribeToDataUpdates: (callback: (data: FinancialData) => void) => () => void;
}

/**
 * Hook for using AI employees
 */
export function useAIEmployees(userId?: string): UseAIEmployeesReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<AIEmployeeResponse | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    initialized: false,
    dataLoaded: false,
    availableEmployees: [] as string[],
    lastDataUpdate: null as Date | null});

  // Load financial data
  const loadFinancialData = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await sharedFinancialData.loadFromSupabase(userId);
      
      setSystemStatus(prev => ({
        ...prev,
        dataLoaded: true,
        lastDataUpdate: new Date()
      }));
      
    } catch (err) {
      console.error('Error loading financial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    if (userId) {
      await loadFinancialData(userId);
    }
  }, [userId, loadFinancialData]);

  // Ask AI employee
  const askAIEmployee = useCallback(async (request: Omit<AIEmployeeRequest, 'userId'>): Promise<AIEmployeeResponse> => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const fullRequest: AIEmployeeRequest = {
        ...request,
        userId
      };
      
      const response = await aiEmployeeProcessor.processRequest(fullRequest);
      setLastResponse(response);
      
      return response;
      
    } catch (err) {
      console.error('Error asking AI employee:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process request';
      setError(errorMessage);
      
      const errorResponse: AIEmployeeResponse = {
        success: false,
        employeeName: 'System',
        response: `I apologize, but I encountered an error: ${errorMessage}`,
        insights: [],
        actions: [],
        data: null,
        confidence: 0,
        executionTime: 0,
        error: errorMessage
      };
      
      setLastResponse(errorResponse);
      return errorResponse;
      
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Get available employees
  const getAvailableEmployees = useCallback(() => {
    return aiEmployeeProcessor.getAvailableEmployees();
  }, []);

  // Get employee capabilities
  const getEmployeeCapabilities = useCallback((employeeName: string) => {
    return aiEmployeeProcessor.getEmployeeCapabilities(employeeName);
  }, []);

  // Get financial data
  const getFinancialData = useCallback(() => {
    return sharedFinancialData.getData();
  }, []);

  // Subscribe to data updates
  const subscribeToDataUpdates = useCallback((callback: (data: FinancialData) => void) => {
    return sharedFinancialData.subscribe(callback);
  }, []);

  // Initialize system and load data
  useEffect(() => {
    const initialize = async () => {
      try {
        setSystemStatus(aiEmployeeProcessor.getSystemStatus());
        
        if (userId) {
          await loadFinancialData(userId);
        }
      } catch (err) {
        console.error('Error initializing AI employee system:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize system');
      }
    };

    initialize();
  }, [userId, loadFinancialData]);

  // Update system status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus(aiEmployeeProcessor.getSystemStatus());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    // State
    isLoading,
    error,
    lastResponse,
    systemStatus,
    
    // Actions
    askAIEmployee,
    loadFinancialData,
    refreshData,
    
    // Employee info
    getAvailableEmployees,
    getEmployeeCapabilities,
    
    // Data access
    getFinancialData,
    subscribeToDataUpdates
  };
}

/**
 * Hook for specific AI employee interactions
 */
export function useAIEmployee(employeeName: string, userId?: string) {
  const { askAIEmployee, isLoading, error, lastResponse } = useAIEmployees(userId);

  const askEmployee = useCallback(async (question: string, context?: any) => {
    return await askAIEmployee({
      userInput: question,
      requestedEmployee: employeeName,
      context,
      includeFinancialData: true});
  }, [askAIEmployee, employeeName]);

  return {
    askEmployee,
    isLoading,
    error,
    lastResponse: lastResponse?.employeeName === employeeName ? lastResponse : null
  };
}

/**
 * Hook for multi-employee collaboration
 */
export function useAICollaboration(userId?: string) {
  const { askAIEmployee, isLoading, error, lastResponse } = useAIEmployees(userId);

  const requestComprehensiveReview = useCallback(async (question: string = "Give me a comprehensive review of my finances") => {
    return await askAIEmployee({
      userInput: question,
      context: { collaboration: true },
      includeFinancialData: true});
  }, [askAIEmployee]);

  const requestDebtOptimization = useCallback(async (question: string = "Help me optimize my debt payoff strategy") => {
    return await askAIEmployee({
      userInput: question,
      context: { collaboration: 'debt_optimization' },
      includeFinancialData: true});
  }, [askAIEmployee]);

  const requestSpendingAnalysis = useCallback(async (question: string = "Analyze my spending patterns") => {
    return await askAIEmployee({
      userInput: question,
      context: { collaboration: 'spending_analysis' },
      includeFinancialData: true});
  }, [askAIEmployee]);

  return {
    requestComprehensiveReview,
    requestDebtOptimization,
    requestSpendingAnalysis,
    isLoading,
    error,
    lastResponse: lastResponse?.collaboration ? lastResponse : null
  };
}

/**
 * Hook for financial data management
 */
export function useFinancialData(userId?: string) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      await sharedFinancialData.loadFromSupabase(userId);
      setData(sharedFinancialData.getData());
      
    } catch (err) {
      console.error('Error loading financial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const updateData = useCallback(async (newData: Partial<FinancialData>) => {
    try {
      await sharedFinancialData.updateData(newData);
      setData(sharedFinancialData.getData());
    } catch (err) {
      console.error('Error updating financial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to update data');
    }
  }, []);

  // Subscribe to data updates
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = sharedFinancialData.subscribe((newData) => {
      setData(newData);
    });

    // Load initial data
    loadData();

    return unsubscribe;
  }, [userId, loadData]);

  return {
    data,
    isLoading,
    error,
    loadData,
    refreshData,
    updateData
  };
}
