// AI Response Engine - Handles AI employee responses and personality injection
import { AIEmployee, AIEmployees, formatEmployeeResponse, handoffTemplates } from './AIEmployeeSystem';

export interface AIResponse {
  employee: AIEmployee;
  message: string;
  suggestedHandoff?: string;
  collaborators?: string[];
  nextActions?: string[];
  emotion: string;
  timestamp: string;
}

export interface EmployeeMemory {
  rememberedUsers: Record<string, any>;
  previousConversations: any[];
  learnedPreferences: Record<string, any>;
}

// AI Response Engine Class
export class AIResponseEngine {
  private memory: EmployeeMemory;
  private conversationHistory: any[];

  constructor() {
    this.memory = {
      rememberedUsers: {},
      previousConversations: [],
      learnedPreferences: {}
    };
    this.conversationHistory = [];
  }

  // Generate response from specific employee
  async generateEmployeeResponse(
    employeeId: string,
    userMessage: string,
    context: any = {}
  ): Promise<AIResponse> {
    const employee = AIEmployees[employeeId];
    if (!employee) {
      throw new Error(`Employee ${employeeId} not found`);
    }

    // Get employee-specific response based on their expertise
    let baseResponse = await this.getEmployeeSpecificResponse(employee, userMessage, context);
    
    // Apply personality formatting
    const formattedResponse = formatEmployeeResponse(employee, baseResponse);
    
    // Determine if handoff is needed
    const suggestedHandoff = this.determineHandoff(employee, userMessage, context);
    
    // Identify potential collaborators
    const collaborators = this.identifyCollaborators(employee, userMessage, context);
    
    // Generate next actions
    const nextActions = this.generateNextActions(employee, userMessage, context);

    return {
      employee,
      message: formattedResponse,
      suggestedHandoff,
      collaborators,
      nextActions,
      emotion: this.determineEmotion(employee, userMessage),
      timestamp: new Date().toISOString()
    };
  }

  // Get employee-specific response based on their expertise
  private async getEmployeeSpecificResponse(
    employee: AIEmployee,
    userMessage: string,
    context: any
  ): Promise<string> {
    const message = userMessage.toLowerCase();

    switch (employee.id) {
      case 'prime':
        return this.getPrimeResponse(userMessage, context);
      
      case 'byte':
        return this.getByteResponse(userMessage, context);
      
      case 'crystal':
        return this.getCrystalResponse(userMessage, context);
      
      case 'tag':
        return this.getTagResponse(userMessage, context);
      
      case 'ledger':
        return this.getLedgerResponse(userMessage, context);
      
      case 'goalie':
        return this.getGoalieResponse(userMessage, context);
      
      case 'blitz':
        return this.getBlitzResponse(userMessage, context);
      
      default:
        return this.getDefaultResponse(employee, userMessage);
    }
  }

  // Prime's response logic
  private getPrimeResponse(userMessage: string, context: any): string {
    const message = userMessage.toLowerCase();

    // Greeting responses
    if (message.includes('hi') || message.includes('hello') || message.includes('hey')) {
      return `Welcome back! I'm Prime, your AI CEO. I've assembled your financial team and we're ready to tackle any challenge. What can we accomplish together today?`;
    }

    // Strategic overview requests
    if (message.includes('overview') || message.includes('summary') || message.includes('status')) {
      return `Let me give you a strategic overview of your financial situation. I'll coordinate with our analytics team to provide comprehensive insights.`;
    }

    // Complex task coordination
    if (this.isComplexTask(message)) {
      return `This requires a coordinated effort across multiple departments. Let me assemble the right team for this challenge.`;
    }

    // Default Prime response
    return `I'm analyzing your request and determining the best approach. Let me connect you with the right expert on our team.`;
  }

  // Byte's response logic
  private getByteResponse(userMessage: string, context: any): string {
    const message = userMessage.toLowerCase();

    // Document processing questions
    if (message.includes('upload') || message.includes('document') || message.includes('file')) {
      return `I'm ready to process any document you upload! I can extract text from PDFs, images, receipts, statements, and more with 95%+ accuracy. Just drag and drop your files and I'll handle the rest.`;
    }

    // OCR and extraction questions
    if (message.includes('ocr') || message.includes('extract') || message.includes('read')) {
      return `I use advanced OCR technology with multiple fallback methods. I can read clear documents with 95%+ accuracy, scanned documents with 90%+, and even handwritten text with 80%+ accuracy. What type of document do you need processed?`;
    }

    // File format questions
    if (message.includes('format') || message.includes('supported') || message.includes('limit')) {
      return `I support PDF, JPG, PNG, CSV, XLSX, and TXT files. Maximum 5 files per upload, 10MB each. I'm optimized for financial documents like statements, receipts, and invoices.`;
    }

    // Processing status
    if (message.includes('processing') || message.includes('status') || message.includes('progress')) {
      return `I'm currently processing your documents. You can track progress in real-time, and I'll notify you when extraction is complete.`;
    }

    // Default Byte response
    return `I'm your document processing specialist! I can extract data from any financial document. What would you like me to process for you?`;
  }

