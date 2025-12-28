/**
 * AI Employee Management System for XSpensesAI
 * 
 * ⚠️ DEPRECATED: Employee definitions have been moved to database (employee_profiles table)
 * 
 * This file now only contains:
 * - Type definitions (interfaces)
 * - Helper classes and functions that use the registry
 * 
 * To get employee data, use: src/employees/registry.ts
 * - getEmployee(slug) - Get employee by slug
 * - getAllEmployees() - Get all active employees
 * - resolveSlug(alias) - Resolve alias to canonical slug
 * 
 * Phase 1.1: Consolidated November 20, 2025
 */

import { getEmployee, type EmployeeProfile } from '../employees/registry';

// Legacy type for backward compatibility (maps to EmployeeProfile)
export interface AIEmployee {
  id: string;
  name: string;
  role: string;
  emoji: string;
  department: string;
  expertise: string[];
  availableFor: string[];
  prompt: string;
  personality: {
    tone: string;
    signaturePhrases: string[];
    emojiStyle: string[];
    communicationStyle: string;
  };
  status: 'online' | 'busy' | 'offline';
  lastActive?: Date;
}

// Helper to convert EmployeeProfile to legacy AIEmployee format
async function convertToLegacyFormat(profile: EmployeeProfile | null): Promise<AIEmployee | null> {
  if (!profile) return null;
  
  return {
    id: profile.slug,
    name: profile.title.split('—')[0].trim(),
    role: profile.title.split('—')[1]?.trim() || profile.title,
    emoji: profile.emoji || '🤖',
    department: profile.capabilities[0] || 'General',
    expertise: profile.capabilities,
    availableFor: profile.capabilities,
    prompt: profile.system_prompt,
    personality: {
      tone: 'professional',
      signaturePhrases: [],
      emojiStyle: profile.emoji ? [profile.emoji] : [],
      communicationStyle: 'professional'
    },
    status: profile.is_active ? 'online' : 'offline'
  };
}

export interface ConversationContext {
  currentEmployee: string;
  previousEmployees: string[];
  topic: string;
  userData: {
    recentTransactions: any[];
    goals: any[];
    preferences: any;
  };
  handoffHistory: Array<{
    from: string;
    to: string;
    reason: string;
    timestamp: string;
  }>;
}

// Smart Routing System
// NOTE: This is a legacy routing class. The canonical router is in netlify/functions/_shared/router.ts
// This class is kept for backward compatibility but should use the registry for employee data
export class AIRouter {
  private context: ConversationContext;

  constructor(context: ConversationContext) {
    this.context = context;
  }

  // Analyze user input and determine which employee(s) should handle it
  // Uses canonical slugs from registry
  routeToEmployee(userMessage: string): string[] {
    const message = userMessage.toLowerCase();
    const keywords = this.extractKeywords(message);
    
    // Route based on keywords and context (using canonical slugs)
    if (this.isDocumentRelated(keywords)) {
      return ['byte-docs'];
    }
    
    if (this.isAnalysisRelated(keywords)) {
      return ['crystal-ai'];
    }
    
    if (this.isCategorizationRelated(keywords)) {
      return ['tag-ai'];
    }
    
    if (this.isTaxRelated(keywords)) {
      return ['ledger-tax'];
    }
    
    if (this.isGoalRelated(keywords)) {
      return ['goalie-ai'];
    }
    
    if (this.isDebtRelated(keywords)) {
      return ['blitz-ai'];
    }
    
    if (this.isForecastRelated(keywords)) {
      return ['finley-ai'];
    }
    
    if (this.isComplexTask(keywords)) {
      return this.assembleTeam(keywords);
    }
    
    // Default to Prime for general queries
    return ['prime-boss'];
  }

  private extractKeywords(message: string): string[] {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return message
      .split(' ')
      .filter(word => word.length > 2 && !commonWords.includes(word));
  }

  private isDocumentRelated(keywords: string[]): boolean {
    const docKeywords = ['upload', 'document', 'receipt', 'invoice', 'statement', 'file', 'pdf', 'image'];
    return keywords.some(keyword => docKeywords.includes(keyword));
  }

  private isAnalysisRelated(keywords: string[]): boolean {
    const analysisKeywords = ['analyze', 'analysis', 'spending', 'pattern', 'trend', 'insight', 'forecast'];
    return keywords.some(keyword => analysisKeywords.includes(keyword));
  }

  private isCategorizationRelated(keywords: string[]): boolean {
    const catKeywords = ['categorize', 'category', 'organize', 'sort', 'classify'];
    return keywords.some(keyword => catKeywords.includes(keyword));
  }

