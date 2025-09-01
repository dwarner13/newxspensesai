import React, { useState } from 'react';
import { PodcastPreferences } from '../../types/podcast.types';

interface PodcastGenerationPanelProps {
  onGenerate: (episodeType: string) => void;
  isGenerating: boolean;
  preferences: PodcastPreferences | null;
}

const PodcastGenerationPanel: React.FC<PodcastGenerationPanelProps> = ({
  onGenerate,
  isGenerating,
  preferences
}) => {
  const [selectedType, setSelectedType] = useState<string>('weekly');

  const episodeTypes = [
    {
      id: 'weekly',
      name: 'Weekly Summary',
      icon: '📅',
      description: 'Your weekly financial overview with spending analysis and goal updates',
      duration: '5-7 minutes',
      aiEmployees: ['Prime', 'Goalie', 'Crystal', 'Blitz'],
      color: 'bg-blue-500'
    },
    {
      id: 'monthly',
      name: 'Monthly Deep Dive',
      icon: '📊',
      description: 'Comprehensive monthly analysis with business insights and predictions',
      duration: '12-15 minutes',
      aiEmployees: ['Prime', 'Intelia', 'Custodian', 'Liberty'],
      color: 'bg-purple-500'
    },
    {
      id: 'goals',
      name: 'Goal Progress',
      icon: '🎯',
      description: 'Focused episode on your financial goals and achievements',
      duration: '8-10 minutes',
      aiEmployees: ['Goalie', 'Liberty', 'Prime'],
      color: 'bg-green-500'
    },
    {
      id: 'automation',
      name: 'Automation Success',
      icon: '⚡',
      description: 'Celebrating automation wins and efficiency gains',
      duration: '6-8 minutes',
      aiEmployees: ['Blitz', 'Automa', 'Tag'],
      color: 'bg-yellow-500'
    }
  ];

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
      'Custodian': '🛡️',
      'Cheer': '🎉',
      'Roast': '🔥',
      'Zen': '🧘',
      'Comedy': '🎭',
      'Drill': '💪'
    };

    return employees.map(employee => ({
      name: employee,
      icon: employeeIcons[employee] || '👤'
    }));
  };

  const handleGenerate = () => {
    if (!isGenerating) {
      onGenerate(selectedType);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate New Episode</h2>
        <p className="text-gray-600">
          Choose an episode type and let your AI employees create a personalized podcast for you
        </p>
      </div>

      {/* Episode Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {episodeTypes.map((type) => (
          <div
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
              selectedType === type.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {/* Selection Indicator */}
            {selectedType === type.id && (
              <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* Content */}
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 ${type.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                {type.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{type.name}</h3>
                <p className="text-gray-600 text-sm mb-3">{type.description}</p>
                
                {/* Duration */}
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <span>⏱️ {type.duration}</span>
                </div>

                {/* AI Employees */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">AI Team:</span>
                  {getAIEmployeeIcons(type.aiEmployees).map((employee, index) => (
                    <span
                      key={index}
                      className="text-lg"
                      title={employee.name}
                    >
                      {employee.icon}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Generation Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Generation Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Voice Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice Style
            </label>
            <div className="text-sm text-gray-600">
              {preferences?.voice_style || 'professional'} 
              <span className="ml-2 text-gray-400">
                (set in preferences)
              </span>
            </div>
          </div>

          {/* Episode Length */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Episode Length
            </label>
            <div className="text-sm text-gray-600">
              {preferences?.episode_length_preference || 'medium'} 
              <span className="ml-2 text-gray-400">
                (set in preferences)
              </span>
            </div>
          </div>

          {/* Content Focus */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Focus
            </label>
            <div className="flex flex-wrap gap-1">
              {(preferences?.content_focus || ['goals', 'automation']).map((focus, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                >
                  {focus}
                </span>
              ))}
            </div>
          </div>

          {/* Favorite AI Employees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Favorite AI Employees
            </label>
            <div className="flex items-center space-x-1">
              {(preferences?.favorite_ai_employees || ['Prime', 'Goalie']).map((employee, index) => (
                <span
                  key={index}
                  className="text-lg"
                  title={employee}
                >
                  {getAIEmployeeIcons([employee])[0].icon}
                </span>
              ))}
            </div>
          </div>

          {/* Podcaster Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Podcaster Style
            </label>
            <div className="flex items-center space-x-2">
              {preferences?.podcaster_style && (
                <>
                  <span className="text-lg">
                    {(() => {
                      const styleIcons: Record<string, string> = {
                        'positive': '🎉',
                        'roasting': '🔥',
                        'balanced': '🧘',
                        'comedy': '🎭',
                        'strict': '💪'
                      };
                      return styleIcons[preferences.podcaster_style] || '🎙️';
                    })()}
                  </span>
                  <span className="text-sm text-gray-600 capitalize">
                    {preferences.podcaster_style}
                  </span>
                </>
              )}
              {preferences?.preferred_podcasters && preferences.preferred_podcasters.length > 0 && (
                <span className="text-sm text-gray-500">
                  ({preferences.preferred_podcasters.join(', ')})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {isGenerating ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              <span>Generating your podcast...</span>
            </div>
          ) : (
            <span>Click generate to create your personalized episode</span>
          )}
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`px-8 py-3 rounded-lg font-medium transition-colors ${
            isGenerating
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isGenerating ? 'Generating...' : 'Generate Episode'}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-500 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-blue-900">How it works</h4>
            <p className="text-blue-700 text-sm mt-1">
              Your AI employees will analyze your financial data, create a personalized script, 
              and generate audio with their unique voices. The process typically takes 2-3 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastGenerationPanel;
