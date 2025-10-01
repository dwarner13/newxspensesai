import React, { useState, useEffect } from 'react';
import { UniversalAIController } from '../services/UniversalAIController';
import { useAuth } from '../contexts/AuthContext';

// Components
import PodcastGenerationPanel from '../components/podcast/PodcastGenerationPanel';
import PodcastAnalyticsPanel from '../components/podcast/PodcastAnalyticsPanel';
import PodcastAudioPlayer from '../components/podcast/PodcastAudioPlayer';
import { EpisodeHistory } from '../components/podcast/EpisodeHistory';
import { PodcastPreferences } from '../components/podcast/PodcastPreferences';

const PodcastDashboard: React.FC = () => {
  const { user } = useAuth();
  const [aiController] = useState(new UniversalAIController());
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
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
      const [episodesData, preferencesData] = await Promise.all([
        aiController.getUserEpisodes(user.id, 50),
        aiController.getUserPodcastPreferences(user.id)
      ]);

      setEpisodes(episodesData);
      setPreferences(preferencesData);
      
      // Calculate basic analytics
      const totalEpisodes = episodesData.length;
      const totalListens = episodesData.reduce((sum: number, ep: any) => sum + (ep.listen_count || 0), 0);
      const averageRating = episodesData.length > 0 
        ? episodesData.reduce((sum: number, ep: any) => sum + (ep.rating || 0), 0) / episodesData.length 
        : 0;
      
      setAnalytics({
        total_episodes: totalEpisodes,
        total_listens: totalListens,
        average_rating: averageRating,
        average_completion_rate: 0.85 // Mock data});
    } catch (error) {
      console.error('Error loading podcast data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePodcast = async (podcasterId: string, timeframe: string = '7days') => {
    if (!user || isGenerating) return;
    
    try {
      setIsGenerating(true);
      const result = await aiController.generatePodcastEpisode(user.id, podcasterId, timeframe);
      
      // Refresh episodes list
      await loadPodcastData();
      
      // Show success message
      console.log('Podcast generation completed:', result);
    } catch (error) {
      console.error('Error generating podcast:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEpisodeSelect = (episode: any) => {
    setSelectedEpisode(episode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-white/10 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-white/10 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">🎙️ Personal Podcast</h1>
              <p className="text-white/70 mt-1">
                Your AI employees create personalized financial podcasts just for you
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-400">
                  {analytics?.total_episodes || 0}
                </div>
                <div className="text-sm text-white/60">Total Episodes</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">
                  {Math.round((analytics?.average_completion_rate || 0) * 100)}%
                </div>
                <div className="text-sm text-white/60">Avg. Completion</div>
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
          <EpisodeHistory userId={user?.id || ''} aiController={aiController} />
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
          <PodcastPreferences userId={user?.id || ''} aiController={aiController} />
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
