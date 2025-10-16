// Prime AI Test Page - Direct access to test the new system
import React, { useState } from 'react';
import { Crown, Bot, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ByteDocumentChat } from '../../components/chat/_legacy/ByteDocumentChat';
import AISystemToggle from '../../components/settings/AISystemToggle';

const PrimeAITestPage: React.FC = () => {
  const navigate = useNavigate();
  const [isPrimeOpen, setIsPrimeOpen] = useState(false);
  const [isLegacyOpen, setIsLegacyOpen] = useState(false);
  const [currentSystem, setCurrentSystem] = useState<'prime' | 'legacy'>('prime');

  const handleSystemChange = (system: 'prime' | 'legacy') => {
    setCurrentSystem(system);
    if (system === 'prime') {
      setIsLegacyOpen(false);
      setIsPrimeOpen(true);
    } else {
      setIsPrimeOpen(false);
      setIsLegacyOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
            <div className="h-6 w-px bg-gray-600"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Prime AI System Test</h1>
                <p className="text-gray-400">Test the new AI Employee ecosystem</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
              Beta Testing
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Toggle */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                System Selection
              </h2>
              
              <AISystemToggle />
              
              <div className="mt-6 space-y-4">
                <button
                  onClick={() => handleSystemChange('prime')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    currentSystem === 'prime'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6 text-blue-400" />
                    <div className="text-left">
                      <div className="font-medium text-white">Prime AI Team</div>
                      <div className="text-sm text-gray-400">7 active employees + 23 coming soon</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleSystemChange('legacy')}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    currentSystem === 'legacy'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bot className="w-6 h-6 text-green-400" />
                    <div className="text-left">
                      <div className="font-medium text-white">Legacy System</div>
                      <div className="text-sm text-gray-400">Byte + Crystal chat</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Test Instructions */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">Test Scenarios</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-2">📄 Document Upload Test</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Test the document processing flow: Prime → Byte → Tag → Crystal
                  </p>
                  <div className="bg-gray-600 rounded p-3 text-sm font-mono text-gray-200">
                    "I have receipts to upload"
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-2">📊 Tax Question Test</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Test tax expertise routing: Prime → Ledger → Tag
                  </p>
                  <div className="bg-gray-600 rounded p-3 text-sm font-mono text-gray-200">
                    "What can I deduct for business expenses?"
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-2">⚡ Debt Strategy Test</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Test debt management: Prime → Blitz → Goalie → Crystal
                  </p>
                  <div className="bg-gray-600 rounded p-3 text-sm font-mono text-gray-200">
                    "Help me create a debt payoff plan"
                  </div>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-2">🎯 Complex Multi-Employee Test</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Test team collaboration: Multiple employees working together
                  </p>
                  <div className="bg-gray-600 rounded p-3 text-sm font-mono text-gray-200">
                    "Analyze my spending and create a budget with tax optimization"
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="font-medium text-blue-300 mb-2">💡 Testing Tips</h4>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>• Try different question types to test routing</li>
                  <li>• Use thumbs up/down to test feedback system</li>
                  <li>• Upload files to test document processing</li>
                  <li>• Switch between systems to compare responses</li>
                  <li>• Check browser console for learning system logs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modals */}
      {isPrimeOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Prime AI System</h3>
            </div>
            <p className="text-gray-300 mb-4">
              The Prime AI Employee System is coming soon! For now, you can test the enhanced Byte and Crystal chat system.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsPrimeOpen(false);
                  setIsLegacyOpen(true);
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Test Legacy System
              </button>
              <button
                onClick={() => setIsPrimeOpen(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isLegacyOpen && (
        <ByteDocumentChat 
          isOpen={isLegacyOpen} 
          onClose={() => setIsLegacyOpen(false)} 
        />
      )}
    </div>
  );
};

export default PrimeAITestPage;
