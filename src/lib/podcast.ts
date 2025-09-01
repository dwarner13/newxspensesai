import { supabase } from './supabase';
import { 
  PodcastEpisode, 
  PodcastPreferences, 
  PodcastAIInsight, 
  PodcastListeningHistory,
  PodcastEpisodeTemplate,
  AIEmployeeData,
  PodcastGenerationRequest,
  PodcastAnalytics
} from '../types/podcast.types';

// Podcast Episodes
export const createPodcastEpisode = async (episode: Omit<PodcastEpisode, 'id' | 'created_at' | 'updated_at'>): Promise<PodcastEpisode> => {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  const { data, error } = await supabase
    .from('podcast_episodes')
    .insert(episode)
    .select()
    .single();

  if (error) {
    console.error('Error creating podcast episode:', error);
    throw error;
  }

  return data;
};

export const getPodcastEpisodes = async (userId: string, filters?: {
  episode_type?: string;
  status?: string;
  limit?: number;
}): Promise<PodcastEpisode[]> => {
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from('podcast_episodes')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false });

  if (filters?.episode_type) {
    query = query.eq('episode_type', filters.episode_type);
  }

  if (filters?.status) {
    query = query.eq('generation_status', filters.status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching podcast episodes:', error);
    return [];
  }

  return data || [];
};

export const updatePodcastEpisode = async (id: string, updates: Partial<PodcastEpisode>): Promise<PodcastEpisode> => {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  const { data, error } = await supabase
    .from('podcast_episodes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating podcast episode:', error);
    throw error;
  }

  return data;
};

export const deletePodcastEpisode = async (id: string): Promise<void> => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from('podcast_episodes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting podcast episode:', error);
    throw error;
  }
};

// Podcast Preferences
export const getPodcastPreferences = async (userId: string): Promise<PodcastPreferences | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('podcast_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error fetching podcast preferences:', error);
    return null;
  }

  return data;
};

export const createOrUpdatePodcastPreferences = async (preferences: Omit<PodcastPreferences, 'created_at' | 'updated_at'>): Promise<PodcastPreferences> => {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  const { data, error } = await supabase
    .from('podcast_preferences')
    .upsert(preferences, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating/updating podcast preferences:', error);
    throw error;
  }

  return data;
};

export const getDefaultPodcastPreferences = (userId: string): Omit<PodcastPreferences, 'created_at' | 'updated_at'> => {
  return {
    user_id: userId,
    episode_length_preference: 'medium',
    frequency: 'weekly',
    content_focus: ['goals', 'automation'],
    favorite_ai_employees: ['Prime', 'Goalie'],
    voice_style: 'professional',
    podcaster_style: 'balanced',
    preferred_podcasters: ['Prime'],
    include_personal_data: true,
    include_amounts: true,
    include_predictions: true,
    auto_generate: false,
    notification_enabled: true
  };
};

// AI Insights
export const createPodcastAIInsight = async (insight: Omit<PodcastAIInsight, 'id' | 'created_at'>): Promise<PodcastAIInsight> => {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  const { data, error } = await supabase
    .from('podcast_ai_insights')
    .insert(insight)
    .select()
    .single();

  if (error) {
    console.error('Error creating AI insight:', error);
    throw error;
  }

  return data;
};

export const getPodcastAIInsights = async (episodeId: string): Promise<PodcastAIInsight[]> => {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('podcast_ai_insights')
    .select('*')
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching AI insights:', error);
    return [];
  }

  return data || [];
};

// Listening History
export const createListeningSession = async (session: Omit<PodcastListeningHistory, 'id' | 'created_at'>): Promise<PodcastListeningHistory> => {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  const { data, error } = await supabase
    .from('podcast_listening_history')
    .insert(session)
    .select()
    .single();

  if (error) {
    console.error('Error creating listening session:', error);
    throw error;
  }

  return data;
};

export const updateListeningSession = async (id: string, updates: Partial<PodcastListeningHistory>): Promise<PodcastListeningHistory> => {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  const { data, error } = await supabase
    .from('podcast_listening_history')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating listening session:', error);
    throw error;
  }

  return data;
};

export const getListeningHistory = async (userId: string, limit?: number): Promise<PodcastListeningHistory[]> => {
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from('podcast_listening_history')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching listening history:', error);
    return [];
  }

  return data || [];
};

// Episode Templates
export const getEpisodeTemplates = async (): Promise<PodcastEpisodeTemplate[]> => {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('podcast_episode_templates')
    .select('*')
    .eq('is_active', true)
    .order('template_name', { ascending: true });

  if (error) {
    console.error('Error fetching episode templates:', error);
    return [];
  }

  return data || [];
};

export const getEpisodeTemplate = async (templateName: string): Promise<PodcastEpisodeTemplate | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('podcast_episode_templates')
    .select('*')
    .eq('template_name', templateName)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching episode template:', error);
    return null;
  }

  return data;
};

