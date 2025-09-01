// Podcast Pipeline Types

export interface PodcastEpisode {
  id: string;
  user_id: string;
  episode_type: 'weekly' | 'monthly' | 'goals' | 'automation' | 'business' | 'personal';
  title: string;
  description?: string;
  script_content: string;
  audio_url?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  ai_employees_used: string[];
  data_sources_used: string[];
  generation_status: 'pending' | 'generating' | 'completed' | 'failed';
  generated_at: string;
  listened_at?: string;
  rating?: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface PodcastPreferences {
  user_id: string;
  episode_length_preference: 'short' | 'medium' | 'long';
  frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand';
  content_focus: string[];
  favorite_ai_employees: string[];
  voice_style: 'casual' | 'professional' | 'energetic' | 'calm';
  podcaster_style: 'positive' | 'roasting' | 'balanced' | 'motivational' | 'comedy' | 'strict';
  preferred_podcasters: string[];
  include_personal_data: boolean;
  include_amounts: boolean;
  include_predictions: boolean;
  auto_generate: boolean;
  notification_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PodcastAIInsight {
  id: string;
  episode_id: string;
  ai_employee: string;
  insight_type: 'financial_summary' | 'goal_update' | 'prediction' | 'automation_win' | 'business_insight' | 'security_tip';
  content: string;
  data_source?: string;
  confidence_score?: number;
  created_at: string;
}

export interface PodcastListeningHistory {
  id: string;
  user_id: string;
  episode_id: string;
  started_at: string;
  completed_at?: string;
  listened_duration_seconds?: number;
  completion_percentage?: number;
  skipped_sections?: string[];
  created_at: string;
}

export interface PodcastEpisodeTemplate {
  id: string;
  template_name: string;
  episode_type: string;
  structure: PodcastEpisodeStructure;
  default_duration_seconds: number;
  required_ai_employees: string[];
  optional_ai_employees: string[];
  is_active: boolean;
  created_at: string;
}

export interface PodcastEpisodeStructure {
  sections: PodcastEpisodeSection[];
}

export interface PodcastEpisodeSection {
  name: string;
  duration: number;
  ai_employee: string;
  description?: string;
  required?: boolean;
}

// AI Employee Data Types
export interface AIEmployeeData {
  transactions?: TransactionData;
  goals?: GoalData;
  xp_activities?: XPActivityData;
  receipts?: ReceiptData;
  profile?: ProfileData;
  categorization_rules?: CategorizationRuleData;
}

export interface TransactionData {
  recent_transactions: any[];
  spending_by_category: Record<string, number>;
  total_spent: number;
  total_income: number;
  spending_trends: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
}

export interface GoalData {
  active_goals: any[];
  completed_goals: any[];
  goal_progress: Record<string, { current: number; target: number; percentage: number }>;
  recent_milestones: any[];
}

export interface XPActivityData {
  recent_activities: any[];
  current_level: number;
  current_xp: number;
  streak_days: number;
  recent_badges: any[];
}

export interface ReceiptData {
  recent_receipts: any[];
  processing_stats: {
    total_processed: number;
    success_rate: number;
    average_processing_time: number;
  };
}

export interface ProfileData {
  display_name: string;
  level: number;
  xp: number;
  streak: number;
  preferences: any;
}

export interface CategorizationRuleData {
  rules: any[];
  accuracy_stats: {
    total_categorizations: number;
    accuracy_percentage: number;
    learning_progress: number;
  };
}

// Podcast Generation Types
export interface PodcastGenerationRequest {
  episode_type: 'weekly' | 'monthly' | 'goals' | 'automation' | 'business' | 'personal';
  user_id: string;
  preferences: PodcastPreferences;
  ai_employee_data: AIEmployeeData;
  template?: PodcastEpisodeTemplate;
}

export interface PodcastGenerationResponse {
  episode_id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  estimated_duration?: number;
  progress?: number;
  error_message?: string;
}

// Audio Processing Types
export interface AudioProcessingRequest {
  episode_id: string;
  script_content: string;
  voice_style: string;
  ai_employees_used: string[];
}

export interface AudioProcessingResponse {
  audio_url: string;
  duration_seconds: number;
  file_size_bytes: number;
  processing_time: number;
}

// Analytics Types
export interface PodcastAnalytics {
  total_episodes: number;
  total_listening_time: number;
  average_completion_rate: number;
  favorite_episode_types: string[];
  listening_trends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  ai_employee_performance: Record<string, {
    episodes_contributed: number;
    average_rating: number;
    user_feedback: string[];
  }>;
}
