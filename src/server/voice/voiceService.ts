import { OpenAI } from 'openai';
import { getSupabaseServerClient } from '../db';

export interface VoiceConfig {
  provider: 'whisper' | 'azure' | 'google';
  language: string;
  voiceId: string;
  speed: number;
  pitch: number;
}

export interface TranscriptResult {
  text: string;
  language: string;
  confidence: number;
}

export class VoiceService {
  private openai: OpenAI;
  private connections: Map<string, any>;
  
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});
    this.connections = new Map();
  }
  
  async startVoiceSession(
    userId: string,
    config: VoiceConfig
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    
    // Create WebRTC connection (simplified)
    const connection = {
      sessionId,
      userId,
      config,
      audioBuffer: Buffer.alloc(0),
      lastAudioTime: Date.now(),
    };
    
    this.connections.set(sessionId, connection);
    
    // Store session in database
    await this.saveSession(sessionId, userId, config);
    
    return sessionId;
  }
  
  async processAudioChunk(
    sessionId: string,
    audioData: Buffer
  ): Promise<string | null> {
    const connection = this.connections.get(sessionId);
    if (!connection) return null;
    
    // Voice activity detection
    if (!this.hasVoiceActivity(audioData)) {
      return null;
    }
    
    // Accumulate audio until silence detected
    connection.audioBuffer = Buffer.concat([connection.audioBuffer, audioData]);
    connection.lastAudioTime = Date.now();
    
    // Check for end of speech (500ms silence)
    setTimeout(async () => {
      if (Date.now() - connection.lastAudioTime >= 500) {
        const fullAudio = connection.audioBuffer;
        connection.audioBuffer = Buffer.alloc(0);
        
        if (fullAudio.length > 0) {
          // Transcribe
          const transcript = await this.transcribe(fullAudio, connection.config);
          
          if (transcript.text.trim()) {
            // Process through Agent Kernel
            const response = await this.processVoiceCommand(
              transcript.text,
              connection.userId,
              sessionId
            );
            
            // Convert response to speech
            const audioResponse = await this.synthesize(
              response,
              connection.config
            );
            
            // Return audio response
            return audioResponse;
          }
        }
      }
    }, 500);
    
    return null;
  }
  
  async transcribe(
    audio: Buffer,
    config: VoiceConfig
  ): Promise<TranscriptResult> {
    try {
      // Preprocess audio
      const processed = await this.preprocessAudio(audio);
      
      // Use Whisper API
      const response = await this.openai.audio.transcriptions.create({
        file: new File([processed], 'audio.webm', { type: 'audio/webm' }),
        model: 'whisper-1',
        language: config.language,
        temperature: 0.2,
        prompt: this.getContextPrompt(config),
      });
      
      // Post-process transcript
      const cleaned = this.cleanTranscript(response.text);
      
      return {
        text: cleaned,
        language: response.language || config.language,
        confidence: this.calculateConfidence(response),
      };
      
    } catch (error) {
      console.error('Transcription failed:', error);
      
      // Fallback to browser speech recognition if available
      return this.fallbackTranscription(audio, config);
    }
  }
  
  async synthesize(
    text: string,
    config: VoiceConfig
  ): Promise<Buffer> {
    // Check cache first
    const cacheKey = this.getTTSCacheKey(text, config);
    const cached = await this.getCachedAudio(cacheKey);
    if (cached) return cached;
    
    // Preprocess text for better TTS
    const processed = this.preprocessForTTS(text);
    
    // Generate audio with ElevenLabs (simplified)
    const audio = await this.generateTTSAudio(processed, config);
    
    // Convert to appropriate format
    const formatted = await this.formatAudio(audio, 'webm');
    
    // Cache for reuse
    await this.cacheAudio(cacheKey, formatted);
    
    return formatted;
  }
  
  private preprocessForTTS(text: string): string {
    // Remove markdown and formatting
    text = text.replace(/[*_~`#]/g, '');
    
    // Handle numbers and currencies
    text = text.replace(/\$(\d+(?:\.\d{2})?)/g, (_, amount) => {
      const num = parseFloat(amount);
      return `${num} dollar${num !== 1 ? 's' : ''}`;
    });
    
    // Expand abbreviations
    const abbreviations: Record<string, string> = {
      'GST': 'G S T',
      'HST': 'H S T',
      'CRA': 'C R A',
      'FAQ': 'F A Q',
    };
    
    for (const [abbr, expansion] of Object.entries(abbreviations)) {
      text = text.replace(new RegExp(`\\b${abbr}\\b`, 'g'), expansion);
    }
    
    // Add pauses for better flow
    text = text.replace(/\. /g, '. ... ');
    text = text.replace(/\n\n/g, ' ... ... ');
    
    // Limit length for performance
    if (text.length > 1000) {
      text = text.substring(0, 997) + '...';
    }
    
    return text;
  }
  
  private hasVoiceActivity(audio: Buffer): boolean {
    // Simple energy-based VAD
    const samples = new Int16Array(audio.buffer);
    const energy = samples.reduce((sum, sample) => {
      return sum + Math.abs(sample);
    }, 0) / samples.length;
    
    // Dynamic threshold based on noise floor
    const threshold = this.getNoiseFloor() * 3;
    
    return energy > threshold;
  }
  
  private getNoiseFloor(): number {
    // Track ambient noise level
    // This would be calibrated per session
    return 100; // Default threshold
  }
  
  private async processVoiceCommand(
    text: string,
    userId: string,
    sessionId: string
  ): Promise<string> {
    // Get conversation context
    const context = await this.getConversationContext(sessionId);
    
    // Process through Agent Kernel (simplified)
    const response = await this.runAgentKernel(text, userId, context);
    
    return response;
  }
  
  private getContextPrompt(config: VoiceConfig): string {
    // Provide context for better transcription
    return `Financial assistant conversation. Common terms: 
    GST, HST, CRA, receipt, expense, category, report, tax, invoice.
    Numbers are often dollar amounts. Language: ${config.language}`;
  }
  
  private cleanTranscript(text: string): string {
    // Remove filler words
    const fillers = /\b(um|uh|ah|like|you know|I mean)\b/gi;
    text = text.replace(fillers, '');
    
    // Fix common mis-transcriptions
    text = text.replace(/\bgst\b/gi, 'GST');
    text = text.replace(/\bcra\b/gi, 'CRA');
    
    // Clean up spacing
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }
  
  private calculateConfidence(response: any): number {
    // Estimate confidence based on response metrics
    // Higher temperature responses are less confident
    return 0.85; // Default
  }
  
  private async preprocessAudio(audio: Buffer): Promise<Buffer> {
    // Audio preprocessing for better transcription
    // This would include noise reduction, normalization, etc.
    return audio; // Simplified
  }
  
  private async fallbackTranscription(
    audio: Buffer,
    config: VoiceConfig
  ): Promise<TranscriptResult> {
    // Fallback transcription method
    return {
      text: '',
      language: config.language,
      confidence: 0.5,
    };
  }
  
  private async generateTTSAudio(
    text: string,
    config: VoiceConfig
  ): Promise<Buffer> {
    // Generate TTS audio using ElevenLabs or other service
    // This is a simplified implementation
    return Buffer.from('mock audio data');
  }
  
  private async formatAudio(audio: Buffer, format: string): Promise<Buffer> {
    // Convert audio to specified format
    return audio; // Simplified
  }
  
  private getTTSCacheKey(text: string, config: VoiceConfig): string {
    return crypto.createHash('sha256')
      .update(text)
      .update(JSON.stringify(config))
      .digest('hex');
  }
  
  private async getCachedAudio(key: string): Promise<Buffer | null> {
    // Check cache for existing audio
    return null; // Simplified
  }
  
  private async cacheAudio(key: string, audio: Buffer): Promise<void> {
    // Cache audio for reuse
    // Implementation would store in Redis or similar
  }
  
  private async saveSession(
    sessionId: string,
    userId: string,
    config: VoiceConfig
  ): Promise<void> {
    const client = getSupabaseServerClient();
    
    await client
      .from('voice_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        language: config.language,
        metadata: config,
      });
  }
  
  private async getConversationContext(sessionId: string): Promise<any> {
    const client = getSupabaseServerClient();
    
    const { data: session } = await client
      .from('voice_sessions')
      .select('conversation_id')
      .eq('id', sessionId)
      .single();
    
    return session;
  }
  
  private async runAgentKernel(
    text: string,
    userId: string,
    context: any
  ): Promise<string> {
    // This would integrate with the existing Agent Kernel
    // For now, return a simple response
    return `I heard: "${text}". This is a voice response from Prime.`;
  }
  
  async endVoiceSession(sessionId: string): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) return;
    
    // Update session end time
    const client = getSupabaseServerClient();
    await client
      .from('voice_sessions')
      .update({
        end_time: new Date().toISOString(),
        duration_seconds: Math.floor((Date.now() - connection.startTime) / 1000),
      })
      .eq('id', sessionId);
    
    // Clean up connection
    this.connections.delete(sessionId);
  }
}