// Data Aggregation for AI Employees
export const getAIEmployeeData = async (userId: string): Promise<AIEmployeeData> => {
  if (!supabase) {
    return {};
  }

  try {
    // Get transactions data
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(50);

    // Get goals data
    const { data: goals } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId);

    // Get XP activities
    const { data: xpActivities } = await supabase
      .from('xp_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Get categorization rules
    const { data: categorizationRules } = await supabase
      .from('categorization_rules')
      .select('*')
      .eq('user_id', userId);

    return {
      transactions: transactions ? {
        recent_transactions: transactions,
        spending_by_category: transactions.reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
          return acc;
        }, {} as Record<string, number>),
        total_spent: transactions
          .filter(t => t.type === 'Debit')
          .reduce((sum, t) => sum + Number(t.amount), 0),
        total_income: transactions
          .filter(t => t.type === 'Credit')
          .reduce((sum, t) => sum + Number(t.amount), 0),
        spending_trends: {
          direction: 'stable',
          percentage: 0,
          period: 'week'
        }
      } : undefined,
      goals: goals ? {
        active_goals: goals.filter(g => !g.completed),
        completed_goals: goals.filter(g => g.completed),
        goal_progress: goals.reduce((acc, g) => {
          acc[g.goal_name] = {
            current: Number(g.current_amount),
            target: Number(g.target_amount),
            percentage: (Number(g.current_amount) / Number(g.target_amount)) * 100
          };
          return acc;
        }, {} as Record<string, { current: number; target: number; percentage: number }>),
        recent_milestones: []
      } : undefined,
      xp_activities: xpActivities ? {
        recent_activities: xpActivities,
        current_level: profile?.level || 1,
        current_xp: profile?.xp || 0,
        streak_days: profile?.streak || 0,
        recent_badges: []
      } : undefined,
      profile: profile ? {
        display_name: profile.display_name || 'User',
        level: profile.level || 1,
        xp: profile.xp || 0,
        streak: profile.streak || 0,
        preferences: {}
      } : undefined,
      categorization_rules: categorizationRules ? {
        rules: categorizationRules,
        accuracy_stats: {
          total_categorizations: categorizationRules.length,
          accuracy_percentage: 95,
          learning_progress: 75
        }
      } : undefined
    };
  } catch (error) {
    console.error('Error aggregating AI employee data:', error);
    return {};
  }
};

// Analytics
export const getPodcastAnalytics = async (userId: string): Promise<PodcastAnalytics> => {
  if (!supabase) {
    return {
      total_episodes: 0,
      total_listening_time: 0,
      average_completion_rate: 0,
      favorite_episode_types: [],
      listening_trends: { daily: [], weekly: [], monthly: [] },
      ai_employee_performance: {}
    };
  }

  try {
    // Get episodes
    const { data: episodes } = await supabase
      .from('podcast_episodes')
      .select('*')
      .eq('user_id', userId);

    // Get listening history
    const { data: listeningHistory } = await supabase
      .from('podcast_listening_history')
      .select('*')
      .eq('user_id', userId);

    // Get AI insights
    const { data: aiInsights } = await supabase
      .from('podcast_ai_insights')
      .select('*')
      .in('episode_id', episodes?.map(e => e.id) || []);

    const total_episodes = episodes?.length || 0;
    const total_listening_time = listeningHistory?.reduce((sum, h) => sum + (h.listened_duration_seconds || 0), 0) || 0;
    const average_completion_rate = listeningHistory?.length ? 
      listeningHistory.reduce((sum, h) => sum + (h.completion_percentage || 0), 0) / listeningHistory.length : 0;

    // Calculate favorite episode types
    const episodeTypeCounts = episodes?.reduce((acc, e) => {
      acc[e.episode_type] = (acc[e.episode_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const favorite_episode_types = Object.entries(episodeTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    // Calculate AI employee performance
    const aiEmployeePerformance: Record<string, any> = {};
    aiInsights?.forEach(insight => {
      if (!aiEmployeePerformance[insight.ai_employee]) {
        aiEmployeePerformance[insight.ai_employee] = {
          episodes_contributed: 0,
          average_rating: 0,
          user_feedback: []
        };
      }
      aiEmployeePerformance[insight.ai_employee].episodes_contributed++;
    });

    return {
      total_episodes,
      total_listening_time,
      average_completion_rate,
      favorite_episode_types,
      listening_trends: { daily: [], weekly: [], monthly: [] },
      ai_employee_performance
    };
  } catch (error) {
    console.error('Error fetching podcast analytics:', error);
    return {
      total_episodes: 0,
      total_listening_time: 0,
      average_completion_rate: 0,
      favorite_episode_types: [],
      listening_trends: { daily: [], weekly: [], monthly: [] },
      ai_employee_performance: {}
    };
  }
};

// Podcast Generation
export const requestPodcastGeneration = async (request: PodcastGenerationRequest): Promise<PodcastGenerationResponse> => {
  // This would typically call your Python backend for AI processing
  // For now, we'll create a placeholder episode
  const episode = await createPodcastEpisode({
    user_id: request.user_id,
    episode_type: request.episode_type,
    title: `${request.episode_type.charAt(0).toUpperCase() + request.episode_type.slice(1)} Financial Update`,
    script_content: 'Episode script will be generated by AI...',
    ai_employees_used: request.template?.required_ai_employees || ['Prime'],
    data_sources_used: ['transactions', 'goals'],
    generation_status: 'pending'
  });

  return {
    episode_id: episode.id,
    status: 'pending',
    estimated_duration: request.template?.default_duration_seconds || 300
  };
};
