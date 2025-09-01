// AI Employee System - Supabase Client Functions
// This file handles all interactions with the AI employee database

import { supabase } from './supabase';
import { 
  AIEmployeeConfig, 
  AIConversation, 
  AIConversationMessage, 
  UserAIPreferences, 
  AIInteractionLog,
  AIEmployeeResponse,
  AIRoutingRequest,
  AIRoutingResponse
} from '../types/ai-employees.types';

// ===== AI Employee Configuration Functions =====

export async function getEmployeeConfig(employeeKey: string): Promise<AIEmployeeConfig | null> {
  try {
    const { data, error } = await supabase
      .from('ai_employee_configs')
      .select('*')
      .eq('employee_key', employeeKey)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching employee config:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getEmployeeConfig:', error);
    return null;
  }
}

export async function getAllEmployeeConfigs(): Promise<AIEmployeeConfig[]> {
  try {
    const { data, error } = await supabase
      .from('ai_employee_configs')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching all employee configs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllEmployeeConfigs:', error);
    return [];
  }
}

// ===== AI Conversation Functions =====

export async function getConversation(
  userId: string, 
  employeeKey: string, 
  conversationId: string
): Promise<AIConversation | null> {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('employee_key', employeeKey)
      .eq('conversation_id', conversationId)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getConversation:', error);
    return null;
  }
}

export async function getRecentConversations(
  userId: string, 
  employeeKey: string, 
  limit: number = 5
): Promise<AIConversation[]> {
  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('employee_key', employeeKey)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent conversations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecentConversations:', error);
    return [];
  }
}

