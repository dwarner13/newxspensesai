// Prime Boss System - Executive oversight of all AI employees
import { aiMemorySystem, AIEmployeeState, AITask } from './aiMemorySystem';
import { EMPLOYEES } from '../data/aiEmployees';

export interface PrimeApproval {
  id: string;
  taskId: string;
  employeeKey: string;
  action: 'approve' | 'reject' | 'modify' | 'redirect';
  reason?: string;
  timestamp: string;
  redirectedTo?: string; // If redirecting to another employee
  modifications?: any; // If modifying the task
}

export interface WorkflowSummary {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  participants: string[]; // Employee keys involved
  tasks: AITask[];
  approvals: PrimeApproval[];
  summary: string;
  insights: string[];
  recommendations: string[];
}

export interface PrimeBossState {
  isActive: boolean;
  currentWorkflow?: WorkflowSummary;
  pendingApprovals: PrimeApproval[];
  completedWorkflows: WorkflowSummary[];
  aiEmployeeReports: Map<string, {
    tasksCompleted: number;
    tasksInProgress: number;
    efficiency: number;
    lastReport: string;
    status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  }>;
  lastExecutiveSummary: string;
  lastSummaryTime: string;
}

class PrimeBossSystem {
  private static instance: PrimeBossSystem;
  private bossState: PrimeBossState;
  private approvalQueue: PrimeApproval[] = [];
  private workflowHistory: WorkflowSummary[] = [];

  private constructor() {
    this.bossState = {
      isActive: true,
      pendingApprovals: [],
      completedWorkflows: [],
      aiEmployeeReports: new Map(),
      lastExecutiveSummary: '',
      lastSummaryTime: new Date().toISOString()
    };
    
    this.initializeEmployeeReports();
    this.startBossMonitoring();
    this.loadFromStorage();
  }

  static getInstance(): PrimeBossSystem {
    if (!PrimeBossSystem.instance) {
      PrimeBossSystem.instance = new PrimeBossSystem();
    }
    return PrimeBossSystem.instance;
  }

  private initializeEmployeeReports() {
    EMPLOYEES.forEach(employee => {
      this.bossState.aiEmployeeReports.set(employee.key, {
        tasksCompleted: Math.floor(Math.random() * 50) + 10,
        tasksInProgress: 0,
        efficiency: 85 + Math.random() * 15,
        lastReport: new Date().toISOString(),
        status: 'good'
      });
    });
  }

  private startBossMonitoring() {
    // Monitor AI employees every 5 seconds
    setInterval(() => {
      this.monitorAIEmployees();
      this.generateExecutiveSummary();
    }, 5000);

    // Save state every 30 seconds
    setInterval(() => {
      this.saveToStorage();
    }, 30000);
  }

  private monitorAIEmployees() {
    const allStates = aiMemorySystem.getAllEmployeeStates();
    
    allStates.forEach(state => {
      const report = this.bossState.aiEmployeeReports.get(state.employeeKey);
      if (report) {
        // Update task counts
        if (state.currentTask) {
          report.tasksInProgress = 1;
        } else {
          report.tasksInProgress = 0;
        }

        // Calculate efficiency based on task completion
        const completedTasks = state.conversation.messages.filter(m => 
          m.content.includes('completed') || m.content.includes('finished')
        ).length;
        
        report.efficiency = Math.min(100, 70 + (completedTasks * 2));
        
        // Determine status
        if (report.efficiency >= 95) {
          report.status = 'excellent';
        } else if (report.efficiency >= 85) {
          report.status = 'good';
        } else if (report.efficiency >= 70) {
          report.status = 'needs_attention';
        } else {
          report.status = 'critical';
        }

        report.lastReport = new Date().toISOString();
      }
    });
  }

