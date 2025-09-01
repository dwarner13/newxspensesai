import { AI_EMPLOYEE_VOICES, AIEmployeeVoice } from './podcastContentGenerator';

// Audio Processing Configuration
export interface AudioConfig {
  voice_id: string;
  speed: number;
  pitch: number;
  volume: number;
  language: string;
}

// AI Employee Voice Configurations
export const AI_EMPLOYEE_AUDIO_CONFIGS: Record<string, AudioConfig> = {
  'Prime': {
    voice_id: 'en-US-Neural2-F', // Professional female voice
    speed: 1.0,
    pitch: 0,
    volume: 1.0,
    language: 'en-US'
  },
  'Goalie': {
    voice_id: 'en-US-Neural2-A', // Energetic male voice
    speed: 1.1,
    pitch: 2,
    volume: 1.1,
    language: 'en-US'
  },
  'Crystal': {
    voice_id: 'en-US-Neural2-E', // Mysterious female voice
    speed: 0.9,
    pitch: -1,
    volume: 0.95,
    language: 'en-US'
  },
  'Blitz': {
    voice_id: 'en-US-Neural2-D', // Fast male voice
    speed: 1.2,
    pitch: 3,
    volume: 1.05,
    language: 'en-US'
  },
  'Tag': {
    voice_id: 'en-US-Neural2-C', // Precise male voice
    speed: 0.95,
    pitch: 0,
    volume: 1.0,
    language: 'en-US'
  },
  'Byte': {
    voice_id: 'en-US-Neural2-B', // Technical male voice
    speed: 1.0,
    pitch: 1,
    volume: 0.98,
    language: 'en-US'
  },
  'Intelia': {
    voice_id: 'en-US-Neural2-F', // Strategic female voice
    speed: 0.95,
    pitch: -1,
    volume: 1.0,
    language: 'en-US'
  },
  'Liberty': {
    voice_id: 'en-US-Neural2-A', // Inspirational male voice
    speed: 1.05,
    pitch: 2,
    volume: 1.1,
    language: 'en-US'
  },
  'Automa': {
    voice_id: 'en-US-Neural2-C', // Systematic male voice
    speed: 0.9,
    pitch: 0,
    volume: 0.95,
    language: 'en-US'
  },
  'Custodian': {
    voice_id: 'en-US-Neural2-E', // Protective female voice
    speed: 0.95,
    pitch: -1,
    volume: 1.0,
    language: 'en-US'
  }
};

