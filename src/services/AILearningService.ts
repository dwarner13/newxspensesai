// AI Learning Service - Handles AI memory, learning, and database operations
import { supabase } from '../lib/supabase';

export interface ConversationRecord {
  user_id: string;
  employee_id: string;
  message: string;
  response: string;
  handoff_from?: string;
  handoff_to?: string;
  handoff_reason?: string;
  success_rating?: number;
}

export interface UserPreference {
  user_id: string;
  employee_id: string;
  preference_type: string;
  preference_value: any;
  confidence_score: number;
}

export interface LearningPattern {
  user_id: string;
  pattern_type: string;
  pattern_data: any;
  confidence_score: number;
}

export interface CategorizationRule {
  user_id: string;
  merchant_name: string;
  category: string;
  subcategory?: string;
  confidence_score: number;
}

export interface HandoffRecord {
  from_employee: string;
  to_employee: string;
  reason: string;
  success: boolean;
}

export class AILearningService {
  // Store conversation in database
  async storeConversation(conversation: ConversationRecord): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: conversation.user_id,
          employee_id: conversation.employee_id,
          message: conversation.message,
          response: conversation.response,
          handoff_from: conversation.handoff_from,
          handoff_to: conversation.handoff_to,
          handoff_reason: conversation.handoff_reason,
          success_rating: conversation.success_rating});

      if (error) {
        console.error('Error storing conversation:', error);
      }
    } catch (error) {
      console.error('Error in storeConversation:', error);
    }
  }

  // Get recent conversation history for context
  async getConversationHistory(userId: string, employeeId: string, limit: number = 10): Promise<ConversationRecord[]> {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('employee_id', employeeId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching conversation history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getConversationHistory:', error);
      return [];
    }
  }

  // Store user preference
  async storeUserPreference(preference: UserPreference): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_preferences')
        .upsert({
          user_id: preference.user_id,
          employee_id: preference.employee_id,
          preference_type: preference.preference_type,
          preference_value: preference.preference_value,
          confidence_score: preference.confidence_score});

      if (error) {
        console.error('Error storing user preference:', error);
      }
    } catch (error) {
      console.error('Error in storeUserPreference:', error);
    }
  }

  // Get user preferences for an employee
  async getUserPreferences(userId: string, employeeId: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase
        .from('ai_preferences')
        .select('preference_type, preference_value, confidence_score')
        .eq('user_id', userId)
        .eq('employee_id', employeeId);

      if (error) {
        console.error('Error fetching user preferences:', error);
        return {};
      }

      const preferences: Record<string, any> = {};
      data?.forEach(pref => {
        preferences[pref.preference_type] = {
          value: pref.preference_value,
          confidence: pref.confidence_score
        };
      });

      return preferences;
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return {};
    }
  }

  // Store learning pattern
  async storeLearningPattern(pattern: LearningPattern): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_learning')
        .upsert({
          user_id: pattern.user_id,
          pattern_type: pattern.pattern_type,
          pattern_data: pattern.pattern_data,
          confidence_score: pattern.confidence_score});

      if (error) {
        console.error('Error storing learning pattern:', error);
      }
    } catch (error) {
      console.error('Error in storeLearningPattern:', error);
    }
  }

  // Get learning patterns for user
  async getLearningPatterns(userId: string, patternType?: string): Promise<LearningPattern[]> {
    try {
      let query = supabase
        .from('ai_learning')
        .select('*')
        .eq('user_id', userId)
        .order('confidence_score', { ascending: false});

      if (patternType) {
        query = query.eq('pattern_type', patternType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching learning patterns:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getLearningPatterns:', error);
      return [];
    }
  }

  // Store categorization rule (for Tag)
  async storeCategorizationRule(rule: CategorizationRule): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_categorization_rules')
        .upsert({
          user_id: rule.user_id,
          merchant_name: rule.merchant_name,
          category: rule.category,
          subcategory: rule.subcategory,
          confidence_score: rule.confidence_score});

      if (error) {
        console.error('Error storing categorization rule:', error);
      }
    } catch (error) {
      console.error('Error in storeCategorizationRule:', error);
    }
  }

  // Get categorization rules for user
  async getCategorizationRules(userId: string): Promise<CategorizationRule[]> {
    try {
      const { data, error } = await supabase
        .from('ai_categorization_rules')
        .select('*')
        .eq('user_id', userId)
        .order('confidence_score', { ascending: false});

      if (error) {
        console.error('Error fetching categorization rules:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCategorizationRules:', error);
      return [];
    }
  }

  // Predict category for merchant
  async predictCategory(userId: string, merchantName: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('ai_categorization_rules')
        .select('category, confidence_score')
        .eq('user_id', userId)
        .ilike('merchant_name', `%${merchantName}%`)
        .order('confidence_score', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error predicting category:', error);
        return null;
      }

      return data?.[0]?.category || null;
    } catch (error) {
      console.error('Error in predictCategory:', error);
      return null;
    }
  }

  // Record handoff success/failure
  async recordHandoff(handoff: HandoffRecord): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_ai_handoff_success', {
        p_from_employee: handoff.from_employee,
        p_to_employee: handoff.to_employee,
        p_reason: handoff.reason,
        p_success: handoff.success});

      if (error) {
        console.error('Error recording handoff:', error);
      }
    } catch (error) {
      console.error('Error in recordHandoff:', error);
    }
  }

  // Get handoff success rates
  async getHandoffSuccessRates(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('ai_handoffs')
        .select('from_employee, to_employee, reason, success_rate');

      if (error) {
        console.error('Error fetching handoff success rates:', error);
        return {};
      }

      const rates: Record<string, number> = {};
      data?.forEach(handoff => {
        const key = `${handoff.from_employee}->${handoff.to_employee}:${handoff.reason}`;
        rates[key] = handoff.success_rate;
      });

      return rates;
    } catch (error) {
      console.error('Error in getHandoffSuccessRates:', error);
      return {};
    }
  }

  // Store user feedback
  async storeUserFeedback(
    userId: string,
    conversationId: string,
    employeeId: string,
    feedbackType: string,
    feedbackValue?: string,
    rating?: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_user_feedback')
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          employee_id: employeeId,
          feedback_type: feedbackType,
          feedback_value: feedbackValue,
          rating: rating});

      if (error) {
        console.error('Error storing user feedback:', error);
      }
    } catch (error) {
      console.error('Error in storeUserFeedback:', error);
    }
  }

  // Get AI system settings for user
  async getSystemSettings(userId: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase
        .from('ai_system_settings')
        .select('setting_name, setting_value')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching system settings:', error);
        return {};
      }

      const settings: Record<string, any> = {};
      data?.forEach(setting => {
        settings[setting.setting_name] = setting.setting_value;
      });

      return settings;
    } catch (error) {
      console.error('Error in getSystemSettings:', error);
      return {};
    }
  }

  // Update AI system setting
  async updateSystemSetting(userId: string, settingName: string, settingValue: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_system_settings')
        .upsert({
          user_id: userId,
          setting_name: settingName,
          setting_value: settingValue});

      if (error) {
        console.error('Error updating system setting:', error);
      }
    } catch (error) {
      console.error('Error in updateSystemSetting:', error);
    }
  }

  // Get employee performance analytics
  async getEmployeeAnalytics(employeeId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('ai_employee_analytics')
        .select('*');

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching employee analytics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getEmployeeAnalytics:', error);
      return [];
    }
  }

  // Clean up old conversation data (keep last 30 days)
  async cleanupOldData(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .lt('timestamp', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Error cleaning up old data:', error);
      }
    } catch (error) {
      console.error('Error in cleanupOldData:', error);
    }
  }
}

export default AILearningService;
