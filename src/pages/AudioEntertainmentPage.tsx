import React, { useState, useEffect } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { AudioDiscovery } from '../components/audio/AudioDiscovery';
import { useAudioTriggers } from '../components/audio/AudioTriggerSystem';
import { 
  Music, 
  Headphones, 
  Sparkles, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  Volume2,
  Target,
  BookOpen,
  Heart,
  TrendingUp,
  Zap,
  Star,
  Clock,
  Users
} from 'lucide-react';
export default function AudioEntertainmentPage() {
  const { state, playTrack, pauseTrack, resumeTrack, skipTrack, previousTrack, setVolume, connectSpotify } = useAudio();
  const { triggerExpenseUpload, triggerBudgetReview, triggerGoalAchievement } = useAudioTriggers();
  const [activeSection, setActiveSection] = useState<'overview' | 'discovery' | 'spotify' | 'demo'>('overview');

  // Demo tracks for testing
  const demoTracks = [
    {
      id: 'demo-1',
      title: 'Focus Flow',
      artist: 'Lo-Fi Beats',
      album: 'Productivity Vibes',
      duration: 180,
      source: 'internal' as const,
      albumArt: 'https://via.placeholder.com/300x300/6366f1/ffffff?text=🎯',
    },
    {
      id: 'demo-2',
      title: 'Budgeting Basics',
      artist: 'Frank\'s Financial Series',
      album: 'Personal Finance 101',
      duration: 900,
      source: 'podcast' as const,
      albumArt: 'https://via.placeholder.com/300x300/10b981/ffffff?text=📊',
    },
    {
      id: 'demo-3',
      title: 'Mindful Spending',
      artist: 'Wellness Audio',
      album: 'Financial Mindfulness',
      duration: 600,
      source: 'internal' as const,
      albumArt: 'https://via.placeholder.com/300x300/f59e0b/ffffff?text=🧘',
    },
  ];

  const handlePlayDemo = (track: any) => {
    playTrack(track);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div
          className="flex items-center justify-center space-x-3 mb-4"
        >
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Music size={24} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Audio Entertainment
          </h1>
        </div>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Experience the world's first FinTech Entertainment Platform. 
          Manage your money while enjoying curated music, podcasts, and AI-powered recommendations.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: <Sparkles size={16} /> },
            { id: 'discovery', label: 'Discovery', icon: <Headphones size={16} /> },
            { id: 'spotify', label: 'Spotify', icon: <TrendingUp size={16} /> },
            { id: 'demo', label: 'Demo', icon: <Play size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`
                flex items-center space-x-2 px-6 py-3 rounded-md text-sm font-medium transition-all
                ${activeSection === tab.id
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

      {/* Content Sections */}
      <AnimatePresence mode="wait">
        {activeSection === 'overview' && (
          <div
            key="overview"
            className="space-y-8"
          >
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <Target size={24} className="text-blue-500" />,
                  title: 'AI-Powered Focus',
                  description: 'Get intelligent music recommendations based on your current financial tasks.',
                  color: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20'
                },
                {
                  icon: <BookOpen size={24} className="text-green-500" />,
                  title: 'Educational Content',
                  description: 'Learn about personal finance through curated podcasts and expert insights.',
                  color: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20'
                },
                {
                  icon: <Heart size={24} className="text-purple-500" />,
                  title: 'Financial Wellness',
                  description: 'Reduce money stress with guided meditation and mindfulness content.',
                  color: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20'
                },
                {
                  icon: <TrendingUp size={24} className="text-yellow-500" />,
                  title: 'Spotify Integration',
                  description: 'Connect your Spotify account for seamless music streaming.',
                  color: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20'
                },
                {
                  icon: <Zap size={24} className="text-red-500" />,
                  title: 'Smart Triggers',
                  description: 'Automatic audio suggestions based on your financial activities.',
                  color: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20'
                },
                {
                  icon: <Star size={24} className="text-indigo-500" />,
                  title: 'Gamified Experience',
                  description: 'Earn XP and unlock content as you improve your financial health.',
                  color: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20'
                }
              ].map((feature, index) => (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${feature.color} rounded-xl p-6 border border-gray-200 dark:border-gray-700`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    {feature.icon}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-6 text-center">Platform Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Curated Tracks', value: '500+', icon: <Music size={20} /> },
                  { label: 'Podcast Episodes', value: '200+', icon: <Headphones size={20} /> },
                  { label: 'Active Users', value: '10K+', icon: <Users size={20} /> },
                  { label: 'Daily Plays', value: '50K+', icon: <Play size={20} /> }
                ].map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {stat.icon}
                    </div>
                    <div className="text-3xl font-bold mb-1">{stat.value}</div>
                    <div className="text-blue-100">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'discovery' && (
          <div
            key="discovery"
          >
            <AudioDiscovery />
          </div>
        )}

        {activeSection === 'spotify' && (
          <div
            key="spotify"
            className="text-center"
          >
            {!state.isSpotifyConnected ? (
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Connect Your Spotify Account
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Access your playlists, liked songs, and get personalized recommendations based on your music taste.
                </p>
                <button
                  onClick={connectSpotify}
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  Connect Spotify
                </button>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Spotify Connected!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your Spotify account is connected. You can now access your playlists and get personalized recommendations.
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <p className="text-green-800 dark:text-green-200 text-sm">
                    ✓ Playlists synced<br />
                    ✓ Liked songs available<br />
                    ✓ Personalized recommendations active
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'demo' && (
          <div
            key="demo"
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Try the Audio Experience
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Test the audio system with these demo tracks and trigger AI suggestions.
              </p>
            </div>

            {/* Demo Tracks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {demoTracks.map((track) => (
                <div
                  key={track.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <img
                    src={track.albumArt}
                    alt={track.title}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {track.title}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {track.artist}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                    {track.album} • {formatTime(track.duration)}
                  </p>
                  <button
                    onClick={() => handlePlayDemo(track)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors"
                  >
                    Play Track
                  </button>
                </div>
              ))}
            </div>

            {/* Trigger Demo Buttons */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Test AI Triggers
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Click these buttons to simulate different financial activities and see AI audio suggestions.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={triggerExpenseUpload}
                  className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  <Target size={16} />
                  <span>Upload Expenses</span>
                </button>
                <button
                  onClick={triggerBudgetReview}
                  className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  <BookOpen size={16} />
                  <span>Review Budget</span>
                </button>
                <button
                  onClick={triggerGoalAchievement}
                  className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  <Star size={16} />
                  <span>Achieve Goal</span>
                </button>
              </div>
            </div>
          </div>
        )}
      
    </div>
  );
} 
