import React, { useState, useEffect } from 'react';
import { UniversalAIController } from '../../services/UniversalAIController';

interface Episode {
  id: string;
  title: string;
  description: string;
  podcaster_id: string;
  episode_number: number;
  created_at: string;
  rating?: number;
  listen_count: number;
  status: string;
}

interface EpisodeHistoryProps {
  userId: string;
  aiController: UniversalAIController;
}

export function EpisodeHistory({ userId, aiController }: EpisodeHistoryProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPodcaster, setSelectedPodcaster] = useState<string>('all');
  const [podcasters, setPodcasters] = useState<Record<string, any>>({});

  useEffect(() => {
    loadEpisodes();
    loadPodcasters();
  }, [userId, selectedPodcaster]);

  const loadEpisodes = async () => {
    try {
      setLoading(true);
      let episodesData;
      
      if (selectedPodcaster === 'all') {
        episodesData = await aiController.getUserEpisodes(userId, 50);
      } else {
        episodesData = await aiController.getEpisodesByPodcaster(userId, selectedPodcaster, 50);
      }
      
      setEpisodes(episodesData);
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPodcasters = () => {
    const podcasterData = aiController.getPodcasters();
    setPodcasters(podcasterData);
  };

  const handleRating = async (episodeId: string, rating: number) => {
    try {
      await aiController.rateEpisode(episodeId, rating);
      // Reload episodes to show updated rating
      loadEpisodes();
    } catch (error) {
      console.error('Error rating episode:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPodcasterName = (podcasterId: string) => {
    return podcasters[podcasterId]?.name || podcasterId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'processing': return 'text-yellow-500';
      case 'failed': return 'text-red-500';
      default: return 'text-blue-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-400">Loading episodes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Episode History</h2>
          <p className="text-gray-400">Your personalized financial podcast episodes</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedPodcaster}
            onChange={(e) => setSelectedPodcaster(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Podcasters</option>
            {Object.entries(podcasters).map(([id, podcaster]) => (
              <option key={id} value={id}>{podcaster.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Episodes List */}
      {episodes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No episodes yet</div>
          <p className="text-gray-500">Generate your first personalized podcast episode!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {episodes.map((episode) => (
            <div
              key={episode.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors"
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{episode.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(episode.status)}`}>
                      {episode.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                    <span>Episode #{episode.episode_number}</span>
                    <span>•</span>
                    <span>{getPodcasterName(episode.podcaster_id)}</span>
                    <span>•</span>
                    <span>{formatDate(episode.created_at)}</span>
                    <span>•</span>
                    <span>{episode.listen_count} listens</span>
                  </div>
                  
                  {episode.description && (
                    <p className="text-gray-300 text-sm line-clamp-2">{episode.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRating(episode.id, star)}
                        className={`text-lg ${
                          episode.rating && star <= episode.rating
                            ? 'text-yellow-400'
                            : 'text-gray-600 hover:text-yellow-400'
                        } transition-colors`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  {/* Play Button */}
                  <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors">
                    Play
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {episodes.length >= 50 && (
        <div className="text-center">
          <button className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors">
            Load More Episodes
          </button>
        </div>
      )}
    </div>
  );
}
