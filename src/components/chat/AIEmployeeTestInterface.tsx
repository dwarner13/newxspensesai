// AI Employee Test Interface - For testing the new Prime system
import React, { useState } from 'react';
import { Crown, Bot, Sparkles } from 'lucide-react';
import PrimeChatInterface from './_legacy/PrimeChatInterface';
import { ByteDocumentChat } from './_legacy/ByteDocumentChat';

interface AIEmployeeTestInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIEmployeeTestInterface: React.FC<AIEmployeeTestInterfaceProps> = ({ isOpen, onClose }) => {
  const [activeSystem, setActiveSystem] = useState<'prime' | 'legacy'>('prime');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex">
        {/* System Selector Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
          <h3 className="text-lg font-bold text-white mb-4">AI System Test</h3>
          
          <div className="space-y-3">
            <button
              onClick={() => setActiveSystem('prime')}
              className={`w-full p-3 rounded-lg text-left transition-colors ${
                activeSystem === 'prime'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                <div>
                  <div className="font-medium">Prime System</div>
                  <div className="text-xs opacity-75">New AI Employee Team</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => setActiveSystem('legacy')}
              className={`w-full p-3 rounded-lg text-left transition-colors ${
                activeSystem === 'legacy'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <div>
                  <div className="font-medium">Legacy System</div>
                  <div className="text-xs opacity-75">Byte + Crystal Chat</div>
                </div>
              </div>
            </button>
          </div>
          
          <div className="mt-6 p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">Prime Features</span>
            </div>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• 30+ AI Employees</li>
              <li>• Intelligent Routing</li>
              <li>• Team Collaboration</li>
              <li>• Personality System</li>
              <li>• Context Management</li>
            </ul>
          </div>
          
          <button
            onClick={onClose}
            className="w-full mt-4 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Close Test
          </button>
        </div>
        
        {/* Main Chat Area */}
        <div className="flex-1">
          {activeSystem === 'prime' ? (
            <PrimeChatInterface isOpen={true} onClose={() => {}} />
          ) : (
            <ByteDocumentChat isOpen={true} onClose={() => {}} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AIEmployeeTestInterface;
