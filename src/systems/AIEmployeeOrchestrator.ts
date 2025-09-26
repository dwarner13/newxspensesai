// AI Employee Orchestrator - The core system that makes the AI team work
import { AI_EMPLOYEES } from '../config/ai-employees';

export interface EmployeeHandoff {
  from: string;
  to: string;
  reason: string;
  message: string;
}

export interface EmployeeResponse {
  employee: string;
  message: string;
  handoff?: EmployeeHandoff;
  shouldHandoff: boolean;
}

export class AIEmployeeOrchestrator {
  private currentEmployee: string = 'prime';
  private conversationHistory: any[] = [];

  // Set the default employee (should always be Prime)
  setDefaultEmployee(employee: string = 'prime') {
    this.currentEmployee = employee;
  }

  // Get the current active employee
  getCurrentEmployee() {
    return this.currentEmployee;
  }

  // Route user message to appropriate employee
  async routeMessage(userMessage: string, context: any = {}): Promise<EmployeeResponse> {
    const message = userMessage.toLowerCase();
    
    // Prime should handle initial contact and routing
    if (this.currentEmployee === 'prime') {
      return this.handlePrimeRouting(message, context);
    }
    
    // Other employees can suggest handoffs
    return this.handleEmployeeResponse(this.currentEmployee, message, context);
  }

  // Prime's intelligent routing logic
  private async handlePrimeRouting(message: string, context: any): Promise<EmployeeResponse> {
    // Document upload questions
    if (this.shouldRouteToByte(message)) {
      return {
        employee: 'prime',
        message: this.getPrimeHandoffMessage('byte', 'document processing'),
        handoff: {
          from: 'prime',
          to: 'byte',
          reason: 'document processing',
          message: this.getPrimeHandoffMessage('byte', 'document processing')
        },
        shouldHandoff: true
      };
    }

    // Category questions
    if (this.shouldRouteToTag(message)) {
      return {
        employee: 'prime',
        message: this.getPrimeHandoffMessage('tag', 'categorization'),
        handoff: {
          from: 'prime',
          to: 'tag',
          reason: 'categorization',
          message: this.getPrimeHandoffMessage('tag', 'categorization')
        },
        shouldHandoff: true
      };
    }

    // Tax questions
    if (this.shouldRouteToLedger(message)) {
      return {
        employee: 'prime',
        message: this.getPrimeHandoffMessage('ledger', 'tax expertise'),
        handoff: {
          from: 'prime',
          to: 'ledger',
          reason: 'tax expertise',
          message: this.getPrimeHandoffMessage('ledger', 'tax expertise')
        },
        shouldHandoff: true
      };
    }

    // Debt questions
    if (this.shouldRouteToBlitz(message)) {
      return {
        employee: 'prime',
        message: this.getPrimeHandoffMessage('blitz', 'debt management'),
        handoff: {
          from: 'prime',
          to: 'blitz',
          reason: 'debt management',
          message: this.getPrimeHandoffMessage('blitz', 'debt management')
        },
        shouldHandoff: true
      };
    }

    // Financial analysis questions
    if (this.shouldRouteToCrystal(message)) {
      return {
        employee: 'prime',
        message: this.getPrimeHandoffMessage('crystal', 'financial analysis'),
        handoff: {
          from: 'prime',
          to: 'crystal',
          reason: 'financial analysis',
          message: this.getPrimeHandoffMessage('crystal', 'financial analysis')
        },
        shouldHandoff: true
      };
    }

    // Goal questions
    if (this.shouldRouteToGoalie(message)) {
      return {
        employee: 'prime',
        message: this.getPrimeHandoffMessage('goalie', 'goal setting'),
        handoff: {
          from: 'prime',
          to: 'goalie',
          reason: 'goal setting',
          message: this.getPrimeHandoffMessage('goalie', 'goal setting')
        },
        shouldHandoff: true
      };
    }

    // Default Prime response for general questions
    return {
      employee: 'prime',
      message: this.getPrimeDefaultResponse(message),
      shouldHandoff: false
    };
  }

  // Handle responses from other employees
  private async handleEmployeeResponse(employee: string, message: string, context: any): Promise<EmployeeResponse> {
    // Each employee can suggest handoffs to others
    const employeeConfig = AI_EMPLOYEES[employee];
    if (!employeeConfig) {
      return {
        employee: 'prime',
        message: "👑 Let me connect you with the right specialist...",
        shouldHandoff: true
      };
    }

    // For now, let employees handle their own responses
    return {
      employee: employee,
      message: await this.getEmployeeResponse(employee, message, context),
      shouldHandoff: false
    };
  }

