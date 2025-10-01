import React, { useState, useEffect, useRef } from 'react';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import { 
  Send, 
  Loader2,
  Brain,
  Mic,
  Paperclip,
  Upload,
  BarChart3,
  FileText,
  Calculator,
  CreditCard,
  Users,
  Play
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const DebtPayoffPlannerPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message function
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toLocaleString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        role: 'assistant',
        content: `I understand you want help with "${content.trim()}". I'm here to help you create a debt payoff strategy. Let me analyze your situation and provide personalized recommendations.`,
        timestamp: new Date().toLocaleString()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pt-4">
      {/* Page Title */}
      <MobilePageTitle 
        title="Debt Payoff Planner" 
        subtitle="AI-powered debt liberation and financial freedom"
      />
      
      {/* Desktop Title */}
      <div className="hidden md:block text-center mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2" style={{ WebkitBackgroundClip: 'text' }}>
          Debt Payoff Planner
        </h1>
        <p className="text-white/60 text-lg">
          AI-powered debt liberation and financial freedom
        </p>
      </div>
      
      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px]" ref={messagesEndRef}>
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-4xl">
                  <h2
                    className="text-xl font-bold text-white mb-1"
                  >
                    Welcome to Debt Payoff Planner
                  </h2>
                  <p
                    className="text-white/60 text-sm mb-3"
                  >
                    Your intelligent guide to debt elimination and financial freedom
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                    {[
                      { icon: Upload, title: "Smart Upload AI", desc: "Upload and analyze debt statements", color: "from-blue-500 to-cyan-500" },
                      { icon: Brain, title: "AI Chat Assistant", desc: "Chat with debt liberation specialists", color: "from-green-500 to-emerald-500" },
                      { icon: Calculator, title: "Smart Calculator", desc: "Calculate optimal payoff strategies", color: "from-purple-500 to-violet-500" },
                      { icon: CreditCard, title: "Debt Analysis", desc: "Deep debt structure analysis", color: "from-red-500 to-pink-500" },
                      { icon: Users, title: "AI Team", desc: "Meet your liberation specialists", color: "from-orange-500 to-yellow-500" },
                      { icon: Play, title: "Liberation Theater", desc: "Live debt liberation scenarios", color: "from-indigo-500 to-purple-500" }
                    ].map((item, index) => (
                      <button
                        key={index}
                        className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
                      >
                        <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                          <p className="text-white/60 text-xs leading-tight">{item.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md px-2 py-1.5 rounded text-left ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    <p className="text-sm leading-tight whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-0.5">
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div
                className="flex justify-start"
              >
                <div className="bg-white/10 px-3 py-2 rounded-lg border border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Brain className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-green-400" />
                      <span className="text-xs text-white/70">AI is analyzing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input Area */}
          <div className="px-2 pt-1 pb-0.5 border-t border-white/10 bg-gradient-to-r from-purple-500/5 to-cyan-500/5">
            <div className="flex gap-1">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                  placeholder="Ask about debt strategies, payoff calculations..."
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 pr-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-sm"
                  disabled={isLoading}
                />
                <button 
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5 text-white/60" />
                </button>
              </div>
              <button className="p-1.5 hover:bg-white/10 rounded transition-colors">
                <Mic className="w-3.5 h-3.5 text-white/60" />
              </button>
              <button
                onClick={() => !isLoading && sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="px-2 py-1.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebtPayoffPlannerPage;