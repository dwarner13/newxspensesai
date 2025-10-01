import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  FileText, 
  Tag, 
  Crystal, 
  X, 
  ChevronRight,
  Activity,
  Zap,
  Brain,
  MessageCircle
} from 'lucide-react';

interface AIEmployee {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  isActive: boolean;
  currentTask?: string;
  progress?: number;
}

interface AIEmployeeRoomProps {
  isVisible: boolean;
  onClose: () => void;
}

const AIEmployeeRoom: React.FC<AIEmployeeRoomProps> = ({ isVisible, onClose }) => {
  const [employees, setEmployees] = useState<AIEmployee[]>([
    {
      id: 'prime',
      name: 'Prime',
      role: 'AI Orchestrator',
      avatar: '👑',
      color: 'from-purple-500 to-pink-500',
      isActive: false,
      currentTask: undefined,
      progress: undefined
    },
    {
      id: 'byte',
      name: 'Byte',
      role: 'Document Processor',
      avatar: '📄',
      color: 'from-blue-500 to-cyan-500',
      isActive: false,
      currentTask: undefined,
      progress: undefined
    },
    {
      id: 'tag',
      name: 'Tag',
      role: 'Smart Categorizer',
      avatar: '🏷️',
      color: 'from-green-500 to-emerald-500',
      isActive: false,
      currentTask: undefined,
      progress: undefined
    },
    {
      id: 'crystal',
      name: 'Crystal',
      role: 'Predictive Analyst',
      avatar: '🔮',
      color: 'from-orange-500 to-yellow-500',
      isActive: false,
      currentTask: undefined,
      progress: undefined
    }
  ]);

  const [activeEmployee, setActiveEmployee] = useState<string | null>(null);

  // Simulate AI activity
  useEffect(() => {
    const simulateActivity = () => {
      const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
      const tasks = [
        'Processing documents...',
        'Analyzing spending patterns...',
        'Creating smart categories...',
        'Generating predictions...',
        'Optimizing budget...',
        'Detecting anomalies...'
      ];

      setEmployees(prev => prev.map(emp => {
        if (emp.id === randomEmployee.id) {
          return {
            ...emp,
            isActive: true,
            currentTask: tasks[Math.floor(Math.random() * tasks.length)],
            progress: Math.floor(Math.random() * 100)
          };
        }
        return emp;
      }));

      // Clear activity after 3 seconds
      setTimeout(() => {
        setEmployees(prev => prev.map(emp => ({
          ...emp,
          isActive: false,
          currentTask: undefined,
          progress: undefined
        })));
      }, 3000);
    };

    const interval = setInterval(simulateActivity, 8000);
    return () => clearInterval(interval);
  }, [employees]);

  const handleEmployeeClick = (employeeId: string) => {
    setActiveEmployee(activeEmployee === employeeId ? null : employeeId);
  };

  const activeEmployees = employees.filter(emp => emp.isActive);

  return (
    <>
      {isVisible && (
        <div
          className="fixed right-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-sm border-l border-white/10 z-50 flex flex-col"
          style={{
            transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s ease-out'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Employee Room</h3>
                <p className="text-xs text-white/60">Your AI Team</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Activity Status */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-white">Team Status</span>
            </div>
            {activeEmployees.length > 0 ? (
              <div className="space-y-2">
                {activeEmployees.map(employee => (
                  <div key={employee.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                    <div className={`w-6 h-6 bg-gradient-to-br ${employee.color} rounded-full flex items-center justify-center text-xs`}>
                      {employee.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{employee.name}</div>
                      <div className="text-xs text-white/60">{employee.currentTask}</div>
                      {employee.progress !== undefined && (
                        <div className="mt-1">
                          <div className="w-full bg-white/10 rounded-full h-1">
                            <div 
                              className={`h-1 bg-gradient-to-r ${employee.color} rounded-full transition-all duration-300`}
                              style={{ width: `${employee.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-white/60">All AI employees are ready and waiting for tasks</div>
            )}
          </div>

          {/* Employee List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {employees.map(employee => (
                <div key={employee.id}>
                  <button
                    onClick={() => handleEmployeeClick(employee.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                      employee.isActive 
                        ? 'bg-white/10 border border-white/20' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-10 h-10 bg-gradient-to-br ${employee.color} rounded-xl flex items-center justify-center text-lg`}>
                      {employee.avatar}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{employee.name}</span>
                        {employee.isActive && (
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="text-sm text-white/60">{employee.role}</div>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-white/40 transition-transform duration-200 ${
                      activeEmployee === employee.id ? 'rotate-90' : ''
                    }`} />
                  </button>

                  {/* Employee Details */}
                  {activeEmployee === employee.id && (
                    <div
                      className="ml-13 mt-2 p-3 bg-white/5 rounded-lg space-y-2"
                      style={{
                        height: 'auto',
                        opacity: 1,
                        transition: 'all 0.2s ease-out'
                      }}
                    >
                          <div className="flex items-center gap-2">
                            <Brain className="h-3 w-3 text-white/60" />
                            <span className="text-xs text-white/60">Capabilities</span>
                          </div>
                          <div className="text-xs text-white/80">
                            {employee.id === 'prime' && 'Orchestrates all AI operations, manages workflows, and coordinates team activities.'}
                            {employee.id === 'byte' && 'Processes documents, extracts data, and handles file uploads with OCR technology.'}
                            {employee.id === 'tag' && 'Creates smart categories, learns from patterns, and organizes transactions automatically.'}
                            {employee.id === 'crystal' && 'Analyzes trends, predicts future spending, and provides financial insights.'}
                          </div>
                          <button className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                            <MessageCircle className="h-3 w-3" />
                            Chat with {employee.name}
                          </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Zap className="h-3 w-3" />
              <span>AI Team powered by XspensesAI</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIEmployeeRoom;
