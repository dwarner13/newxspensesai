import React from 'react';
import { PodcastAnalytics } from '../../types/podcast.types';

interface PodcastAnalyticsPanelProps {
  analytics: PodcastAnalytics | null;
}

const PodcastAnalyticsPanel: React.FC<PodcastAnalyticsPanelProps> = ({
  analytics
}) => {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getAIEmployeeIcons = (employees: string[]) => {
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

    return employees.map(employee => ({
      name: employee,
      icon: employeeIcons[employee] || '👤'
    }));
  };

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Loading analytics...
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Podcast Analytics</h2>
        <p className="text-gray-600">
          Insights into your listening habits and AI employee performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <span className="text-2xl">🎙️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Episodes</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.total_episodes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">⏱️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Listening Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(analytics.total_listening_time)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(analytics.average_completion_rate * 100)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">⭐</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Favorite Type</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.favorite_episode_types[0] || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Favorite Episode Types */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Favorite Episode Types</h3>
        {analytics.favorite_episode_types.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.favorite_episode_types.map((type, index) => (
              <div key={type} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl">
                  {type === 'weekly' && '📅'}
                  {type === 'monthly' && '📊'}
                  {type === 'goals' && '🎯'}
                  {type === 'automation' && '⚡'}
                  {type === 'business' && '💼'}
                  {type === 'personal' && '👤'}
                </div>
                <div>
                  <div className="font-medium text-gray-900 capitalize">{type}</div>
                  <div className="text-sm text-gray-600">#{index + 1} favorite</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>No episode type preferences yet</p>
          </div>
        )}
      </div>

      {/* AI Employee Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">AI Employee Performance</h3>
        {Object.keys(analytics.ai_employee_performance).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(analytics.ai_employee_performance)
              .sort(([,a], [,b]) => b.episodes_contributed - a.episodes_contributed)
              .map(([employee, performance]) => (
                <div key={employee} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {getAIEmployeeIcons([employee])[0].icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{employee}</div>
                      <div className="text-sm text-gray-600">
                        {performance.episodes_contributed} episodes contributed
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {performance.average_rating > 0 ? `${performance.average_rating.toFixed(1)}/5` : 'No ratings'}
                    </div>
                    <div className="text-sm text-gray-600">Average rating</div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🤖</div>
            <p>No AI employee performance data yet</p>
          </div>
        )}
      </div>

      {/* Listening Trends */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Listening Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-2">Daily</div>
            <div className="text-sm text-gray-600">
              {analytics.listening_trends.daily.length > 0 ? (
                <div className="space-y-1">
                  {analytics.listening_trends.daily.slice(-7).map((value, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Day {index + 1}</span>
                      <span className="text-xs font-medium">{value} min</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No daily data available</p>
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">Weekly</div>
            <div className="text-sm text-gray-600">
              {analytics.listening_trends.weekly.length > 0 ? (
                <div className="space-y-1">
                  {analytics.listening_trends.weekly.slice(-4).map((value, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Week {index + 1}</span>
                      <span className="text-xs font-medium">{value} min</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No weekly data available</p>
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">Monthly</div>
            <div className="text-sm text-gray-600">
              {analytics.listening_trends.monthly.length > 0 ? (
                <div className="space-y-1">
                  {analytics.listening_trends.monthly.slice(-6).map((value, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Month {index + 1}</span>
                      <span className="text-xs font-medium">{value} min</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No monthly data available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-4">💡 Insights</h3>
        <div className="space-y-3 text-blue-800">
          {analytics.total_episodes === 0 && (
            <p>🎙️ <strong>Get started:</strong> Generate your first episode to begin tracking your listening habits!</p>
          )}
          
          {analytics.total_episodes > 0 && analytics.average_completion_rate < 0.5 && (
            <p>📈 <strong>Improvement opportunity:</strong> Your completion rate is below 50%. Try shorter episodes or different content types.</p>
          )}
          
          {analytics.average_completion_rate > 0.8 && (
            <p>🎉 <strong>Great engagement:</strong> You're completing over 80% of episodes! Keep up the excellent listening habits.</p>
          )}
          
          {analytics.favorite_episode_types.includes('goals') && (
            <p>🎯 <strong>Goal-focused:</strong> You love goal-related episodes! Your AI employees will focus more on goal progress.</p>
          )}
          
          {analytics.favorite_episode_types.includes('automation') && (
            <p>⚡ <strong>Automation enthusiast:</strong> You're interested in efficiency! Expect more automation-focused content.</p>
          )}
          
          {analytics.total_listening_time > 3600 && (
            <p>⏱️ <strong>Dedicated listener:</strong> You've listened for over an hour! Your AI employees appreciate your engagement.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PodcastAnalyticsPanel;