  private generateExecutiveSummary() {
    const allStates = aiMemorySystem.getAllEmployeeStates();
    const activeEmployees = allStates.filter(state => state.currentTask);
    const completedToday = allStates.reduce((total, state) => {
      const today = new Date().toDateString();
      const todayTasks = state.conversation.messages.filter(m => 
        m.timestamp.startsWith(today) && m.content.includes('completed')
      ).length;
      return total + todayTasks;
    }, 0);

    const summary = `
🏢 **EXECUTIVE SUMMARY - ${new Date().toLocaleDateString()}**

**ACTIVE OPERATIONS:**
${activeEmployees.map(state => {
  const employee = EMPLOYEES.find(e => e.key === state.employeeKey);
  return `• ${employee?.name}: ${state.workingOn}`;
}).join('\n')}

**PERFORMANCE METRICS:**
• Tasks Completed Today: ${completedToday}
• Active Employees: ${activeEmployees.length}/${EMPLOYEES.length}
• System Efficiency: ${Math.round(allStates.reduce((sum, state) => {
  const report = this.bossState.aiEmployeeReports.get(state.employeeKey);
  return sum + (report?.efficiency || 0);
}, 0) / allStates.length)}%

**STATUS OVERVIEW:**
${Array.from(this.bossState.aiEmployeeReports.entries()).map(([key, report]) => {
  const employee = EMPLOYEES.find(e => e.key === key);
  const statusEmoji = {
    'excellent': '🟢',
    'good': '🟡', 
    'needs_attention': '🟠',
    'critical': '🔴'
  }[report.status];
  return `${statusEmoji} ${employee?.name}: ${report.efficiency.toFixed(1)}% efficiency`;
}).join('\n')}

**RECOMMENDATIONS:**
${this.generateRecommendations()}
    `.trim();

    this.bossState.lastExecutiveSummary = summary;
    this.bossState.lastSummaryTime = new Date().toISOString();
  }

  private generateRecommendations(): string {
    const recommendations = [];
    const reports = Array.from(this.bossState.aiEmployeeReports.values());
    
    const avgEfficiency = reports.reduce((sum, report) => sum + report.efficiency, 0) / reports.length;
    
    if (avgEfficiency < 80) {
      recommendations.push("• Consider redistributing workload for better efficiency");
    }
    
    const criticalEmployees = reports.filter(r => r.status === 'critical').length;
    if (criticalEmployees > 0) {
      recommendations.push(`• ${criticalEmployees} employee(s) need immediate attention`);
    }
    
    const excellentEmployees = reports.filter(r => r.status === 'excellent').length;
    if (excellentEmployees > 2) {
      recommendations.push("• Excellent performance across the team - consider expanding operations");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("• All systems operating optimally");
    }
    
    return recommendations.join('\n');
  }

  // Public API Methods

  getExecutiveSummary(): string {
    return this.bossState.lastExecutiveSummary;
  }

  getAllEmployeeReports(): Map<string, any> {
    return this.bossState.aiEmployeeReports;
  }

  getActiveWorkflows(): WorkflowSummary[] {
    return this.workflowHistory.filter(w => w.status === 'active');
  }

  getPendingApprovals(): PrimeApproval[] {
    return this.bossState.pendingApprovals;
  }

  // Prime can approve/reject tasks
  approveTask(taskId: string, reason?: string): PrimeApproval {
    const approval: PrimeApproval = {
      id: `approval-${Date.now()}`,
      taskId,
      employeeKey: '', // Will be filled by the task lookup
      action: 'approve',
      reason: reason || 'Approved by Prime',
      timestamp: new Date().toISOString()
    };

    this.bossState.pendingApprovals.push(approval);
    this.saveToStorage();
    return approval;
  }

  rejectTask(taskId: string, reason: string): PrimeApproval {
    const approval: PrimeApproval = {
      id: `approval-${Date.now()}`,
      taskId,
      employeeKey: '', // Will be filled by the task lookup
      action: 'reject',
      reason,
      timestamp: new Date().toISOString()
    };

    this.bossState.pendingApprovals.push(approval);
    this.saveToStorage();
    return approval;
  }

  redirectTask(taskId: string, fromEmployee: string, toEmployee: string, reason: string): PrimeApproval {
    const approval: PrimeApproval = {
      id: `approval-${Date.now()}`,
      taskId,
      employeeKey: fromEmployee,
      action: 'redirect',
      reason,
      redirectedTo: toEmployee,
      timestamp: new Date().toISOString()
    };

    this.bossState.pendingApprovals.push(approval);
    this.saveToStorage();
    return approval;
  }

  // Generate comprehensive workflow recap
  generateWorkflowRecap(timeframe: 'today' | 'week' | 'month' = 'today'): string {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeframe) {
      case 'today':
        cutoffDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
    }

    const recentWorkflows = this.workflowHistory.filter(w => 
      new Date(w.startTime) >= cutoffDate
    );

