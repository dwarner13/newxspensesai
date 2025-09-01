// AI Employee System Types
// These types define the structure for all AI employee interactions

export interface AIEmployeeConfig {
  id: string;
  employee_key: string;
  name: string;
  emoji: string;
  system_prompt: string;
  model_settings: {
    model: string;
    temperature: number;
    max_tokens: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  employee_key: string;
  conversation_id: string;
  messages: AIConversationMessage[];
  context: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

export interface UserAIPreferences {
  id: string;
  user_id: string;
  employee_key: string;
  preferences: {
    tone?: 'friendly' | 'professional' | 'casual';
    detail_level?: 'brief' | 'detailed' | 'comprehensive';
    language?: string;
    notifications_enabled?: boolean;
    auto_suggestions?: boolean;
  };
  conversation_count: number;
  last_interaction: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIInteractionLog {
  id: string;
  user_id: string;
  employee_key: string;
  interaction_type: 'chat' | 'route' | 'feature_use' | 'error';
  query?: string;
  response_length?: number;
  processing_time_ms?: number;
  success: boolean;
  error_message?: string;
  created_at: string;
}

// AI Employee Chat Interface
export interface AIEmployeeChatProps {
  employeeKey: string;
  employeeName: string;
  employeeEmoji: string;
  systemPrompt: string;
  conversationId?: string;
  onMessage?: (message: AIConversationMessage) => void;
  onError?: (error: string) => void;
  className?: string;
}

// AI Employee Response Interface
export interface AIEmployeeResponse {
  content: string;
  employee_key: string;
  conversation_id: string;
  processing_time_ms: number;
  tokens_used?: number;
  model_used?: string;
}

// AI Employee Routing Interface
export interface AIRoutingRequest {
  user_query: string;
  user_id: string;
  current_employee_key?: string;
  context?: Record<string, any>;
}

export interface AIRoutingResponse {
  recommended_employee_key: string;
  confidence_score: number;
  reasoning: string;
  suggested_response?: string;
}

// AI Employee Analytics
export interface AIEmployeeAnalytics {
  employee_key: string;
  total_conversations: number;
  total_messages: number;
  average_response_time_ms: number;
  user_satisfaction_score?: number;
  most_common_queries: string[];
  last_week_activity: number;
}

// AI Employee System Status
export interface AIEmployeeSystemStatus {
  total_employees: number;
  active_employees: number;
  total_conversations_today: number;
  average_response_time_ms: number;
  system_health: 'excellent' | 'good' | 'fair' | 'poor';
  last_updated: string;
}

// AI Employee Feature Flags
export interface AIEmployeeFeatureFlags {
  employee_key: string;
  features: {
    conversation_memory: boolean;
    context_awareness: boolean;
    personalization: boolean;
    analytics: boolean;
    export_conversations: boolean;
  };
  created_at: string;
  updated_at: string;
}

// AI Employee Learning Preferences
export interface AIEmployeeLearningPreferences {
  employee_key: string;
  user_id: string;
  learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  complexity_level: 'beginner' | 'intermediate' | 'advanced';
  preferred_topics: string[];
  avoid_topics: string[];
  created_at: string;
  updated_at: string;
}

// AI Employee Integration Settings
export interface AIEmployeeIntegrationSettings {
  employee_key: string;
  user_id: string;
  integrations: {
    calendar?: boolean;
    email?: boolean;
    notifications?: boolean;
    data_sync?: boolean;
    third_party_apis?: string[];
  };
  notification_preferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  created_at: string;
  updated_at: string;
}
