import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WorkspaceState {
  [key: string]: any;
}

interface WorkspaceContextType {
  workspaceStates: WorkspaceState;
  updateWorkspaceState: (workspaceId: string, state: any) => void;
  getWorkspaceState: (workspaceId: string) => any;
  clearWorkspaceState: (workspaceId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [workspaceStates, setWorkspaceStates] = useState<WorkspaceState>({});

  // Load states from localStorage on mount
  useEffect(() => {
    const savedStates = localStorage.getItem('workspaceStates');
    if (savedStates) {
      try {
        setWorkspaceStates(JSON.parse(savedStates));
      } catch (error) {
        console.error('Error loading workspace states:', error);
      }
    }
  }, []);

  // Save states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('workspaceStates', JSON.stringify(workspaceStates));
  }, [workspaceStates]);

  const updateWorkspaceState = (workspaceId: string, state: any) => {
    setWorkspaceStates(prev => ({
      ...prev,
      [workspaceId]: {
        ...prev[workspaceId],
        ...state,
        lastUpdated: new Date().toISOString()
      }
    }));
  };

  const getWorkspaceState = (workspaceId: string) => {
    return workspaceStates[workspaceId] || {};
  };

  const clearWorkspaceState = (workspaceId: string) => {
    setWorkspaceStates(prev => {
      const newStates = { ...prev };
      delete newStates[workspaceId];
      return newStates;
    });
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaceStates,
      updateWorkspaceState,
      getWorkspaceState,
      clearWorkspaceState
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};








