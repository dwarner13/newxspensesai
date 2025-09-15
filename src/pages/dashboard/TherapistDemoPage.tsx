import React from 'react';
import { Heart, Bell, AlertTriangle, TrendingUp, Clock, Zap } from 'lucide-react';
import { simulateTherapistTrigger, resetTherapistTriggers, setTherapistTriggerFunction } from '../../utils/therapistTriggers';
import { useSetAtom } from 'jotai';
import { therapistTriggerAtom } from '../../lib/uiStore';
import TherapistNotification from '../../components/therapist/TherapistNotification';
import TherapistModal from '../../components/therapist/TherapistModal';

const TherapistDemoPage: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const setTherapistTrigger = useSetAtom(therapistTriggerAtom);

  // Initialize the therapist trigger function
  React.useEffect(() => {
    setTherapistTriggerFunction(setTherapistTrigger);
  }, [setTherapistTrigger]);

  const triggerScenarios = [
    {
      title: "Category Repeated Edit",
      description: "User edits the same category multiple times",
      icon: <AlertTriangle className="w-5 h-5" />,
      action: () => simulateTherapistTrigger('category_repeated_edit')
    },
    {
      title: "Spending Spike",
      description: "Significant increase in category spending",
      icon: <TrendingUp className="w-5 h-5" />,
      action: () => simulateTherapistTrigger('spending_spike')
    },
    {
      title: "Time-Based Avoidance",
      description: "User hasn't visited dashboard in days",
      icon: <Clock className="w-5 h-5" />,
      action: () => simulateTherapistTrigger('time_based')
    },
    {
      title: "Mood-Based Stress",
      description: "Detected stress indicators in user behavior",
      icon: <Heart className="w-5 h-5" />,
      action: () => simulateTherapistTrigger('mood_based')
    },
    {
      title: "Guilt Patterns",
      description: "User shows signs of financial guilt",
      icon: <Bell className="w-5 h-5" />,
      action: () => simulateTherapistTrigger('guilt_pattern')
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 mt-6 md:mt-8">
      {/* Content Area with Enhanced Styling */}
      <div className="space-y-8">
        
        {/* Status Bar */}
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-4 border border-purple-200/30 mb-8">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-6">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Therapist System Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 text-blue-400">
                <Heart className="w-4 h-4" />
              </div>
              <span className="text-sm">Emotional Support Ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 text-blue-400">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-sm">Context-Aware</span>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          
          {/* Trigger Scenarios */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Trigger Scenarios</h2>
            <p className="text-gray-300 mb-6">
              Click any scenario below to simulate a therapist notification trigger. 
              The notification will appear in the bottom-right corner.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {triggerScenarios.map((scenario, index) => (
                <button
                  key={index}
                  onClick={scenario.action}
                  className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 border border-purple-200/30 rounded-xl p-4 text-left transition-all duration-200 transform hover:scale-105"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      {scenario.icon}
                    </div>
                    <h3 className="font-semibold text-white">{scenario.title}</h3>
                  </div>
                  <p className="text-gray-300 text-sm">{scenario.description}</p>
                </button>
              ))}
            </div>
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={resetTherapistTriggers}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105"
              >
                Reset All Triggers
              </button>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">🎯 Smart Detection</h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Monitors user behavior patterns</li>
                  <li>• Detects emotional indicators</li>
                  <li>• Tracks spending anomalies</li>
                  <li>• Identifies avoidance patterns</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">💬 Context-Aware Responses</h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Personalized therapist messages</li>
                  <li>• Empathetic tone matching</li>
                  <li>• Behavioral pattern recognition</li>
                  <li>• Proactive emotional support</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Integration Points */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Integration Points</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl p-4 border border-blue-200/30">
                <h4 className="font-semibold text-white mb-2">Category Management</h4>
                <p className="text-gray-300 text-sm">Triggers when users repeatedly edit categories, indicating uncertainty or guilt.</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-xl p-4 border border-green-200/30">
                <h4 className="font-semibold text-white mb-2">Spending Analysis</h4>
                <p className="text-gray-300 text-sm">Detects spending spikes and unusual patterns that may cause stress.</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-4 border border-purple-200/30">
                <h4 className="font-semibold text-white mb-2">Behavioral Tracking</h4>
                <p className="text-gray-300 text-sm">Monitors user engagement patterns and identifies avoidance behaviors.</p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Benefits</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">For Users</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Proactive emotional support</li>
                  <li>• Reduces financial stress</li>
                  <li>• Builds healthy money habits</li>
                  <li>• Feels like a real therapist</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">For Your App</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Unique competitive advantage</li>
                  <li>• Increases user engagement</li>
                  <li>• Reduces user churn</li>
                  <li>• Differentiates from competitors</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Components */}
      <TherapistNotification />
      <TherapistModal />
    </div>
  );
};

export default TherapistDemoPage; 