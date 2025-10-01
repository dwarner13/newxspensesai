import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Audio State Types
export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  duration: number;
  source: 'spotify' | 'internal' | 'podcast';
  url?: string;
  spotifyUri?: string;
}

export interface AudioState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  queue: AudioTrack[];
  isSpotifyConnected: boolean;
  spotifyUser: any | null;
  recommendations: AudioTrack[];
  currentContext: 'focus' | 'learning' | 'relax' | 'celebrate' | 'wellness' | null;
}

// Audio Actions
export type AudioAction =
  | { type: 'SET_CURRENT_TRACK'; payload: AudioTrack }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'ADD_TO_QUEUE'; payload: AudioTrack }
  | { type: 'REMOVE_FROM_QUEUE'; payload: string }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'SET_SPOTIFY_CONNECTED'; payload: boolean }
  | { type: 'SET_SPOTIFY_USER'; payload: any }
  | { type: 'SET_RECOMMENDATIONS'; payload: AudioTrack[] }
  | { type: 'SET_CONTEXT'; payload: 'focus' | 'learning' | 'relax' | 'celebrate' | 'wellness' | null }
  | { type: 'NEXT_TRACK' }
  | { type: 'PREVIOUS_TRACK' };

// Initial State
const initialState: AudioState = {
  currentTrack: null,
  isPlaying: false,
  volume: 0.7,
  progress: 0,
  queue: [],
  isSpotifyConnected: false,
  spotifyUser: null,
  recommendations: [],
  currentContext: null,
};

// Audio Reducer
function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'SET_CURRENT_TRACK':
      return { ...state, currentTrack: action.payload, progress: 0 };
    
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };
    
    case 'ADD_TO_QUEUE':
      return { ...state, queue: [...state.queue, action.payload] };
    
    case 'REMOVE_FROM_QUEUE':
      return { 
        ...state, 
        queue: state.queue.filter(track => track.id !== action.payload) 
      };
    
    case 'CLEAR_QUEUE':
      return { ...state, queue: [] };
    
    case 'SET_SPOTIFY_CONNECTED':
      return { ...state, isSpotifyConnected: action.payload };
    
    case 'SET_SPOTIFY_USER':
      return { ...state, spotifyUser: action.payload };
    
    case 'SET_RECOMMENDATIONS':
      return { ...state, recommendations: action.payload };
    
    case 'SET_CONTEXT':
      return { ...state, currentContext: action.payload };
    
    case 'NEXT_TRACK':
      if (state.queue.length > 0) {
        const [nextTrack, ...remainingQueue] = state.queue;
        return {
          ...state,
          currentTrack: nextTrack,
          queue: remainingQueue,
          progress: 0,
        };
      }
      return state;
    
    case 'PREVIOUS_TRACK':
      // For now, just restart current track
      return { ...state, progress: 0 };
    
    default:
      return state;
  }
}

// Audio Context
interface AudioContextType {
  state: AudioState;
  dispatch: React.Dispatch<AudioAction>;
  playTrack: (track: AudioTrack) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  skipTrack: () => void;
  previousTrack: () => void;
  setVolume: (volume: number) => void;
  addToQueue: (track: AudioTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  connectSpotify: () => Promise<void>;
  disconnectSpotify: () => void;
  getRecommendations: (context: string) => Promise<AudioTrack[]>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

// Audio Provider Component
export function AudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(audioReducer, initialState);

  // Audio control functions
  const playTrack = (track: AudioTrack) => {
    dispatch({ type: 'SET_CURRENT_TRACK', payload: track});
    dispatch({ type: 'SET_PLAYING', payload: true});
  };

  const pauseTrack = () => {
    dispatch({ type: 'SET_PLAYING', payload: false});
  };

  const resumeTrack = () => {
    dispatch({ type: 'SET_PLAYING', payload: true});
  };

  const skipTrack = () => {
    dispatch({ type: 'NEXT_TRACK' });
  };

  const previousTrack = () => {
    dispatch({ type: 'PREVIOUS_TRACK' });
  };

  const setVolume = (volume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: volume});
  };

  const addToQueue = (track: AudioTrack) => {
    dispatch({ type: 'ADD_TO_QUEUE', payload: track});
  };

  const removeFromQueue = (trackId: string) => {
    dispatch({ type: 'REMOVE_FROM_QUEUE', payload: trackId});
  };

  const clearQueue = () => {
    dispatch({ type: 'CLEAR_QUEUE' });
  };

  // Spotify integration
  const connectSpotify = async () => {
    try {
      // TODO: Implement Spotify OAuth
      console.log('Connecting to Spotify...');
      dispatch({ type: 'SET_SPOTIFY_CONNECTED', payload: true});
    } catch (error) {
      console.error('Failed to connect to Spotify:', error);
    }
  };

  const disconnectSpotify = () => {
    dispatch({ type: 'SET_SPOTIFY_CONNECTED', payload: false});
    dispatch({ type: 'SET_SPOTIFY_USER', payload: null});
  };

  // Get AI-powered recommendations
  const getRecommendations = async (context: string): Promise<AudioTrack[]> => {
    // TODO: Implement AI recommendation system
    const mockRecommendations: AudioTrack[] = [
      {
        id: '1',
        title: 'Focus Flow',
        artist: 'Lo-Fi Beats',
        album: 'Productivity Vibes',
        duration: 180,
        source: 'internal',
        albumArt: 'https://via.placeholder.com/300x300/6366f1/ffffff?text=🎵',
      },
      {
        id: '2',
        title: 'Budgeting Basics',
        artist: 'Frank\'s Financial Series',
        album: 'Personal Finance 101',
        duration: 900,
        source: 'podcast',
        albumArt: 'https://via.placeholder.com/300x300/10b981/ffffff?text=📊',
      },
      {
        id: '3',
        title: 'Mindful Spending',
        artist: 'Wellness Audio',
        album: 'Financial Mindfulness',
        duration: 600,
        source: 'internal',
        albumArt: 'https://via.placeholder.com/300x300/f59e0b/ffffff?text=🧘',
      },
    ];

    dispatch({ type: 'SET_RECOMMENDATIONS', payload: mockRecommendations});
    return mockRecommendations;
  };

  // Context value
  const value: AudioContextType = {
    state,
    dispatch,
    playTrack,
    pauseTrack,
    resumeTrack,
    skipTrack,
    previousTrack,
    setVolume,
    addToQueue,
    removeFromQueue,
    clearQueue,
    connectSpotify,
    disconnectSpotify,
    getRecommendations,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

// Custom hook to use audio context
export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
} 