export async function saveConversation(
  userId: string,
  employeeKey: string,
  conversationId: string,
  messages: AIConversationMessage[],
  context: Record<string, any> = {}
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_conversations')
      .upsert({
        user_id: userId,
        employee_key: employeeKey,
        conversation_id: conversationId,
        messages: messages,
        context: context,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving conversation:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveConversation:', error);
    return false;
  }
}

export async function addMessageToConversation(
  userId: string,
  employeeKey: string,
  conversationId: string,
  message: AIConversationMessage
): Promise<boolean> {
  try {
    // First get the current conversation
    const conversation = await getConversation(userId, employeeKey, conversationId);
    
    if (conversation) {
      // Add new message to existing conversation
      const updatedMessages = [...conversation.messages, message];
      return await saveConversation(userId, employeeKey, conversationId, updatedMessages, conversation.context);
    } else {
      // Create new conversation with this message
      return await saveConversation(userId, employeeKey, conversationId, [message]);
    }
  } catch (error) {
    console.error('Error in addMessageToConversation:', error);
    return false;
  }
}

// ===== User AI Preferences Functions =====

export async function getUserPreferences(
  userId: string, 
  employeeKey: string
): Promise<UserAIPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('user_ai_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('employee_key', employeeKey)
      .single();

    if (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserPreferences:', error);
    return null;
  }
}

export async function updateUserPreferences(
  userId: string,
  employeeKey: string,
  preferences: Partial<UserAIPreferences['preferences']>
): Promise<boolean> {
  try {
    const existingPrefs = await getUserPreferences(userId, employeeKey);
    
    const updatedPrefs = {
      ...existingPrefs?.preferences,
      ...preferences
    };

    const { error } = await supabase
      .from('user_ai_preferences')
      .upsert({
        user_id: userId,
        employee_key: employeeKey,
        preferences: updatedPrefs,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateUserPreferences:', error);
    return false;
  }
}

export async function incrementConversationCount(
  userId: string, 
  employeeKey: string
): Promise<boolean> {
  try {
    const existingPrefs = await getUserPreferences(userId, employeeKey);
    const currentCount = existingPrefs?.conversation_count || 0;

    const { error } = await supabase
      .from('user_ai_preferences')
      .upsert({
        user_id: userId,
        employee_key: employeeKey,
        conversation_count: currentCount + 1,
        last_interaction: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error incrementing conversation count:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in incrementConversationCount:', error);
    return false;
  }
}

// ===== AI Interaction Logging Functions =====

export async function logAIInteraction(
  userId: string,
  employeeKey: string,
  interactionType: AIInteractionLog['interaction_type'],
  query?: string,
  responseLength?: number,
  processingTimeMs?: number,
  success: boolean = true,
  errorMessage?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_interactions_log')
      .insert({
        user_id: userId,
        employee_key: employeeKey,
        interaction_type: interactionType,
        query: query,
        response_length: responseLength,
        processing_time_ms: processingTimeMs,
        success: success,
        error_message: errorMessage
      });

    if (error) {
      console.error('Error logging AI interaction:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in logAIInteraction:', error);
    return false;
  }
}

// ===== AI Employee Analytics Functions =====

export async function getEmployeeAnalytics(
  employeeKey: string,
  days: number = 30
): Promise<any> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('ai_interactions_log')
      .select('*')
      .eq('employee_key', employeeKey)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employee analytics:', error);
      return null;
    }

    // Calculate analytics
    const totalInteractions = data?.length || 0;
    const successfulInteractions = data?.filter(d => d.success).length || 0;
    const averageProcessingTime = data?.reduce((acc, d) => acc + (d.processing_time_ms || 0), 0) / totalInteractions || 0;
    const uniqueUsers = new Set(data?.map(d => d.user_id)).size;

    return {
      employee_key: employeeKey,
      total_interactions: totalInteractions,
      successful_interactions: successfulInteractions,
      success_rate: totalInteractions > 0 ? (successfulInteractions / totalInteractions) * 100 : 0,
      average_processing_time_ms: averageProcessingTime,
      unique_users: uniqueUsers,
      interactions_by_type: data?.reduce((acc, d) => {
        acc[d.interaction_type] = (acc[d.interaction_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {}
    };
  } catch (error) {
    console.error('Error in getEmployeeAnalytics:', error);
    return null;
  }
}

// ===== AI Employee Routing Functions =====

export async function routeToEmployee(
  request: AIRoutingRequest
): Promise<AIRoutingResponse | null> {
  try {
    // This would typically call an AI service to determine the best employee
    // For now, we'll use a simple keyword-based routing
    const { user_query, user_id } = request;
    
    // Log the routing attempt
    await logAIInteraction(user_id, 'prime', 'route', user_query);

    // Simple keyword-based routing (this would be replaced with AI)
    const query = user_query.toLowerCase();
    
    // Define routing rules
    const routingRules = [
      { keywords: ['import', 'upload', 'receipt', 'document'], employee: 'byte' },
      { keywords: ['goal', 'target', 'save', 'milestone'], employee: 'goalie' },
      { keywords: ['predict', 'forecast', 'trend', 'future'], employee: 'crystal' },
      { keywords: ['categorize', 'organize', 'tag', 'label'], employee: 'tag' },
      { keywords: ['freedom', 'independence', 'fire', 'wealth'], employee: 'liberty' },
      { keywords: ['bill', 'payment', 'reminder', 'due'], employee: 'chime' },
      { keywords: ['therapy', 'stress', 'emotion', 'behavior'], employee: 'luna' },
      { keywords: ['podcast', 'audio', 'story'], employee: 'roundtable' },
      { keywords: ['music', 'spotify', 'playlist'], employee: 'wave' },
      { keywords: ['tax', 'deduction', 'irs', 'cra'], employee: 'ledger' },
      { keywords: ['business', 'insight', 'kpi', 'trend'], employee: 'intelia' },
      { keywords: ['automate', 'workflow', 'rule'], employee: 'automa' },
      { keywords: ['chart', 'visualize', 'analytics'], employee: 'dash' },
      { keywords: ['report', 'export', 'pdf', 'summary'], employee: 'prism' },
      { keywords: ['advice', 'help', 'question', 'assistant'], employee: 'finley' }
    ];

    // Find the best match
    let bestMatch = { employee: 'finley', score: 0 };
    
    for (const rule of routingRules) {
      const score = rule.keywords.filter(keyword => query.includes(keyword)).length;
      if (score > bestMatch.score) {
        bestMatch = { employee: rule.employee, score };
      }
    }

    return {
      recommended_employee_key: bestMatch.employee,
      confidence_score: bestMatch.score / Math.max(...routingRules.map(r => r.keywords.length)),
      reasoning: `Matched ${bestMatch.score} keywords for ${bestMatch.employee}`,
      suggested_response: `I'll connect you with ${bestMatch.employee} who specializes in this area.`
    };
  } catch (error) {
    console.error('Error in routeToEmployee:', error);
    return null;
  }
}

// ===== Utility Functions =====

export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createSystemMessage(content: string): AIConversationMessage {
  return {
    role: 'system',
    content,
    timestamp: new Date().toISOString()
  };
}

export function createUserMessage(content: string): AIConversationMessage {
  return {
    role: 'user',
    content,
    timestamp: new Date().toISOString()
  };
}

export function createAssistantMessage(content: string, metadata?: AIConversationMessage['metadata']): AIConversationMessage {
  return {
    role: 'assistant',
    content,
    timestamp: new Date().toISOString(),
    metadata
  };
}
