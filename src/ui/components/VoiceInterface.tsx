import React, { useState, useEffect, useRef } from 'react';

interface VoiceConfig {
  provider: 'whisper' | 'azure' | 'google';
  language: string;
  voiceId: string;
  speed: number;
  pitch: number;
}

export function VoiceInterface() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [config, setConfig] = useState<VoiceConfig>({
    provider: 'whisper',
    language: 'en',
    voiceId: 'rachel',
    speed: 1.0,
    pitch: 1.0,
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  const startVoiceSession = async () => {
    try {
      const response = await fetch('/.netlify/functions/voice-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
        body: JSON.stringify(config),
      });
      
      const data = await response.json();
      setSessionId(data.sessionId);
      
      // Start audio recording
      await startRecording();
      
    } catch (error) {
      console.error('Failed to start voice session:', error);
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioChunk(audioBlob);
        audioChunksRef.current = [];
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsListening(true);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };
  
  const processAudioChunk = async (audioBlob: Blob) => {
    if (!sessionId) return;
    
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('sessionId', sessionId);
      
      const response = await fetch('/.netlify/functions/voice-process', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.transcript) {
        setTranscript(data.transcript);
      }
      
      if (data.response) {
        setResponse(data.response);
        
        // Play audio response if available
        if (data.audioResponse) {
          await playAudioResponse(data.audioResponse);
        }
      }
      
    } catch (error) {
      console.error('Failed to process audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const playAudioResponse = async (audioData: string) => {
    try {
      const audio = new Audio(`data:audio/webm;base64,${audioData}`);
      await audio.play();
    } catch (error) {
      console.error('Failed to play audio response:', error);
    }
  };
  
  const endVoiceSession = async () => {
    if (sessionId) {
      await fetch('/.netlify/functions/voice-end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
        body: JSON.stringify({ sessionId }),
      });
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setSessionId(null);
    setIsListening(false);
    setIsProcessing(false);
    setTranscript('');
    setResponse('');
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Voice Assistant
        </h3>
        <p className="text-sm text-gray-600">
          Speak naturally to interact with Prime
        </p>
      </div>
      
      {/* Voice Status */}
      <div className="text-center mb-6">
        {isListening && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Listening...</span>
          </div>
        )}
        
        {isProcessing && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Processing...</span>
          </div>
        )}
        
        {!isListening && !isProcessing && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Ready</span>
          </div>
        )}
      </div>
      
      {/* Transcript */}
      {transcript && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-1">You said:</h4>
          <p className="text-sm text-gray-900">{transcript}</p>
        </div>
      )}
      
      {/* Response */}
      {response && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-700 mb-1">Prime:</h4>
          <p className="text-sm text-blue-900">{response}</p>
        </div>
      )}
      
      {/* Controls */}
      <div className="flex justify-center space-x-4">
        {!sessionId ? (
          <button
            onClick={startVoiceSession}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Voice Session
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={isListening ? stopRecording : startRecording}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isListening ? 'Stop' : 'Listen'}
            </button>
            
            <button
              onClick={endVoiceSession}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              End Session
            </button>
          </div>
        )}
      </div>
      
      {/* Configuration */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Voice Settings</h4>
        
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Language</label>
            <select
              value={config.language}
              onChange={(e) => setConfig({ ...config, language: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Voice</label>
            <select
              value={config.voiceId}
              onChange={(e) => setConfig({ ...config, voiceId: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="rachel">Rachel (Female)</option>
              <option value="drew">Drew (Male)</option>
              <option value="clyde">Clyde (Male)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Speed: {config.speed}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={config.speed}
              onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