// Audio Processing Class
export class PodcastAudioProcessor {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
    this.baseUrl = 'https://api.openai.com/v1/audio/speech';
  }

  // Process script to audio
  async processScriptToAudio(
    script: string,
    aiEmployees: string[],
    voiceStyle: string = 'professional'
  ): Promise<{
    audioUrl: string;
    duration: number;
    fileSize: number;
  }> {
    try {
      // Split script into sections by AI employee
      const sections = this.parseScriptSections(script);
      const audioSegments: ArrayBuffer[] = [];
      let totalDuration = 0;

      // Process each section with the appropriate AI employee voice
      for (const section of sections) {
        const audioConfig = this.getAudioConfigForEmployee(section.aiEmployee, voiceStyle);
        const audioSegment = await this.generateAudioSegment(section.content, audioConfig);
        
        audioSegments.push(audioSegment);
        totalDuration += this.estimateDuration(section.content);
      }

      // Combine audio segments
      const combinedAudio = await this.combineAudioSegments(audioSegments);
      
      // Upload to storage and get URL
      const audioUrl = await this.uploadAudio(combinedAudio);
      
      return {
        audioUrl,
        duration: totalDuration,
        fileSize: combinedAudio.byteLength
      };
    } catch (error) {
      console.error('Error processing script to audio:', error);
      throw new Error('Failed to generate audio from script');
    }
  }

  // Parse script into sections by AI employee
  private parseScriptSections(script: string): Array<{
    aiEmployee: string;
    content: string;
  }> {
    const sections: Array<{ aiEmployee: string; content: string }> = [];
    const lines = script.split('\n');
    let currentSection = '';
    let currentEmployee = 'Prime'; // Default

    for (const line of lines) {
      if (line.startsWith('[') && line.endsWith(']')) {
        // Save previous section
        if (currentSection.trim()) {
          sections.push({
            aiEmployee: currentEmployee,
            content: currentSection.trim()
          });
        }
        
        // Start new section
        const sectionName = line.slice(1, -1).toLowerCase();
        currentEmployee = this.getAIEmployeeForSection(sectionName);
        currentSection = '';
      } else {
        currentSection += line + '\n';
      }
    }

    // Add final section
    if (currentSection.trim()) {
      sections.push({
        aiEmployee: currentEmployee,
        content: currentSection.trim()
      });
    }

    return sections;
  }

  // Get AI employee for section name
  private getAIEmployeeForSection(sectionName: string): string {
    const sectionMap: Record<string, string> = {
      'intro': 'Prime',
      'spending_summary': 'Prime',
      'goal_updates': 'Goalie',
      'automation_wins': 'Blitz',
      'predictions': 'Crystal',
      'action_items': 'Prime',
      'outro': 'Prime',
      'goal_review': 'Goalie',
      'milestone_celebrations': 'Goalie',
      'debt_progress': 'Liberty',
      'motivation': 'Goalie',
      'next_steps': 'Goalie',
      'time_saved': 'Automa',
      'efficiency_gains': 'Automa',
      'new_automations': 'Blitz',
      'tips': 'Blitz',
      'comprehensive_analysis': 'Prime',
      'goal_achievements': 'Goalie',
      'business_insights': 'Intelia',
      'security_updates': 'Custodian',
      'next_month_planning': 'Prime'
    };

    return sectionMap[sectionName] || 'Prime';
  }

  // Get audio configuration for AI employee
  private getAudioConfigForEmployee(aiEmployee: string, voiceStyle: string): AudioConfig {
    const baseConfig = AI_EMPLOYEE_AUDIO_CONFIGS[aiEmployee] || AI_EMPLOYEE_AUDIO_CONFIGS['Prime'];
    
    // Adjust based on voice style preference
    const styleAdjustments: Record<string, Partial<AudioConfig>> = {
      'casual': { speed: baseConfig.speed * 1.05, pitch: baseConfig.pitch + 1 },
      'professional': baseConfig,
      'energetic': { speed: baseConfig.speed * 1.1, pitch: baseConfig.pitch + 2, volume: baseConfig.volume * 1.1 },
      'calm': { speed: baseConfig.speed * 0.9, pitch: baseConfig.pitch - 1, volume: baseConfig.volume * 0.95 }
    };

    const adjustment = styleAdjustments[voiceStyle] || {};
    
    return {
      ...baseConfig,
      ...adjustment
    };
  }

  // Generate audio segment for a section
  private async generateAudioSegment(content: string, config: AudioConfig): Promise<ArrayBuffer> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: content,
          voice: config.voice_id,
          speed: config.speed,
          response_format: 'mp3'
        })
      });

      if (!response.ok) {
        throw new Error(`Audio generation failed: ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error generating audio segment:', error);
      // Return empty audio buffer as fallback
      return new ArrayBuffer(0);
    }
  }

  // Combine multiple audio segments
  private async combineAudioSegments(segments: ArrayBuffer[]): Promise<ArrayBuffer> {
    // For now, we'll return the first segment as a placeholder
    // In a real implementation, you'd use Web Audio API or a server-side solution
    // to properly combine audio segments
    return segments[0] || new ArrayBuffer(0);
  }

  // Upload audio to storage
  private async uploadAudio(audioBuffer: ArrayBuffer): Promise<string> {
    try {
      // Convert ArrayBuffer to Blob
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      
      // Create a temporary URL for the audio
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // In a real implementation, you'd upload to Supabase storage or similar
      // For now, we'll return the temporary URL
      return audioUrl;
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw new Error('Failed to upload audio');
    }
  }

  // Estimate duration based on content length
  private estimateDuration(content: string): number {
    // Rough estimate: 150 words per minute
    const words = content.split(' ').length;
    return Math.ceil((words / 150) * 60); // Duration in seconds
  }

  // Add background music to audio
  async addBackgroundMusic(
    audioBuffer: ArrayBuffer,
    musicType: 'upbeat' | 'calm' | 'professional' | 'none' = 'none'
  ): Promise<ArrayBuffer> {
    if (musicType === 'none') {
      return audioBuffer;
    }

    // In a real implementation, you'd mix the audio with background music
    // For now, we'll return the original audio
    return audioBuffer;
  }

  // Add sound effects
  async addSoundEffects(
    audioBuffer: ArrayBuffer,
    effects: string[] = []
  ): Promise<ArrayBuffer> {
    if (effects.length === 0) {
      return audioBuffer;
    }

    // In a real implementation, you'd add sound effects at appropriate timestamps
    // For now, we'll return the original audio
    return audioBuffer;
  }

  // Get available voices
  async getAvailableVoices(): Promise<string[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech/voices', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available voices');
      }

      const data = await response.json();
      return data.voices?.map((voice: any) => voice.voice_id) || [];
    } catch (error) {
      console.error('Error fetching available voices:', error);
      return [];
    }
  }
}

// Utility function to create audio processor
export const createPodcastAudioProcessor = (apiKey?: string): PodcastAudioProcessor => {
  return new PodcastAudioProcessor(apiKey);
};

// Mock audio processor for development/testing
export class MockPodcastAudioProcessor extends PodcastAudioProcessor {
  async processScriptToAudio(
    script: string,
    aiEmployees: string[],
    voiceStyle: string = 'professional'
  ): Promise<{
    audioUrl: string;
    duration: number;
    fileSize: number;
  }> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock audio URL
    return {
      audioUrl: 'https://mock-audio-url.com/podcast-episode.mp3',
      duration: this.estimateDuration(script),
      fileSize: script.length * 10 // Mock file size
    };
  }
}
