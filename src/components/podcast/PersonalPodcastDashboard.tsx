import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePersonalPodcast } from '../../contexts/PersonalPodcastContext';
import { 
  Play, 
  Pause, 
  Plus, 
  Settings, 
  Headphones, 
  Mic, 
  Sparkles, 
  Calendar,
  Target,
  TrendingUp,
  Heart,
  Share2,
  Clock,
  Volume2,
  Download,
  Star,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

export function PersonalPodcastDashboard() {
  const { 
    state, 
    generateEpisode, 
    playEpisode, 
    pauseEpisode, 
    updatePlayProgress,
    updatePreferences,
    deleteEpisode,
    shareEpisode
  } = usePersonalPodcast();

  const [showSettings, setShowSettings] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate demo episodes on first load
  useEffect(() => {
    if (state.episodes.length === 0) {
      generateDemoEpisodes();
    }
  }, []);

  const generateDemoEpisodes = async () => {
    setIsGenerating(true);
    try {
      await generateEpisode('monthly');
      await generateEpisode('achievement');
      await generateEpisode('insight');
    } catch (error) {
      console.error('Failed to generate demo episodes:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateEpisode = async (triggerType: string) => {
    setIsGenerating(true);
    try {
      await generateEpisode(triggerType);
    } catch (error) {
      console.error('Failed to generate episode:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayEpisode = (episodeId: string) => {
    if (state.currentEpisode?.id === episodeId && state.currentEpisode?.isPlaying) {
      pauseEpisode(episodeId);
    } else {
      playEpisode(episodeId);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getEpisodeIcon = (episodeType: string) => {
    switch (episodeType) {
      case 'monthly': return <Calendar size={20} className="text-blue-500" />;
      case 'weekly': return <Clock size={20} className="text-green-500" />;
      case 'achievement': return <Star size={20} className="text-yellow-500" />;
      case 'goal': return <Target size={20} className="text-purple-500" />;
      case 'insight': return <TrendingUp size={20} className="text-indigo-500" />;
      case 'celebration': return <Heart size={20} className="text-red-500" />;
      default: return <Mic size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center space-x-3 mb-4"
        >
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Mic size={24} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Your Financial Story Podcast
          </h1>
        </motion.div>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          AI-generated episodes about your personal financial journey. 
          Hear your money story come to life with insights, achievements, and motivation.
        </p>
      </div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          { label: 'Total Episodes', value: state.libraryStats.totalEpisodes, icon: <Headphones size={20} />, color: 'text-blue-500' },
          { label: 'Listen Time', value: `${Math.round(state.libraryStats.totalListenTime / 60)}m`, icon: <Clock size={20} />, color: 'text-green-500' },
          { label: 'Completion Rate', value: `${state.libraryStats.completionRate}%`, icon: <TrendingUp size={20} />, color: 'text-purple-500' },
          { label: 'Favorites', value: state.libraryStats.favoriteEpisodes.length, icon: <Heart size={20} />, color: 'text-red-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className={`${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Latest Episode */}
      {state.episodes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-8 border border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-start space-x-6">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Mic size={32} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles size={16} className="text-purple-500" />
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Latest Episode
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {state.episodes[0].title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {state.episodes[0].description}
              </p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handlePlayEpisode(state.episodes[0].id)}
                  className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {state.currentEpisode?.id === state.episodes[0].id && state.currentEpisode?.isPlaying ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} />
                  )}
                  <span>
                    {state.currentEpisode?.id === state.episodes[0].id && state.currentEpisode?.isPlaying ? 'Pause' : 'Play'} Episode
                  </span>
                </button>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <Clock size={14} />
                  <span>{formatDuration(state.episodes[0].duration)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <Calendar size={14} />
                  <span>{formatDate(state.episodes[0].createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Generate New Episode */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Generate New Episode
          </h3>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frequency
                  </label>
                  <select
                    value={state.preferences.frequency}
                    onChange={(e) => updatePreferences({ frequency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="achievement">Only for achievements</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Episode Length
                  </label>
                  <select
                    value={state.preferences.episodeLength}
                    onChange={(e) => updatePreferences({ episodeLength: parseInt(e.target.value) as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Voice Type
                  </label>
                  <select
                    value={state.preferences.voiceType}
                    onChange={(e) => updatePreferences({ voiceType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="motivational">Motivational</option>
                    <option value="analytical">Analytical</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Episode Types */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { type: 'monthly', label: 'Monthly Story', icon: <Calendar size={20} />, color: 'from-blue-500 to-blue-600' },
            { type: 'weekly', label: 'Weekly Review', icon: <Clock size={20} />, color: 'from-green-500 to-green-600' },
            { type: 'achievement', label: 'Achievement', icon: <Star size={20} />, color: 'from-yellow-500 to-yellow-600' },
            { type: 'goal', label: 'Goal Update', icon: <Target size={20} />, color: 'from-purple-500 to-purple-600' },
            { type: 'insight', label: 'Insights', icon: <TrendingUp size={20} />, color: 'from-indigo-500 to-indigo-600' },
            { type: 'celebration', label: 'Celebration', icon: <Heart size={20} />, color: 'from-red-500 to-red-600' },
          ].map((episodeType) => (
            <button
              key={episodeType.type}
              onClick={() => handleGenerateEpisode(episodeType.type)}
              disabled={isGenerating}
              className={`flex flex-col items-center space-y-2 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all ${
                isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${episodeType.color} rounded-lg flex items-center justify-center`}>
                <div className="text-white">
                  {episodeType.icon}
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                {episodeType.label}
              </span>
            </button>
          ))}
        </div>

        {isGenerating && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-2 text-purple-600 dark:text-purple-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span>Generating your personal episode...</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Episode Library */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your Episode Library
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            All your personalized financial story episodes
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {state.episodes.map((episode, index) => (
            <motion.div
              key={episode.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getEpisodeIcon(episode.episodeType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {episode.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePlayEpisode(episode.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {state.currentEpisode?.id === episode.id && state.currentEpisode?.isPlaying ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => shareEpisode(episode.id, 'twitter')}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {episode.description}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Clock size={14} />
                      <span>{formatDuration(episode.duration)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>{formatDate(episode.createdAt)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Volume2 size={14} />
                      <span className="capitalize">{episode.voiceType}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {state.episodes.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic size={24} className="text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No episodes yet
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Generate your first personalized financial story episode to get started.
            </p>
            <button
              onClick={() => handleGenerateEpisode('monthly')}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Generate First Episode
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
} 