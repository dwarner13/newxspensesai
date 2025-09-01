import React, { useState } from 'react';
import { PodcastPreferences } from '../../types/podcast.types';

interface PodcastPreferencesPanelProps {
  preferences: PodcastPreferences | null;
  onUpdate: (preferences: Partial<PodcastPreferences>) => void;
}

const PodcastPreferencesPanel: React.FC<PodcastPreferencesPanelProps> = ({
  preferences,
  onUpdate
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (updates: Partial<PodcastPreferences>) => {
    setIsSaving(true);
    try {
      await onUpdate(updates);
    } finally {
      setIsSaving(false);
    }
  };

  const aiEmployees = [
    { id: 'Prime', name: 'Prime', icon: '👑', description: 'Strategic financial advisor' },
    { id: 'Goalie', name: 'Goalie', icon: '🥅', description: 'Motivational goal coach' },
    { id: 'Crystal', name: 'Crystal', icon: '🔮', description: 'Mysterious predictor' },
    { id: 'Blitz', name: 'Blitz', icon: '⚡', description: 'Efficiency expert' },
    { id: 'Tag', name: 'Tag', icon: '🏷️', description: 'Organization specialist' },
    { id: 'Byte', name: 'Byte', icon: '💾', description: 'Technical wizard' },
    { id: 'Intelia', name: 'Intelia', icon: '🧠', description: 'Business intelligence' },
    { id: 'Liberty', name: 'Liberty', icon: '🕊️', description: 'Financial freedom fighter' },
    { id: 'Automa', name: 'Automa', icon: '🤖', description: 'Process automation' },
    { id: 'Custodian', name: 'Custodian', icon: '🛡️', description: 'Security guardian' }
  ];

  const newPodcasters = [
    { id: 'Cheer', name: 'Cheer', icon: '🎉', description: 'Ultra-positive cheerleader', style: 'positive' },
    { id: 'Roast', name: 'Roast', icon: '🔥', description: 'Sassy financial critic', style: 'roasting' },
    { id: 'Zen', name: 'Zen', icon: '🧘', description: 'Calm and mindful guide', style: 'balanced' },
    { id: 'Comedy', name: 'Comedy', icon: '🎭', description: 'Stand-up comedian', style: 'comedy' },
    { id: 'Drill', name: 'Drill', icon: '💪', description: 'Tough military sergeant', style: 'strict' }
  ];

  const contentFocusOptions = [
    { id: 'goals', name: 'Goals', icon: '🎯' },
    { id: 'automation', name: 'Automation', icon: '⚡' },
    { id: 'business', name: 'Business', icon: '💼' },
    { id: 'personal', name: 'Personal', icon: '👤' },
    { id: 'spending', name: 'Spending', icon: '💰' }
  ];

  const voiceStyles = [
    { id: 'casual', name: 'Casual', description: 'Relaxed and friendly' },
    { id: 'professional', name: 'Professional', description: 'Formal and authoritative' },
    { id: 'energetic', name: 'Energetic', description: 'Exciting and motivating' },
    { id: 'calm', name: 'Calm', description: 'Peaceful and soothing' }
  ];

  const episodeLengths = [
    { id: 'short', name: 'Short', description: '5-7 minutes' },
    { id: 'medium', name: 'Medium', description: '8-12 minutes' },
    { id: 'long', name: 'Long', description: '13-20 minutes' }
  ];

  const frequencies = [
    { id: 'daily', name: 'Daily', description: 'Every day' },
    { id: 'weekly', name: 'Weekly', description: 'Every week' },
    { id: 'monthly', name: 'Monthly', description: 'Every month' },
    { id: 'on_demand', name: 'On Demand', description: 'When you request' }
  ];

  if (!preferences) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚙️</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Loading preferences...
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Podcast Preferences</h2>
        <p className="text-gray-600">
          Customize how your AI employees create personalized podcasts for you
        </p>
      </div>

      {/* Voice Style */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Voice Style</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {voiceStyles.map((style) => (
            <div
              key={style.id}
              onClick={() => handleSave({ voice_style: style.id as any })}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                preferences.voice_style === style.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{style.name}</div>
              <div className="text-sm text-gray-600">{style.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Podcaster Style */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Podcaster Style</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose your preferred podcasting personality - from ultra-positive to sassy roasting!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {newPodcasters.map((podcaster) => (
            <div
              key={podcaster.id}
              onClick={() => handleSave({ 
                podcaster_style: podcaster.style as any,
                preferred_podcasters: [podcaster.id]
              })}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                preferences.podcaster_style === podcaster.style
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">{podcaster.icon}</span>
                <div className="font-medium text-gray-900">{podcaster.name}</div>
              </div>
              <div className="text-sm text-gray-600">{podcaster.description}</div>
              {preferences.podcaster_style === podcaster.style && (
                <div className="mt-2 text-xs text-orange-600 font-medium">✓ Selected</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Episode Length */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Episode Length</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {episodeLengths.map((length) => (
            <div
              key={length.id}
              onClick={() => handleSave({ episode_length_preference: length.id as any })}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                preferences.episode_length_preference === length.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{length.name}</div>
              <div className="text-sm text-gray-600">{length.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Frequency */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Generation Frequency</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {frequencies.map((freq) => (
            <div
              key={freq.id}
              onClick={() => handleSave({ frequency: freq.id as any })}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                preferences.frequency === freq.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{freq.name}</div>
              <div className="text-sm text-gray-600">{freq.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Focus */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Content Focus</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose which topics your AI employees should focus on in your podcasts
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {contentFocusOptions.map((focus) => (
            <label
              key={focus.id}
              className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={preferences.content_focus.includes(focus.id)}
                onChange={(e) => {
                  const newFocus = e.target.checked
                    ? [...preferences.content_focus, focus.id]
                    : preferences.content_focus.filter(f => f !== focus.id);
                  handleSave({ content_focus: newFocus });
                }}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div className="flex items-center space-x-2">
                <span className="text-lg">{focus.icon}</span>
                <span className="font-medium text-gray-900">{focus.name}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Favorite AI Employees */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Favorite AI Employees</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select which AI employees you'd like to hear from most often
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {aiEmployees.map((employee) => (
            <label
              key={employee.id}
              className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={preferences.favorite_ai_employees.includes(employee.id)}
                onChange={(e) => {
                  const newFavorites = e.target.checked
                    ? [...preferences.favorite_ai_employees, employee.id]
                    : preferences.favorite_ai_employees.filter(f => f !== employee.id);
                  handleSave({ favorite_ai_employees: newFavorites });
                }}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{employee.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{employee.name}</div>
                  <div className="text-sm text-gray-600">{employee.description}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Privacy Settings</h3>
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.include_personal_data}
              onChange={(e) => handleSave({ include_personal_data: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Include Personal Data</div>
              <div className="text-sm text-gray-600">Use your name and personal details in episodes</div>
            </div>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.include_amounts}
              onChange={(e) => handleSave({ include_amounts: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Include Amounts</div>
              <div className="text-sm text-gray-600">Mention specific dollar amounts in episodes</div>
            </div>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.include_predictions}
              onChange={(e) => handleSave({ include_predictions: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Include Predictions</div>
              <div className="text-sm text-gray-600">Include future predictions and forecasts</div>
            </div>
          </label>
        </div>
      </div>

      {/* Automation Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Automation Settings</h3>
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.auto_generate}
              onChange={(e) => handleSave({ auto_generate: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Auto-Generate Episodes</div>
              <div className="text-sm text-gray-600">Automatically create episodes based on your frequency setting</div>
            </div>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={preferences.notification_enabled}
              onChange={(e) => handleSave({ notification_enabled: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-gray-900">Episode Notifications</div>
              <div className="text-sm text-gray-600">Get notified when new episodes are ready</div>
            </div>
          </label>
        </div>
      </div>

      {/* Save Status */}
      {isSaving && (
        <div className="flex items-center justify-center space-x-2 text-indigo-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
          <span>Saving preferences...</span>
        </div>
      )}
    </div>
  );
};

export default PodcastPreferencesPanel;
