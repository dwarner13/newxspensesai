import React, { useState, useEffect } from 'react';
import { UniversalAIController } from '../../services/UniversalAIController';

interface PodcastPreferences {
  preferred_podcasters: string[];
  episode_frequency: 'daily' | 'weekly' | 'monthly';
  auto_generate: boolean;
  notification_enabled: boolean;
  voice_preferences: Record<string, any>;
  content_preferences: Record<string, any>;
}

interface PodcastPreferencesProps {
  userId: string;
  aiController: UniversalAIController;
}

export function PodcastPreferences({ userId, aiController }: PodcastPreferencesProps) {
  const [preferences, setPreferences] = useState<PodcastPreferences>({
    preferred_podcasters: [],
    episode_frequency: 'weekly',
    auto_generate: true,
    notification_enabled: true,
    voice_preferences: {},
    content_preferences: {}
  });
  const [podcasters, setPodcasters] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
    loadPodcasters();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await aiController.getUserPodcastPreferences(userId);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPodcasters = () => {
    const podcasterData = aiController.getPodcasters();
    setPodcasters(podcasterData);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await aiController.updateUserPodcastPreferences(userId, preferences);
      // Show success message
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Show error message
    } finally {
      setSaving(false);
    }
  };

  const togglePodcaster = (podcasterId: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_podcasters: prev.preferred_podcasters.includes(podcasterId)
        ? prev.preferred_podcasters.filter(id => id !== podcasterId)
        : [...prev.preferred_podcasters, podcasterId]
    }));
  };

  const updatePreference = (key: keyof PodcastPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-400">Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Podcast Preferences</h2>
        <p className="text-gray-400">Customize your personalized podcast experience</p>
      </div>

      <div className="grid gap-8">
        {/* Preferred Podcasters */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Preferred Podcasters</h3>
          <p className="text-gray-400 text-sm mb-4">Select which AI podcasters you'd like to hear from most often</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(podcasters).map(([id, podcaster]) => (
              <label
                key={id}
                className="flex items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={preferences.preferred_podcasters.includes(id)}
                  onChange={() => togglePodcaster(id)}
                  className="mr-3 text-orange-500 focus:ring-orange-500"
                />
                <div>
                  <div className="text-white font-medium">{podcaster.name}</div>
                  <div className="text-gray-400 text-sm">{podcaster.specialty}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Episode Frequency */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Episode Frequency</h3>
          <p className="text-gray-400 text-sm mb-4">How often would you like new episodes generated?</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: 'daily', label: 'Daily', description: 'Fresh episodes every day' },
              { value: 'weekly', label: 'Weekly', description: 'New episodes each week' },
              { value: 'monthly', label: 'Monthly', description: 'Monthly deep dives' }
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
              >
                <input
                  type="radio"
                  name="frequency"
                  value={option.value}
                  checked={preferences.episode_frequency === option.value}
                  onChange={(e) => updatePreference('episode_frequency', e.target.value)}
                  className="mr-3 text-orange-500 focus:ring-orange-500"
                />
                <div>
                  <div className="text-white font-medium">{option.label}</div>
                  <div className="text-gray-400 text-sm">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Auto-Generation Settings */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Auto-Generation</h3>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div>
                <div className="text-white font-medium">Auto-generate episodes</div>
                <div className="text-gray-400 text-sm">Automatically create new episodes based on your frequency setting</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.auto_generate}
                onChange={(e) => updatePreference('auto_generate', e.target.checked)}
                className="text-orange-500 focus:ring-orange-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div>
                <div className="text-white font-medium">Episode notifications</div>
                <div className="text-gray-400 text-sm">Get notified when new episodes are ready</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.notification_enabled}
                onChange={(e) => updatePreference('notification_enabled', e.target.checked)}
                className="text-orange-500 focus:ring-orange-500"
              />
            </label>
          </div>
        </div>

        {/* Content Preferences */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Content Preferences</h3>
          <p className="text-gray-400 text-sm mb-4">Customize the type of content you want to hear about</p>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <span className="text-white">Include spending analysis</span>
              <input
                type="checkbox"
                defaultChecked
                className="text-orange-500 focus:ring-orange-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <span className="text-white">Include goal progress updates</span>
              <input
                type="checkbox"
                defaultChecked
                className="text-orange-500 focus:ring-orange-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <span className="text-white">Include financial predictions</span>
              <input
                type="checkbox"
                defaultChecked
                className="text-orange-500 focus:ring-orange-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <span className="text-white">Include motivational content</span>
              <input
                type="checkbox"
                defaultChecked
                className="text-orange-500 focus:ring-orange-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
        >
          {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