    const allStates = aiMemorySystem.getAllEmployeeStates();
    const totalTasks = allStates.reduce((sum, state) => sum + state.conversation.messages.length, 0);
    const completedTasks = allStates.reduce((sum, state) => 
      sum + state.conversation.messages.filter(m => m.content.includes('completed')).length, 0
    );

    return `
🎯 **COMPLETE WORKFLOW RECAP - ${timeframe.toUpperCase()}**

**OVERVIEW:**
• Workflows Analyzed: ${recentWorkflows.length}
• Total Tasks Processed: ${totalTasks}
• Completion Rate: ${Math.round((completedTasks / totalTasks) * 100)}%
• Active Employees: ${allStates.filter(s => s.currentTask).length}

**DETAILED BREAKDOWN:**
${allStates.map(state => {
  const employee = EMPLOYEES.find(e => e.key === state.employeeKey);
  const report = this.bossState.aiEmployeeReports.get(state.employeeKey);
  return `
👤 **${employee?.name}** (${employee?.emoji})
   Status: ${state.currentTask ? `Working on: ${state.currentTask.title}` : 'Idle'}
   Efficiency: ${report?.efficiency.toFixed(1)}%
   Tasks Completed: ${report?.tasksCompleted}
   Current Task: ${state.workingOn}
  `;
}).join('\n')}

**KEY INSIGHTS:**
${this.generateWorkflowInsights()}

**PRIME'S RECOMMENDATIONS:**
${this.generatePrimeRecommendations()}
    `.trim();
  }

  private generateWorkflowInsights(): string {
    const insights = [];
    const reports = Array.from(this.bossState.aiEmployeeReports.values());
    
    const topPerformer = reports.reduce((top, report) => 
      report.efficiency > top.efficiency ? report : top
    );
    
    const avgEfficiency = reports.reduce((sum, report) => sum + report.efficiency, 0) / reports.length;
    
    insights.push(`• Team average efficiency: ${avgEfficiency.toFixed(1)}%`);
    insights.push(`• Peak performance achieved by multiple employees`);
    
    const activeTasks = reports.reduce((sum, report) => sum + report.tasksInProgress, 0);
    if (activeTasks > 3) {
      insights.push(`• High activity level: ${activeTasks} concurrent tasks`);
    }
    
    return insights.join('\n');
  }

  private generatePrimeRecommendations(): string {
    const recommendations = [];
    const reports = Array.from(this.bossState.aiEmployeeReports.values());
    
    const needsAttention = reports.filter(r => r.status === 'needs_attention' || r.status === 'critical');
    if (needsAttention.length > 0) {
      recommendations.push(`• ${needsAttention.length} employee(s) require Prime's direct intervention`);
    }
    
    const excellent = reports.filter(r => r.status === 'excellent');
    if (excellent.length >= 3) {
      recommendations.push("• Excellent team performance - consider expanding AI workforce");
    }
    
    recommendations.push("• Continue current operational excellence");
    recommendations.push("• Monitor task handoffs for optimization opportunities");
    
    return recommendations.join('\n');
  }

  // Prime can create new workflows
  createWorkflow(title: string, description: string, participants: string[]): WorkflowSummary {
    const workflow: WorkflowSummary = {
      id: `workflow-${Date.now()}`,
      title,
      description,
      startTime: new Date().toISOString(),
      status: 'active',
      participants,
      tasks: [],
      approvals: [],
      summary: '',
      insights: [],
      recommendations: []
    };

    this.workflowHistory.push(workflow);
    this.bossState.currentWorkflow = workflow;
    this.saveToStorage();
    return workflow;
  }

  private saveToStorage() {
    try {
      const data = {
        bossState: {
          ...this.bossState,
          aiEmployeeReports: Object.fromEntries(this.bossState.aiEmployeeReports)
        },
        workflowHistory: this.workflowHistory,
        approvalQueue: this.approvalQueue,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('prime-boss-system', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save Prime boss state:', error);
    }
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem('prime-boss-system');
      if (saved) {
        const data = JSON.parse(saved);
        this.bossState = {
          ...data.bossState,
          aiEmployeeReports: new Map(Object.entries(data.bossState.aiEmployeeReports))
        };
        this.workflowHistory = data.workflowHistory || [];
        this.approvalQueue = data.approvalQueue || [];
      }
    } catch (error) {
      console.error('Failed to load Prime boss state:', error);
    }
  }
}

export const primeBossSystem = PrimeBossSystem.getInstance();










