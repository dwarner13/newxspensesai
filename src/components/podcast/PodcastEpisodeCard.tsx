import React from 'react';
import { PodcastEpisode } from '../../types/podcast.types';

interface PodcastEpisodeCardProps {
  episode: PodcastEpisode;
  onSelect: (episode: PodcastEpisode) => void;
  onDelete: (episodeId: string) => void;
}

const PodcastEpisodeCard: React.FC<PodcastEpisodeCardProps> = ({
  episode,
  onSelect,
  onDelete
}) => {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getEpisodeTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      weekly: '📅',
      monthly: '📊',
      goals: '🎯',
      automation: '⚡',
      business: '💼',
      personal: '👤'
    };
    return icons[type] || '🎙️';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      generating: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getAIEmployeeAvatars = (employees: string[]) => {
    const employeeIcons: Record<string, string> = {
      'Prime': '👑',
      'Goalie': '🥅',
      'Crystal': '🔮',
      'Blitz': '⚡',
      'Tag': '🏷️',
      'Byte': '💾',
      'Intelia': '🧠',
      'Liberty': '🕊️',
      'Automa': '🤖',
      'Custodian': '🛡️'
    };

    return employees.slice(0, 3).map(employee => employeeIcons[employee] || '👤');
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getEpisodeTypeIcon(episode.episode_type)}</span>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                {episode.title}
              </h3>
              <p className="text-sm text-gray-500">
                {formatDate(episode.generated_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(episode.generation_status)}`}>
              {episode.generation_status}
            </span>
            {episode.rating && (
              <div className="flex items-center space-x-1">
                <span className="text-yellow-400">⭐</span>
                <span className="text-sm text-gray-600">{episode.rating}/5</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {episode.description && (
          <p className="text-gray-600 text-sm line-clamp-2 mb-4">
            {episode.description}
          </p>
        )}

        {/* AI Employees */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500 mr-2">AI Team:</span>
            {getAIEmployeeAvatars(episode.ai_employees_used).map((icon, index) => (
              <span key={index} className="text-lg" title={episode.ai_employees_used[index]}>
                {icon}
              </span>
            ))}
            {episode.ai_employees_used.length > 3 && (
              <span className="text-xs text-gray-400 ml-1">
                +{episode.ai_employees_used.length - 3}
              </span>
            )}
          </div>
          {episode.duration_seconds && (
            <span className="text-sm text-gray-500">
              {formatDuration(episode.duration_seconds)}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSelect(episode)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              {episode.audio_url ? 'Listen' : 'View Script'}
            </button>
            {episode.generation_status === 'completed' && (
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {episode.generation_status === 'completed' && (
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </button>
            )}
            <button
              onClick={() => onDelete(episode.id)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastEpisodeCard;
