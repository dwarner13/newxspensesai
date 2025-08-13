import React, { useState } from 'react';
import { MessageCircle, Sparkles, TrendingUp, Lightbulb, Send } from 'lucide-react';

const AIAssistantTickerCard = () => {
  const [question, setQuestion] = useState('');
  
  const recentResults = [
    {
      type: 'deduction',
      message: 'Found potential tax deduction: Home office expenses',
      icon: TrendingUp,
      color: 'text-green-400'
    },
    {
      type: 'reminder',
      message: 'Bill reminder: Car insurance due in 3 days',
      icon: Lightbulb,
      color: 'text-yellow-400'
    },
    {
      type: 'tip',
      message: 'Tip: Consider increasing your emergency fund by 15%',
      icon: Sparkles,
      color: 'text-blue-400'
    }
  ];

  const handleAskQuestion = () => {
    if (question.trim()) {
      // Handle AI question submission
      console.log('AI Question:', question);
      setQuestion('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAskQuestion();
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group h-full flex flex-col">
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
            <MessageCircle size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">AI Assistant</h3>
            <p className="text-sm text-white/60">Your financial companion</p>
          </div>
        </div>

        {/* Recent Results */}
        <div className="space-y-3 mb-6 flex-grow">
          <h4 className="text-sm font-semibold text-white/90 mb-3">Recent AI Insights</h4>
          <div className="space-y-3 max-h-32 overflow-y-auto">
            {recentResults.map((result, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-200">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 ${result.color}`}>
                    <result.icon size={16} />
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed flex-1">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ask Question Input */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white/90">Ask AI Assistant</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your finances..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-400 transition-all duration-300"
            />
            <button
              onClick={handleAskQuestion}
              disabled={!question.trim()}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 group-hover:scale-105"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex gap-2">
          <button className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2 px-3 rounded-lg transition-all duration-300 border border-white/20">
            Budget Help
          </button>
          <button className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2 px-3 rounded-lg transition-all duration-300 border border-white/20">
            Tax Tips
          </button>
          <button className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2 px-3 rounded-lg transition-all duration-300 border border-white/20">
            Goals
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantTickerCard; 