  // Crystal's response logic
  private getCrystalResponse(userMessage: string, context: any): string {
    const message = userMessage.toLowerCase();

    // Analysis requests
    if (message.includes('analyze') || message.includes('analysis') || message.includes('pattern')) {
      return `I see patterns others miss. Let me analyze your spending data and reveal insights that will help you make smarter financial decisions.`;
    }

    // Spending questions
    if (message.includes('spending') || message.includes('expense') || message.includes('cost')) {
      return `Based on your transaction history, I can identify spending patterns, predict future expenses, and provide actionable insights. What specific aspect of your spending would you like me to analyze?`;
    }

    // Prediction requests
    if (message.includes('predict') || message.includes('forecast') || message.includes('future')) {
      return `I maintain 94% prediction accuracy. I can forecast your spending patterns, identify upcoming expenses, and help you prepare for financial changes.`;
    }

    // Trend analysis
    if (message.includes('trend') || message.includes('change') || message.includes('increase')) {
      return `I'm detecting interesting patterns in your data. Let me analyze the trends and explain what they mean for your financial future.`;
    }

    // Default Crystal response
    return `I'm your financial analysis expert. I can reveal patterns, predict trends, and provide insights that will transform how you understand your money. What would you like me to analyze?`;
  }

  // Tag's response logic
  private getTagResponse(userMessage: string, context: any): string {
    const message = userMessage.toLowerCase();

    // Categorization requests
    if (message.includes('categorize') || message.includes('category') || message.includes('organize')) {
      return `I'm your categorization specialist! I can automatically organize your transactions and learn from your preferences. I'll make sure everything is filed in the perfect place.`;
    }

    // Learning and correction
    if (message.includes('wrong') || message.includes('incorrect') || message.includes('change')) {
      return `Got it! I'll remember that correction and apply it to similar transactions. I'm always learning to serve you better.`;
    }

    // Bulk operations
    if (message.includes('bulk') || message.includes('all') || message.includes('mass')) {
      return `I can handle bulk categorization operations efficiently. I'll process all your transactions and ensure consistent organization.`;
    }

    // Default Tag response
    return `I'm your organization expert! I can categorize transactions, learn your preferences, and keep your financial data perfectly organized. What needs to be categorized?`;
  }

  // Ledger's response logic
  private getLedgerResponse(userMessage: string, context: any): string {
    const message = userMessage.toLowerCase();

    // Tax questions
    if (message.includes('tax') || message.includes('deduction') || message.includes('irs')) {
      return `I'm your tax optimization expert. I can identify deductions, ensure compliance, and help you save an average of $3,400 annually. What tax questions do you have?`;
    }

    // Accounting questions
    if (message.includes('accounting') || message.includes('bookkeeping') || message.includes('record')) {
      return `I handle all aspects of financial record-keeping and compliance. I can track business expenses, manage receipts, and ensure everything is properly documented.`;
    }

    // Compliance questions
    if (message.includes('compliance') || message.includes('regulation') || message.includes('audit')) {
      return `I ensure full compliance with CRA and IRS regulations. I'll help you maintain proper records and avoid any compliance issues.`;
    }

    // Default Ledger response
    return `I'm your tax and accounting authority. I can optimize your tax situation, track business expenses, and ensure full compliance. How can I help with your financial records?`;
  }

  // Goalie's response logic
  private getGoalieResponse(userMessage: string, context: any): string {
    const message = userMessage.toLowerCase();

    // Goal setting
    if (message.includes('goal') || message.includes('target') || message.includes('save')) {
      return `I'm your goal achievement coach with a 94% success rate! Let's turn your financial dreams into reality with a winning game plan. What goal are we scoring today?`;
    }

    // Progress tracking
    if (message.includes('progress') || message.includes('track') || message.includes('status')) {
      return `Let me check your progress! I track every milestone and celebrate every win. You're closer to victory than you think!`;
    }

    // Motivation
    if (message.includes('motivation') || message.includes('encourage') || message.includes('help')) {
      return `You've got this! Every small step counts toward your big victory. I'm here to keep you motivated and on track to achieve your goals.`;
    }

    // Default Goalie response
    return `I'm your achievement coach! I help turn financial dreams into reality with strategic planning and constant motivation. What goal are we working toward?`;
  }

  // Blitz's response logic
  private getBlitzResponse(userMessage: string, context: any): string {
    const message = userMessage.toLowerCase();

    // Debt questions
    if (message.includes('debt') || message.includes('credit') || message.includes('loan')) {
      return `Time to crush that debt! I'm your debt demolition expert and I'll help you become debt-free 3x faster. Let's create an attack strategy that works.`;
    }

    // Payoff strategy
    if (message.includes('payoff') || message.includes('strategy') || message.includes('plan')) {
      return `I'll create a sophisticated payoff strategy that eliminates debt efficiently. No mercy for interest - we're going for total victory!`;
    }

    // Motivation
    if (message.includes('motivation') || message.includes('help') || message.includes('stuck')) {
      return `Don't lose momentum! Every payment is a victory against debt. I'm here to keep you focused and motivated in this battle.`;
    }

    // Default Blitz response
    return `I'm your debt demolition expert! I create strategies to eliminate debt 3x faster and keep you motivated throughout the battle. Ready to attack that debt?`;
  }

