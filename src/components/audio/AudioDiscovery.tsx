import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAudio, AudioTrack } from '../../contexts/AudioContext';
import { 
  Play, 
  Plus, 
  Heart, 
  Clock, 
  Music, 
  Headphones, 
  BookOpen, 
  Sparkles,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react';

interface AudioDiscoveryProps {
  className?: string;
}

export function AudioDiscovery({ className = '' }: AudioDiscoveryProps) {
  const { state, playTrack, addToQueue, getRecommendations } = useAudio();
  const [activeTab, setActiveTab] = useState<'recommendations' | 'curated' | 'spotify'>('recommendations');
  const [loading, setLoading] = useState(false);

  // Curated playlists by context
  const curatedPlaylists = {
    focus: [
      {
        id: 'focus-1',
        title: 'Deep Focus Flow',
        description: 'Lo-fi beats for intense concentration',
        tracks: 12,
        duration: 3600,
        image: 'https://via.placeholder.com/200x200/6366f1/ffffff?text=🎯',
        context: 'focus'
      },
      {
        id: 'focus-2',
        title: 'Productivity Vibes',
        description: 'Ambient sounds for maximum efficiency',
        tracks: 8,
        duration: 2400,
        image: 'https://via.placeholder.com/200x200/10b981/ffffff?text=⚡',
        context: 'focus'
      }
    ],
    learning: [
      {
        id: 'learning-1',
        title: 'Financial Education',
        description: 'Learn while you manage your money',
        tracks: 15,
        duration: 5400,
        image: 'https://via.placeholder.com/200x200/f59e0b/ffffff?text=📚',
        context: 'learning'
      },
      {
        id: 'learning-2',
        title: 'Investment Insights',
        description: 'Expert advice on building wealth',
        tracks: 10,
        duration: 3600,
        image: 'https://via.placeholder.com/200x200/ef4444/ffffff?text=📈',
        context: 'learning'
      }
    ],
    wellness: [
      {
        id: 'wellness-1',
        title: 'Financial Mindfulness',
        description: 'Reduce money stress with guided meditation',
        tracks: 6,
        duration: 1800,
        image: 'https://via.placeholder.com/200x200/8b5cf6/ffffff?text=🧘',
        context: 'wellness'
      },
      {
        id: 'wellness-2',
        title: 'Money Confidence',
        description: 'Build a healthy relationship with money',
        tracks: 8,
        duration: 2400,
        image: 'https://via.placeholder.com/200x200/06b6d4/ffffff?text=💪',
        context: 'wellness'
      }
    ]
  };

  // Mock Spotify playlists
  const spotifyPlaylists = [
    {
      id: 'spotify-1',
      title: 'Your Top Mix 2024',
      description: 'Based on your listening history',
      tracks: 25,
      duration: 7200,
      image: 'https://via.placeholder.com/200x200/1db954/ffffff?text=🎵',
      source: 'spotify'
    },
    {
      id: 'spotify-2',
      title: 'Liked Songs',
      description: 'Your favorite tracks',
      tracks: 150,
      duration: 36000,
      image: 'https://via.placeholder.com/200x200/1db954/ffffff?text=❤️',
      source: 'spotify'
    }
  ];

  // Load recommendations
  useEffect(() => {
    if (activeTab === 'recommendations') {
      loadRecommendations();
    }
  }, [activeTab]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      await getRecommendations('current');
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Play a track
  const handlePlayTrack = (track: AudioTrack) => {
    playTrack(track);
  };

  // Add track to queue
  const handleAddToQueue = (track: AudioTrack) => {
    addToQueue(track);
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get context icon
  const getContextIcon = (context: string) => {
    switch (context) {
      case 'focus': return <Target size={16} />;
      case 'learning': return <BookOpen size={16} />;
      case 'wellness': return <Sparkles size={16} />;
      default: return <Music size={16} />;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Audio Discovery
          </h2>
          <div className="flex items-center space-x-2">
            <Headphones size={20} className="text-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              AI-Powered Recommendations
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {[
            { id: 'recommendations', label: 'AI Recommendations', icon: <Sparkles size={16} /> },
            { id: 'curated', label: 'Curated Playlists', icon: <Music size={16} /> },
            { id: 'spotify', label: 'Spotify', icon: <TrendingUp size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'recommendations' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recommended for You
              </h3>
              <button
                onClick={loadRecommendations}
                disabled={loading}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg mb-2"></div>
                    <div className="bg-gray-200 dark:bg-gray-700 h-4 rounded w-3/4 mb-1"></div>
                    <div className="bg-gray-200 dark:bg-gray-700 h-3 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {state.recommendations.map((track) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <img
                        src={track.albumArt || 'https://via.placeholder.com/60x60/6366f1/ffffff?text=🎵'}
                        alt={track.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {track.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {track.artist}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {formatDuration(track.duration)}
                          </span>
                          {track.source === 'podcast' && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                              Podcast
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        <Play size={14} />
                        <span>Play</span>
                      </button>
                      <button
                        onClick={() => handleAddToQueue(track)}
                        className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <Plus size={14} />
                        <span>Queue</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'curated' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Curated for Your Financial Journey
            </h3>
            
            {Object.entries(curatedPlaylists).map(([context, playlists]) => (
              <div key={context} className="mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  {getContextIcon(context)}
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white capitalize">
                    {context} Playlists
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {playlists.map((playlist) => (
                    <motion.div
                      key={playlist.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all"
                    >
                      <div className="flex items-start space-x-3">
                        <img
                          src={playlist.image}
                          alt={playlist.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {playlist.title}
                          </h5>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {playlist.description}
                          </p>
                          <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500 dark:text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Music size={12} />
                              <span>{playlist.tracks} tracks</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock size={12} />
                              <span>{formatDuration(playlist.duration)}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <button className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                          <Play size={14} />
                          <span>Play All</span>
                        </button>
                        <button className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                          <Heart size={14} />
                          <span>Save</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'spotify' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Your Spotify Library
              </h3>
              {!state.isSpotifyConnected && (
                <button className="text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                  Connect Spotify
                </button>
              )}
            </div>

            {!state.isSpotifyConnected ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Connect Your Spotify Account
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Access your playlists, liked songs, and get personalized recommendations
                </p>
                <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  Connect Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {spotifyPlaylists.map((playlist) => (
                  <motion.div
                    key={playlist.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="flex items-start space-x-3">
                      <img
                        src={playlist.image}
                        alt={playlist.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {playlist.title}
                        </h5>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {playlist.description}
                        </p>
                        <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500 dark:text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Music size={12} />
                            <span>{playlist.tracks} tracks</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock size={12} />
                            <span>{formatDuration(playlist.duration)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <button className="flex items-center space-x-1 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors">
                        <Play size={14} />
                        <span>Play All</span>
                      </button>
                      <button className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <Plus size={14} />
                        <span>Queue</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
