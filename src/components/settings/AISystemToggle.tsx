// AI System Toggle - Switch between Legacy and Prime AI systems
import React, { useState, useEffect } from 'react';
import { Crown, Bot, Sparkles, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AILearningService from '../../services/AILearningService';

interface AISystemToggleProps {
  className?: string;
}

const AISystemToggle: React.FC<AISystemToggleProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [isPrimeEnabled, setIsPrimeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  
  const learningService = new AILearningService();

  // Load user's AI system preference
  useEffect(() => {
    const loadUserPreference = async () => {
      if (!user) return;
      
      try {
        // For now, use localStorage until database is set up
        const savedPreference = localStorage.getItem('ai_system_preference');
        setIsPrimeEnabled(savedPreference === 'prime');
      } catch (error) {
        console.error('Error loading AI system preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserPreference();
  }, [user]);

  // Save user's AI system preference
  const handleToggle = async (enabled: boolean) => {
    if (!user) return;
    
    setIsPrimeEnabled(enabled);
    
    try {
      // For now, use localStorage until database is set up
      localStorage.setItem('ai_system_preference', enabled ? 'prime' : 'legacy');
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('aiSystemChanged', {
        detail: { system: enabled ? 'prime' : 'legacy' }
      }));
      
    } catch (error) {
      console.error('Error saving AI system preference:', error);
      // Revert on error
      setIsPrimeEnabled(!enabled);
    }
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-12 bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Toggle */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              {isPrimeEnabled ? (
                <Crown className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isPrimeEnabled ? 'Prime AI Team' : 'Legacy AI Chat'}
              </h3>
              <p className="text-sm text-gray-400">
                {isPrimeEnabled 
                  ? 'Complete AI workforce with 30+ specialized employees'
                  : 'Simple Byte + Crystal chat system'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isPrimeEnabled && (
              <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
                Beta
              </span>
            )}
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Toggle Switch */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Legacy</span>
          </div>
          
          <button
            onClick={() => handleToggle(!isPrimeEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isPrimeEnabled ? 'bg-blue-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPrimeEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-300">Prime</span>
          </div>
        </div>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
          <h4 className="text-md font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            System Comparison
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Legacy System */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-gray-400" />
                <h5 className="font-medium text-gray-300">Legacy System</h5>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-gray-300">Simple Byte + Crystal chat</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-gray-300">Basic document processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-gray-300">Stable and tested</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-yellow-400" />
                  <span className="text-gray-300">Limited AI personalities</span>
                </div>
              </div>
            </div>
            
            {/* Prime System */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-blue-400" />
                <h5 className="font-medium text-blue-300">Prime System</h5>
                <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-xs">
                  Beta
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-gray-300">30+ specialized AI employees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-gray-300">Intelligent routing & handoffs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-gray-300">Learning & memory system</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-gray-300">Team collaboration features</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-yellow-400" />
                  <span className="text-gray-300">Still in development</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Active Employees Status */}
          {isPrimeEnabled && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <h6 className="text-sm font-medium text-white mb-2">Active AI Employees</h6>
              <div className="flex flex-wrap gap-2">
                {['Prime', 'Byte', 'Crystal', 'Tag', 'Ledger', 'Goalie', 'Blitz'].map((employee) => (
                  <span
                    key={employee}
                    className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs"
                  >
                    {employee}
                  </span>
                ))}
                <span className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded text-xs">
                  +23 Coming Soon
                </span>
              </div>
            </div>
          )}
          
          {/* Usage Stats */}
          <div className="mt-4 p-3 bg-gray-700 rounded-lg">
            <h6 className="text-sm font-medium text-white mb-2">Your Usage</h6>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Current System</div>
                <div className="text-white font-medium">
                  {isPrimeEnabled ? 'Prime AI Team' : 'Legacy Chat'}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Last Switch</div>
                <div className="text-white font-medium">Just now</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISystemToggle;
