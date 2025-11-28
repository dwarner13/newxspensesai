import React from 'react';
import { Bot } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * AIAssistantCard component for AI financial assistant
 * Displays recent AI activity and chat interface
 */
const AIAssistantCard = () => {
  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
          <Bot size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">AI Financial Assistant</h3>
          <p className="text-sm text-white/60">Your personal finance coach</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h4 className="text-white font-semibold mb-2">Recent Activity</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Found $45 in potential savings</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Updated budget recommendations</span>
            </div>
          </div>
        </div>
        <Link to="/ai-financial-assistant" className="block w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all text-center">
          Ask AI Assistant
        </Link>
      </div>
    </div>
  );
};

export default AIAssistantCard; 