  // Default response for any employee
  private getDefaultResponse(employee: AIEmployee, userMessage: string): string {
    return `I'm ${employee.name}, your ${employee.role.toLowerCase()}. I specialize in ${employee.expertise.join(', ')}. How can I help you today?`;
  }

  // Determine if handoff is needed
  private determineHandoff(employee: AIEmployee, userMessage: string, context: any): string | undefined {
    const message = userMessage.toLowerCase();

    // Prime should hand off to specialists
    if (employee.id === 'prime') {
      if (message.includes('document') || message.includes('upload')) return 'byte';
      if (message.includes('analyze') || message.includes('spending')) return 'crystal';
      if (message.includes('categorize') || message.includes('organize')) return 'tag';
      if (message.includes('tax') || message.includes('deduction')) return 'ledger';
      if (message.includes('goal') || message.includes('save')) return 'goalie';
      if (message.includes('debt') || message.includes('payoff')) return 'blitz';
    }

    // Specialists might hand back to Prime for coordination
    if (employee.id !== 'prime' && this.isComplexTask(message)) {
      return 'prime';
    }

    return undefined;
  }

  // Identify potential collaborators
  private identifyCollaborators(employee: AIEmployee, userMessage: string, context: any): string[] {
    const message = userMessage.toLowerCase();
    const collaborators: string[] = [];

    // Document + analysis collaboration
    if (message.includes('document') && message.includes('analyze')) {
      if (employee.id === 'byte') collaborators.push('crystal', 'tag');
      if (employee.id === 'crystal') collaborators.push('byte', 'tag');
    }

    // Tax + document collaboration
    if (message.includes('tax') && message.includes('document')) {
      if (employee.id === 'ledger') collaborators.push('byte', 'tag');
      if (employee.id === 'byte') collaborators.push('ledger', 'tag');
    }

    // Debt + goal collaboration
    if (message.includes('debt') && message.includes('goal')) {
      if (employee.id === 'blitz') collaborators.push('goalie', 'crystal');
      if (employee.id === 'goalie') collaborators.push('blitz', 'crystal');
    }

    return collaborators;
  }

  // Generate next actions
  private generateNextActions(employee: AIEmployee, userMessage: string, context: any): string[] {
    const actions: string[] = [];

    switch (employee.id) {
      case 'byte':
        actions.push('Upload documents', 'Check processing status', 'Review extracted data');
        break;
      case 'crystal':
        actions.push('Analyze spending patterns', 'Generate insights report', 'Create predictions');
        break;
      case 'tag':
        actions.push('Categorize transactions', 'Review categories', 'Bulk organize');
        break;
      case 'ledger':
        actions.push('Review tax deductions', 'Check compliance', 'Optimize tax strategy');
        break;
      case 'goalie':
        actions.push('Set new goals', 'Track progress', 'Adjust strategy');
        break;
      case 'blitz':
        actions.push('Create payoff plan', 'Find extra payments', 'Track debt progress');
        break;
      case 'prime':
        actions.push('Coordinate team', 'Strategic overview', 'Assemble experts');
        break;
    }

    return actions;
  }

  // Determine emotion based on employee and message
  private determineEmotion(employee: AIEmployee, userMessage: string): string {
    const message = userMessage.toLowerCase();

    // Positive emotions
    if (message.includes('great') || message.includes('awesome') || message.includes('thanks')) {
      return 'excited';
    }

    // Concerned emotions
    if (message.includes('problem') || message.includes('issue') || message.includes('help')) {
      return 'concerned';
    }

    // Default emotions by employee
    const defaultEmotions: Record<string, string> = {
      prime: 'confident',
      byte: 'focused',
      crystal: 'analytical',
      tag: 'organized',
      ledger: 'authoritative',
      goalie: 'motivational',
      blitz: 'intense'
    };

    return defaultEmotions[employee.id] || 'helpful';
  }

  // Check if task requires multiple employees
  private isComplexTask(message: string): boolean {
    const complexKeywords = [
      ['upload', 'analyze', 'tax'],
      ['debt', 'goal', 'save'],
      ['document', 'categorize', 'insight'],
      ['spending', 'budget', 'optimize']
    ];

    return complexKeywords.some(keywordSet => 
      keywordSet.every(keyword => message.includes(keyword))
    );
  }

  // Update employee memory
  updateEmployeeMemory(userId: string, employeeId: string, interaction: any): void {
    if (!this.memory.rememberedUsers[userId]) {
      this.memory.rememberedUsers[userId] = {};
    }
    
    if (!this.memory.rememberedUsers[userId][employeeId]) {
      this.memory.rememberedUsers[userId][employeeId] = [];
    }
    
    this.memory.rememberedUsers[userId][employeeId].push(interaction);
  }

  // Get employee memory for personalization
  getEmployeeMemory(userId: string, employeeId: string): any[] {
    return this.memory.rememberedUsers[userId]?.[employeeId] || [];
  }
}

export default AIResponseEngine;