  // Routing logic for each employee
  private shouldRouteToByte(message: string): boolean {
    const byteKeywords = ['upload', 'document', 'statement', 'receipt', 'file', 'scan', 'process'];
    return byteKeywords.some(keyword => message.includes(keyword));
  }

  private shouldRouteToTag(message: string): boolean {
    const tagKeywords = ['categor', 'tag', 'label', 'organize', 'sort', 'classify'];
    return tagKeywords.some(keyword => message.includes(keyword));
  }

  private shouldRouteToLedger(message: string): boolean {
    const ledgerKeywords = ['tax', 'deduct', 'irs', 'filing', 'business expense', 'write-off'];
    return ledgerKeywords.some(keyword => message.includes(keyword));
  }

  private shouldRouteToBlitz(message: string): boolean {
    const blitzKeywords = ['debt', 'payoff', 'credit card', 'loan', 'consolidat', 'balance'];
    return blitzKeywords.some(keyword => message.includes(keyword));
  }

  private shouldRouteToCrystal(message: string): boolean {
    const crystalKeywords = ['analyze', 'spending', 'pattern', 'trend', 'insight', 'forecast', 'predict'];
    return crystalKeywords.some(keyword => message.includes(keyword));
  }

  private shouldRouteToGoalie(message: string): boolean {
    const goalieKeywords = ['goal', 'target', 'save', 'budget', 'plan', 'objective'];
    return goalieKeywords.some(keyword => message.includes(keyword));
  }

  // Get Prime's handoff messages
  private getPrimeHandoffMessage(employee: string, reason: string): string {
    const employeeInfo = AI_EMPLOYEES[employee];
    if (!employeeInfo) return "👑 Let me connect you with the right specialist...";

    const handoffMessages = {
      byte: "👑 Document processing - that's Byte's specialty! They process documents with 99.7% accuracy in just 2.3 seconds. Let me connect you with them...",
      tag: "👑 Categories are Tag's domain - they're our organization perfectionist who learns from every interaction. Connecting you now...",
      ledger: "👑 Tax expertise - that's Ledger's specialty! They'll help you save money on taxes and find deductions you might miss. Let me connect you...",
      blitz: "👑 Debt management - that's Blitz's superpower! They create personalized debt payoff plans that actually work. Connecting you now...",
      crystal: "👑 Financial analysis - that's Crystal's expertise! They see patterns others miss and predict financial trends with 94% accuracy. Let me connect you...",
      goalie: "👑 Goal setting - that's Goalie's specialty! They help create achievable financial goals and track your progress. Connecting you now..."
    };

    return handoffMessages[employee] || "👑 Let me connect you with the right specialist...";
  }

  // Get Prime's default response
  private getPrimeDefaultResponse(message: string): string {
    if (message.includes('hi') || message.includes('hello') || message.includes('hey')) {
      return "👑 Hello! I'm Prime, your AI CEO here at XSpensesAI. I coordinate our entire team of 30 financial experts to help you succeed. What can my team help you with today?";
    }

    if (message.includes('who are you') || message.includes('what are you')) {
      return "👑 I'm Prime, the strategic orchestrator of your AI financial team. Think of me as your personal AI CEO - I manage 30 specialized AI employees across 8 departments, from document processing to tax expertise. I make sure you always get the right expert for your needs. Would you like to meet any specific team members, or shall I help you with something specific?";
    }

    if (message.includes('boss') || message.includes('manager')) {
      return "👑 I'm Prime, the AI CEO of your financial team! I orchestrate our entire team of 30 specialists to give you the best financial experience possible. What would you like my team to help you with today?";
    }

    return "👑 I'm Prime, your AI CEO. I coordinate our team of 30 financial specialists. What can we help you with today?";
  }

  // Get employee-specific responses
  private async getEmployeeResponse(employee: string, message: string, context: any): Promise<string> {
    const employeeConfig = AI_EMPLOYEES[employee];
    if (!employeeConfig) return "I'm here to help!";

    // This would integrate with the actual AI prompts
    // For now, return placeholder responses
    return `I'm ${employeeConfig.name}, and I'm here to help with ${employeeConfig.capabilities.join(', ')}!`;
  }

  // Execute handoff to another employee
  executeHandoff(handoff: EmployeeHandoff) {
    this.currentEmployee = handoff.to;
    this.conversationHistory.push({
      type: 'handoff',
      from: handoff.from,
      to: handoff.to,
      reason: handoff.reason,
      timestamp: new Date().toISOString()
    });
  }

  // Get conversation history
  getConversationHistory() {
    return this.conversationHistory;
  }
}
