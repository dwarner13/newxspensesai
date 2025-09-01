import { 
  PodcastEpisode, 
  PodcastPreferences, 
  PodcastEpisodeTemplate,
  PodcastGenerationRequest,
  PodcastGenerationResponse,
  AIEmployeeData
} from '../types/podcast.types';
import { 
  createPodcastContentGenerator,
  PodcastContentGenerator 
} from './podcastContentGenerator';
import { 
  createPodcastAudioProcessor,
  MockPodcastAudioProcessor 
} from './podcastAudioProcessor';
import { 
  createPodcastEpisode,
  updatePodcastEpisode,
  createPodcastAIInsight,
  getAIEmployeeData,
  getEpisodeTemplate,
  getPodcastPreferences
} from './podcast';

// Podcast Generation Status
export enum GenerationStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Generation Progress
export interface GenerationProgress {
  status: GenerationStatus;
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
}

// Podcast Generation Orchestrator
export class PodcastGenerator {
  private contentGenerator: PodcastContentGenerator;
  private audioProcessor: MockPodcastAudioProcessor; // Using mock for now

  constructor() {
    this.audioProcessor = new MockPodcastAudioProcessor();
  }

  // Main generation function
  async generatePodcast(request: PodcastGenerationRequest): Promise<PodcastGenerationResponse> {
    try {
      const { user_id, episode_type, preferences, ai_employee_data, template } = request;

      // Step 1: Create initial episode record
      const episode = await createPodcastEpisode({
        user_id,
        episode_type,
        title: `${episode_type.charAt(0).toUpperCase() + episode_type.slice(1)} Financial Update`,
        script_content: 'Generating...',
        ai_employees_used: template?.required_ai_employees || ['Prime'],
        data_sources_used: ['transactions', 'goals'],
        generation_status: 'generating'
      });

      // Step 2: Get or create preferences
      let userPreferences = preferences;
      if (!userPreferences) {
        userPreferences = await getPodcastPreferences(user_id) || {
          user_id,
          episode_length_preference: 'medium',
          frequency: 'weekly',
          content_focus: ['goals', 'automation'],
          favorite_ai_employees: ['Prime', 'Goalie'],
          voice_style: 'professional',
          include_personal_data: true,
          include_amounts: true,
          include_predictions: true,
          auto_generate: true,
          notification_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      // Step 3: Get episode template
      let episodeTemplate = template;
      if (!episodeTemplate) {
        const templateName = this.getTemplateNameForEpisodeType(episode_type);
        episodeTemplate = await getEpisodeTemplate(templateName);
      }

      if (!episodeTemplate) {
        throw new Error('No episode template found');
      }

      // Step 4: Initialize content generator
      this.contentGenerator = createPodcastContentGenerator(
        ai_employee_data,
        userPreferences,
        episodeTemplate
      );

      // Step 5: Generate script content
      const scriptResult = await this.contentGenerator.generateEpisodeScript();
      
      // Step 6: Update episode with script
      await updatePodcastEpisode(episode.id, {
        script_content: scriptResult.script,
        duration_seconds: scriptResult.estimatedDuration
      });

      // Step 7: Create AI insights
      for (const insight of scriptResult.insights) {
        await createPodcastAIInsight({
          episode_id: episode.id,
          ai_employee: insight.ai_employee,
          insight_type: insight.insight_type,
          content: insight.content,
          data_source: insight.data_source,
          confidence_score: insight.confidence_score
        });
      }

      // Step 8: Generate audio (async - don't wait for completion)
      this.generateAudioAsync(episode.id, scriptResult.script, userPreferences.voice_style);

      return {
        episode_id: episode.id,
        status: 'generating',
        estimated_duration: scriptResult.estimatedDuration
      };

    } catch (error) {
      console.error('Error generating podcast:', error);
      throw new Error('Failed to generate podcast episode');
    }
  }

  // Generate audio asynchronously
  private async generateAudioAsync(episodeId: string, script: string, voiceStyle: string) {
    try {
      // Update status to indicate audio generation
      await updatePodcastEpisode(episodeId, {
        generation_status: 'generating'
      });

      // Generate audio
      const audioResult = await this.audioProcessor.processScriptToAudio(
        script,
        ['Prime', 'Goalie', 'Crystal'], // Default AI employees
        voiceStyle
      );

      // Update episode with audio details
      await updatePodcastEpisode(episodeId, {
        audio_url: audioResult.audioUrl,
        duration_seconds: audioResult.duration,
        file_size_bytes: audioResult.fileSize,
        generation_status: 'completed'
      });

    } catch (error) {
      console.error('Error generating audio:', error);
      await updatePodcastEpisode(episodeId, {
        generation_status: 'failed'
      });
    }
  }

  // Get template name for episode type
  private getTemplateNameForEpisodeType(episodeType: string): string {
    const templateMap: Record<string, string> = {
      'weekly': 'weekly_summary',
      'monthly': 'monthly_deep_dive',
      'goals': 'goal_progress',
      'automation': 'automation_success',
      'business': 'monthly_deep_dive',
      'personal': 'weekly_summary'
    };

    return templateMap[episodeType] || 'weekly_summary';
  }

  // Generate podcast with automatic data fetching
  async generatePodcastWithData(
    userId: string,
    episodeType: string,
    customPreferences?: Partial<PodcastPreferences>
  ): Promise<PodcastGenerationResponse> {
    try {
      // Fetch AI employee data
      const aiEmployeeData = await getAIEmployeeData(userId);
      
      // Get or create preferences
      let preferences = await getPodcastPreferences(userId);
      if (customPreferences && preferences) {
        preferences = { ...preferences, ...customPreferences };
      }

      // Get template
      const templateName = this.getTemplateNameForEpisodeType(episodeType);
      const template = await getEpisodeTemplate(templateName);

      if (!template) {
        throw new Error(`No template found for episode type: ${episodeType}`);
      }

      // Create generation request
      const request: PodcastGenerationRequest = {
        episode_type: episodeType as any,
        user_id: userId,
        preferences: preferences!,
        ai_employee_data: aiEmployeeData,
        template
      };

      // Generate podcast
      return await this.generatePodcast(request);

    } catch (error) {
      console.error('Error generating podcast with data:', error);
      throw new Error('Failed to generate podcast with data');
    }
  }

  // Get generation progress
  async getGenerationProgress(episodeId: string): Promise<GenerationProgress> {
    try {
      // In a real implementation, you'd track progress in a separate table
      // For now, we'll return a mock progress
      return {
        status: GenerationStatus.GENERATING,
        progress: 75,
        currentStep: 'Generating audio',
        estimatedTimeRemaining: 30
      };
    } catch (error) {
      console.error('Error getting generation progress:', error);
      return {
        status: GenerationStatus.FAILED,
        progress: 0,
        currentStep: 'Error occurred'
      };
    }
  }

  // Cancel generation
  async cancelGeneration(episodeId: string): Promise<void> {
    try {
      await updatePodcastEpisode(episodeId, {
        generation_status: 'failed'
      });
    } catch (error) {
      console.error('Error canceling generation:', error);
      throw new Error('Failed to cancel generation');
    }
  }

  // Regenerate episode
  async regenerateEpisode(episodeId: string): Promise<PodcastGenerationResponse> {
    try {
      // Get existing episode
      // In a real implementation, you'd fetch the episode and regenerate
      // For now, we'll create a new episode
      return await this.generatePodcastWithData('user-id', 'weekly');
    } catch (error) {
      console.error('Error regenerating episode:', error);
      throw new Error('Failed to regenerate episode');
    }
  }
}

// Utility function to create podcast generator
export const createPodcastGenerator = (): PodcastGenerator => {
  return new PodcastGenerator();
};

// Convenience functions for common podcast types
export const generateWeeklyPodcast = async (userId: string): Promise<PodcastGenerationResponse> => {
  const generator = createPodcastGenerator();
  return await generator.generatePodcastWithData(userId, 'weekly');
};

export const generateMonthlyPodcast = async (userId: string): Promise<PodcastGenerationResponse> => {
  const generator = createPodcastGenerator();
  return await generator.generatePodcastWithData(userId, 'monthly');
};

export const generateGoalProgressPodcast = async (userId: string): Promise<PodcastGenerationResponse> => {
  const generator = createPodcastGenerator();
  return await generator.generatePodcastWithData(userId, 'goals');
};

export const generateAutomationPodcast = async (userId: string): Promise<PodcastGenerationResponse> => {
  const generator = createPodcastGenerator();
  return await generator.generatePodcastWithData(userId, 'automation');
};
