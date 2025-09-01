import React, { useState, useEffect } from 'react';
import {
  getPodcastEpisodes,
  getPodcastAnalytics,
  getPodcastPreferences,
  createOrUpdatePodcastPreferences,
  getDefaultPodcastPreferences
} from '../lib/podcast';
import { 
  generateWeeklyPodcast, 
  generateMonthlyPodcast, 
  generateGoalProgressPodcast, 
  generateAutomationPodcast 
} from '../lib/podcastGenerator';
import { PodcastEpisode, PodcastAnalytics, PodcastPreferences } from '../types/podcast.types';
import { useAuth } from '../contexts/AuthContext';

// Components
import PodcastEpisodeCard from '../components/podcast/PodcastEpisodeCard';
import PodcastGenerationPanel from '../components/podcast/PodcastGenerationPanel';
import PodcastPreferencesPanel from '../components/podcast/PodcastPreferencesPanel';
import PodcastAnalyticsPanel from '../components/podcast/PodcastAnalyticsPanel';
import PodcastAudioPlayer from '../components/podcast/PodcastAudioPlayer';

const PodcastDashboard: React.FC = () => {
  const { user } = useAuth();
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [analytics, setAnalytics] = useState<PodcastAnalytics | null>(null);
  const [preferences, setPreferences] = useState<PodcastPreferences | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'episodes' | 'generate' | 'preferences' | 'analytics'>('episodes');

  useEffect(() => {
    if (user) {
      loadPodcastData();
    }
  }, [user]);

    const loadPodcastData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [episodesData, analyticsData, preferencesData] = await Promise.all([
        getPodcastEpisodes(user.id),
        getPodcastAnalytics(user.id),
        getPodcastPreferences(user.id)
      ]);

      setEpisodes(episodesData);
      setAnalytics(analyticsData);
      
      // Create default preferences if none exist
      if (!preferencesData) {
        const defaultPrefs = getDefaultPodcastPreferences(user.id);
        const createdPrefs = await createOrUpdatePodcastPreferences(defaultPrefs);
        setPreferences(createdPrefs);
      } else {
        setPreferences(preferencesData);
      }
    } catch (error) {
      console.error('Error loading podcast data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePodcast = async (episodeType: string) => {
    if (!user || isGenerating) return;
    
    try {
      setIsGenerating(true);
      let result;
      
      switch (episodeType) {
        case 'weekly':
          result = await generateWeeklyPodcast(user.id);
          break;
        case 'monthly':
          result = await generateMonthlyPodcast(user.id);
          break;
        case 'goals':
          result = await generateGoalProgressPodcast(user.id);
          break;
        case 'automation':
          result = await generateAutomationPodcast(user.id);
          break;
        default:
          throw new Error('Invalid episode type');
      }
      
      // Refresh episodes list
      await loadPodcastData();
      
      // Show success message
      console.log('Podcast generation started:', result);
    } catch (error) {
      console.error('Error generating podcast:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreferencesUpdate = async (updatedPreferences: Partial<PodcastPreferences>) => {
    if (!user || !preferences) return;
    
    try {
      const updated = await createOrUpdatePodcastPreferences({
        ...preferences,
        ...updatedPreferences
      });
      setPreferences(updated);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const handleEpisodeSelect = (episode: PodcastEpisode) => {
    setSelectedEpisode(episode);
  };

  const handleEpisodeDelete = async (episodeId: string) => {
    // TODO: Implement episode deletion
    console.log('Delete episode:', episodeId);
    await loadPodcastData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎙️ Personal Podcast</h1>
              <p className="text-gray-600 mt-1">
                Your AI employees create personalized financial podcasts just for you
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-600">
                  {analytics?.total_episodes || 0}
                </div>
                <div className="text-sm text-gray-500">Total Episodes</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((analytics?.average_completion_rate || 0) * 100)}%
                </div>
                <div className="text-sm text-gray-500">Avg. Completion</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'episodes', label: 'Episodes', icon: '🎙️' },
              { id: 'generate', label: 'Generate', icon: '⚡' },
              { id: 'preferences', label: 'Preferences', icon: '⚙️' },
              { id: 'analytics', label: 'Analytics', icon: '📊' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Episodes Tab */}
        {activeTab === 'episodes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Your Episodes</h2>
              <button
                onClick={() => setActiveTab('generate')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Generate New Episode
              </button>
            </div>
            
            {episodes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎙️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No episodes yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Generate your first personalized financial podcast to get started!
                </p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Generate Your First Episode
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {episodes.map((episode) => (
                  <PodcastEpisodeCard
                    key={episode.id}
                    episode={episode}
                    onSelect={handleEpisodeSelect}
                    onDelete={handleEpisodeDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <PodcastGenerationPanel
            onGenerate={handleGeneratePodcast}
            isGenerating={isGenerating}
            preferences={preferences}
          />
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <PodcastPreferencesPanel
            preferences={preferences}
            onUpdate={handlePreferencesUpdate}
          />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <PodcastAnalyticsPanel analytics={analytics} />
        )}
      </div>

      {/* Audio Player */}
      {selectedEpisode && (
        <PodcastAudioPlayer
          episode={selectedEpisode}
          onClose={() => setSelectedEpisode(null)}
        />
      )}
    </div>
  );
};

export default PodcastDashboard;