  private isTaxRelated(keywords: string[]): boolean {
    const taxKeywords = ['tax', 'deduction', 'irs', 'cra', 'accounting', 'compliance'];
    return keywords.some(keyword => taxKeywords.includes(keyword));
  }

  private isGoalRelated(keywords: string[]): boolean {
    const goalKeywords = ['goal', 'target', 'save', 'budget', 'plan', 'achieve'];
    return keywords.some(keyword => goalKeywords.includes(keyword));
  }

  private isDebtRelated(keywords: string[]): boolean {
    const debtKeywords = ['debt', 'payoff', 'credit', 'loan', 'interest', 'payment'];
    return keywords.some(keyword => debtKeywords.includes(keyword));
  }

  private isForecastRelated(keywords: string[]): boolean {
    const forecastKeywords = ['forecast', 'projection', 'future', 'retirement', 'wealth', 'timeline', 'scenario', 'what if', 'how long', 'when will', 'how much will'];
    return keywords.some(keyword => forecastKeywords.includes(keyword));
  }

  private isComplexTask(keywords: string[]): boolean {
    // Complex tasks that require multiple employees
    const complexPatterns = [
      ['upload', 'tax'],
      ['debt', 'goal'],
      ['document', 'categorize', 'analyze'],
      ['spending', 'budget', 'save']
    ];
    
    return complexPatterns.some(pattern => 
      pattern.every(keyword => keywords.includes(keyword))
    );
  }

  private assembleTeam(keywords: string[]): string[] {
    const teams: Record<string, string[]> = {
      'tax-document': ['byte-docs', 'ledger-tax', 'tag-ai'],
      'debt-goal': ['blitz-ai', 'goalie-ai', 'crystal-ai'],
      'document-analysis': ['byte-docs', 'tag-ai', 'crystal-ai'],
      'spending-budget': ['crystal-ai', 'goalie-ai', 'tag-ai']
    };

    // Find matching team pattern
    for (const [pattern, team] of Object.entries(teams)) {
      if (pattern.split('-').every(keyword => keywords.includes(keyword))) {
        return team;
      }
    }

    return ['prime-boss'];
  }
}

// Handoff Templates
// Updated to work with registry-based employee data
export const handoffTemplates = {
  primeToSpecialist: async (toEmployeeSlug: string, reason: string) => {
    const employee = await getEmployee(toEmployeeSlug);
    const name = employee?.title.split('—')[0].trim() || 'specialist';
    return `I see this needs ${name}'s expertise in ${reason}. Let me connect you...`;
  },
  
  specialistToPrime: async (fromEmployeeSlug: string, reason: string) => {
    return `I've completed my analysis. Let me send you back to Prime for next steps.`;
  },
  
  specialistToSpecialist: async (fromEmployeeSlug: string, toEmployeeSlug: string, reason: string) => {
    const toEmployee = await getEmployee(toEmployeeSlug);
    const toName = toEmployee?.title.split('—')[0].trim() || 'specialist';
    return `This also needs ${toName}'s input. Bringing them in now...`;
  },
  
  collaborative: async (employeeSlugs: string[], reason: string) => {
    return `This requires our ${employeeSlugs.length}-employee team. Assembling the experts...`;
  }
};

// Employee Response Formatter
// Updated to work with registry-based employee data
export async function formatEmployeeResponse(employeeSlug: string, message: string): Promise<string> {
  const employee = await getEmployee(employeeSlug);
  if (!employee) return message;
  
  // Add personality elements
  let styledMessage = message;
  
  // Add emoji if available
  if (employee.emoji) {
    styledMessage = `${employee.emoji} ${styledMessage}`;
  }
  
  return styledMessage;
}

// Conversation Context Manager
export class ConversationManager {
  private context: ConversationContext;

  constructor() {
    this.context = {
      currentEmployee: 'prime',
      previousEmployees: [],
      topic: 'general',
      userData: {
        recentTransactions: [],
        goals: [],
        preferences: {}
      },
      handoffHistory: []
    };
  }

  getContext(): ConversationContext {
    return this.context;
  }

  updateCurrentEmployee(employeeId: string): void {
    this.context.previousEmployees.push(this.context.currentEmployee);
    this.context.currentEmployee = employeeId;
  }

  addHandoff(from: string, to: string, reason: string): void {
    this.context.handoffHistory.push({
      from,
      to,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  updateTopic(topic: string): void {
    this.context.topic = topic;
  }
}

// Legacy export for backward compatibility
// Use registry instead: import { getEmployee, getAllEmployees } from '@/employees/registry'
export default {
  // This object is deprecated - use registry instead
  // Kept empty to prevent breaking imports
};
