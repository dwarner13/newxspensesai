// AI Memory System - Persistent task and conversation management
import { EMPLOYEES } from '../data/aiEmployees';

export interface AITask {
  id: string;
  employeeKey: string;
  type: 'document_processing' | 'categorization' | 'analysis' | 'chat' | 'upload' | 'calculation';
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'paused' | 'error';
  progress: number; // 0-100
  startedAt: string;
  lastUpdated: string;
  estimatedCompletion?: string;
  data?: any; // Task-specific data
  result?: any; // Task results
}

export interface AIConversation {
  id: string;
  employeeKey: string;
  messages: Array<{
    role: 'user' | 'ai';
    content: string;
    timestamp: string;
    context?: string; // What the AI was working on when this was sent
  }>;
  lastMessageAt: string;
  context: string; // Current conversation context
  isActive: boolean;
}

export interface AIEmployeeState {
  employeeKey: string;
  currentTask?: AITask;
  conversation: AIConversation;
  isOnline: boolean;
  lastSeen: string;
  workingOn: string; // Human-readable description of current work
  queue: AITask[]; // Task queue
}

class AIMemorySystem {
  private static instance: AIMemorySystem;
  private employeeStates: Map<string, AIEmployeeState> = new Map();
  private backgroundTasks: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.initializeEmployeeStates();
    this.loadFromStorage();
    this.startBackgroundProcessing();
  }

  static getInstance(): AIMemorySystem {
    if (!AIMemorySystem.instance) {
      AIMemorySystem.instance = new AIMemorySystem();
    }
    return AIMemorySystem.instance;
  }

  private initializeEmployeeStates() {
    EMPLOYEES.forEach(employee => {
      if (!this.employeeStates.has(employee.key)) {
        this.employeeStates.set(employee.key, {
          employeeKey: employee.key,
          conversation: {
            id: `conv-${employee.key}-${Date.now()}`,
            employeeKey: employee.key,
            messages: [],
            lastMessageAt: new Date().toISOString(),
            context: 'Ready to help',
            isActive: false
          },
          isOnline: true,
          lastSeen: new Date().toISOString(),
          workingOn: 'Idle',
          queue: []
        });
      }
    });
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem('ai-memory-system');
      if (saved) {
        const data = JSON.parse(saved);
        Object.entries(data.employeeStates || {}).forEach(([key, state]) => {
          this.employeeStates.set(key, state as AIEmployeeState);
        });
      }
    } catch (error) {
      console.error('Failed to load AI memory from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      const data = {
        employeeStates: Object.fromEntries(this.employeeStates),
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('ai-memory-system', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save AI memory to storage:', error);
    }
  }

  private startBackgroundProcessing() {
    // Process background tasks every 2 seconds
    setInterval(() => {
      this.processBackgroundTasks();
    }, 2000);

    // Save to storage every 30 seconds
    setInterval(() => {
      this.saveToStorage();
    }, 30000);
  }

  private processBackgroundTasks() {
    this.employeeStates.forEach((state, employeeKey) => {
      if (state.currentTask && state.currentTask.status === 'in_progress') {
        this.updateTaskProgress(employeeKey, state.currentTask);
      }
    });
  }

  private updateTaskProgress(employeeKey: string, task: AITask) {
    // Simulate realistic progress updates
    const progressIncrement = Math.random() * 5 + 1; // 1-6% per update
    const newProgress = Math.min(100, task.progress + progressIncrement);
    
    task.progress = newProgress;
    task.lastUpdated = new Date().toISOString();

    if (newProgress >= 100) {
      task.status = 'completed';
      task.result = this.generateTaskResult(task);
      this.completeTask(employeeKey, task);
    }

    this.updateEmployeeWorkingStatus(employeeKey, task);
  }

  private generateTaskResult(task: AITask): any {
    switch (task.type) {
      case 'document_processing':
        return {
          documentsProcessed: Math.floor(Math.random() * 10) + 1,
          extractedData: {
            transactions: Math.floor(Math.random() * 50) + 10,
            categories: Math.floor(Math.random() * 20) + 5,
            merchants: Math.floor(Math.random() * 30) + 8
          },
          accuracy: 95 + Math.random() * 4
        };
      
      case 'categorization':
        return {
          transactionsCategorized: Math.floor(Math.random() * 100) + 20,
          newCategories: Math.floor(Math.random() * 10) + 2,
          confidence: 90 + Math.random() * 9
        };
      
      case 'analysis':
        return {
          insightsGenerated: Math.floor(Math.random() * 15) + 5,
          trendsIdentified: Math.floor(Math.random() * 8) + 2,
          recommendations: Math.floor(Math.random() * 12) + 3
        };
      
      default:
        return { completed: true };
    }
  }

  private completeTask(employeeKey: string, task: AITask) {
    const state = this.employeeStates.get(employeeKey);
    if (state) {
      state.currentTask = undefined;
      state.workingOn = 'Task completed - ready for next assignment';
      
      // Auto-handoff to next AI if applicable
      this.handleTaskHandoff(employeeKey, task);
    }
  }

  private handleTaskHandoff(fromEmployee: string, completedTask: AITask) {
    // Smart handoff logic
    switch (completedTask.type) {
      case 'document_processing':
        // Byte finishes processing → Tag starts categorization
        if (fromEmployee === 'byte') {
          this.createTask('tag', {
            type: 'categorization',
            title: 'Categorize Imported Transactions',
            description: `Categorize ${completedTask.result?.extractedData?.transactions || 0} transactions from ${completedTask.title}`,
            data: { sourceTask: completedTask.id, transactions: completedTask.result?.extractedData?.transactions }
          });
        }
        break;
      
      case 'categorization':
        // Tag finishes categorization → Crystal analyzes trends
        if (fromEmployee === 'tag') {
          this.createTask('crystal', {
            type: 'analysis',
            title: 'Analyze Spending Trends',
            description: `Analyze spending patterns from ${completedTask.title}`,
            data: { sourceTask: completedTask.id, categorizedTransactions: completedTask.result?.transactionsCategorized }
          });
        }
        break;
      
      case 'analysis':
        // Crystal finishes analysis → Intelia creates business insights
        if (fromEmployee === 'crystal') {
          this.createTask('intelia', {
            type: 'analysis',
            title: 'Generate Business Intelligence',
            description: `Create business insights from ${completedTask.title}`,
            data: { sourceTask: completedTask.id, analysis: completedTask.result }
          });
        }
        break;
    }
  }

  private updateEmployeeWorkingStatus(employeeKey: string, task: AITask) {
    const state = this.employeeStates.get(employeeKey);
    if (state) {
      switch (task.type) {
        case 'document_processing':
          state.workingOn = `Processing ${task.title} (${Math.round(task.progress)}%)`;
          break;
        case 'categorization':
          state.workingOn = `Categorizing transactions (${Math.round(task.progress)}%)`;
          break;
        case 'analysis':
          state.workingOn = `Analyzing data (${Math.round(task.progress)}%)`;
          break;
        case 'chat':
          state.workingOn = `Chatting with user`;
          break;
        default:
          state.workingOn = `Working on ${task.title} (${Math.round(task.progress)}%)`;
      }
    }
  }

  // Public API Methods

  createTask(employeeKey: string, taskData: Partial<AITask>): AITask {
    const task: AITask = {
      id: `task-${employeeKey}-${Date.now()}`,
      employeeKey,
      type: taskData.type || 'chat',
      title: taskData.title || 'New Task',
      description: taskData.description || '',
      status: 'pending',
      progress: 0,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      data: taskData.data,
      ...taskData
    };

    const state = this.employeeStates.get(employeeKey);
    if (state) {
      if (!state.currentTask) {
        state.currentTask = task;
        task.status = 'in_progress';
        state.workingOn = `Starting ${task.title}`;
      } else {
        state.queue.push(task);
      }
    }

    this.saveToStorage();
    return task;
  }

  getEmployeeState(employeeKey: string): AIEmployeeState | undefined {
    return this.employeeStates.get(employeeKey);
  }

  getAllEmployeeStates(): AIEmployeeState[] {
    return Array.from(this.employeeStates.values());
  }

  addMessage(employeeKey: string, role: 'user' | 'ai', content: string, context?: string) {
    const state = this.employeeStates.get(employeeKey);
    if (state) {
      const message = {
        role,
        content,
        timestamp: new Date().toISOString(),
        context: context || state.workingOn
      };

      state.conversation.messages.push(message);
      state.conversation.lastMessageAt = new Date().toISOString();
      state.conversation.isActive = true;
      
      if (role === 'user') {
        state.workingOn = 'Responding to user message';
      }

      this.saveToStorage();
    }
  }

  getConversation(employeeKey: string): AIConversation | undefined {
    const state = this.employeeStates.get(employeeKey);
    return state?.conversation;
  }

  pauseTask(employeeKey: string) {
    const state = this.employeeStates.get(employeeKey);
    if (state?.currentTask) {
      state.currentTask.status = 'paused';
      state.workingOn = `Paused: ${state.currentTask.title}`;
      this.saveToStorage();
    }
  }

  resumeTask(employeeKey: string) {
    const state = this.employeeStates.get(employeeKey);
    if (state?.currentTask && state.currentTask.status === 'paused') {
      state.currentTask.status = 'in_progress';
      this.updateEmployeeWorkingStatus(employeeKey, state.currentTask);
      this.saveToStorage();
    }
  }

  clearEmployeeQueue(employeeKey: string) {
    const state = this.employeeStates.get(employeeKey);
    if (state) {
      state.queue = [];
      this.saveToStorage();
    }
  }

  // Get AI employees that are currently working
  getActiveEmployees(): AIEmployeeState[] {
    return Array.from(this.employeeStates.values()).filter(state => 
      state.currentTask && state.currentTask.status === 'in_progress'
    );
  }

  // Get AI employees with pending tasks
  getEmployeesWithQueue(): AIEmployeeState[] {
    return Array.from(this.employeeStates.values()).filter(state => 
      state.queue.length > 0
    );
  }
}

export const aiMemorySystem = AIMemorySystem.getInstance();










