import { useState, useEffect, useCallback } from 'react';
import { aiMemorySystem, AIEmployeeState, AITask, AIConversation } from '../lib/aiMemorySystem';

export const useAIMemory = (employeeKey: string) => {
  const [employeeState, setEmployeeState] = useState<AIEmployeeState | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // Load employee state
  useEffect(() => {
    const state = aiMemorySystem.getEmployeeState(employeeKey);
    setEmployeeState(state);
  }, [employeeKey]);

  // Update state every 2 seconds to get real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      const state = aiMemorySystem.getEmployeeState(employeeKey);
      setEmployeeState(state);
    }, 2000);

    return () => clearInterval(interval);
  }, [employeeKey]);

  const createTask = useCallback((taskData: Partial<AITask>) => {
    setIsLoading(true);
    const task = aiMemorySystem.createTask(employeeKey, taskData);
    setEmployeeState(aiMemorySystem.getEmployeeState(employeeKey));
    setIsLoading(false);
    return task;
  }, [employeeKey]);

  const addMessage = useCallback((role: 'user' | 'ai', content: string, context?: string) => {
    aiMemorySystem.addMessage(employeeKey, role, content, context);
    setEmployeeState(aiMemorySystem.getEmployeeState(employeeKey));
  }, [employeeKey]);

  const pauseTask = useCallback(() => {
    aiMemorySystem.pauseTask(employeeKey);
    setEmployeeState(aiMemorySystem.getEmployeeState(employeeKey));
  }, [employeeKey]);

  const resumeTask = useCallback(() => {
    aiMemorySystem.resumeTask(employeeKey);
    setEmployeeState(aiMemorySystem.getEmployeeState(employeeKey));
  }, [employeeKey]);

  const clearQueue = useCallback(() => {
    aiMemorySystem.clearEmployeeQueue(employeeKey);
    setEmployeeState(aiMemorySystem.getEmployeeState(employeeKey));
  }, [employeeKey]);

  return {
    employeeState,
    isLoading,
    createTask,
    addMessage,
    pauseTask,
    resumeTask,
    clearQueue,
    currentTask: employeeState?.currentTask,
    conversation: employeeState?.conversation,
    workingOn: employeeState?.workingOn,
    queue: employeeState?.queue || [],
    isOnline: employeeState?.isOnline || false
  };
};

export const useAllAIMemory = () => {
  const [allStates, setAllStates] = useState<AIEmployeeState[]>([]);

  useEffect(() => {
    const updateStates = () => {
      setAllStates(aiMemorySystem.getAllEmployeeStates());
    };

    updateStates();
    const interval = setInterval(updateStates, 2000);
    return () => clearInterval(interval);
  }, []);

  const getActiveEmployees = useCallback(() => {
    return aiMemorySystem.getActiveEmployees();
  }, []);

  const getEmployeesWithQueue = useCallback(() => {
    return aiMemorySystem.getEmployeesWithQueue();
  }, []);

  return {
    allStates,
    getActiveEmployees,
    getEmployeesWithQueue
  };
};


