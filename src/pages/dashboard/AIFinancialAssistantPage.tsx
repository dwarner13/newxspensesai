import { useState } from 'react';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import { 
  Send, 
  Loader2,
  TrendingUp,
  Target,
  Brain,
  Sparkles,
  X,
  Upload,
  BarChart3,
  Zap
} from 'lucide-react';
import { PRIME_CHAT_V2 } from '../../lib/flags';

interface PrimeMessage {
  role: 'user' | 'prime';
  content: string;
  timestamp: Date;
}

export default function AIFinancialAssistantPage() {
  const [messages, setMessages] = useState<PrimeMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isEmployeePanelOpen, setIsEmployeePanelOpen] = useState(false);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: PrimeMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'test-user',
          employeeSlug: 'prime-boss',
          message: messageText,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: PrimeMessage = {
        role: 'prime',
        content: data.content || "I'm here to help coordinate your financial team!",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      const fallbackMessage: PrimeMessage = {
        role: 'prime',
        content: "Sorry, I'm having trouble connecting right now. Please try again!",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-full pt-4 px-4 sm:px-6 lg:px-8 min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Page Title */}
      <MobilePageTitle 
        title="AI Financial Assistant" 
        subtitle="Get personalized financial advice from AI"
      />
      
        {/* Desktop Title */}
        <div className="hidden md:block text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2" style={{ WebkitBackgroundClip: 'text' }}>
            AI Financial Assistant
          </h1>
          <p className="text-white/60 text-lg">
            Get personalized financial advice from your AI team
          </p>
        </div>
        
        {/* Welcome Banner */}
        <div className="max-w-6xl mx-auto pr-4 lg:pr-20 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-1">
              Welcome to Your Financial Command Center
                  </h2>
            <p className="text-white/60 text-sm mb-4">
              Your intelligent financial advisor and personal money management assistant
            </p>
          </div>

          {/* Feature Modules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              { icon: Upload, title: "Smart Import AI", desc: "Upload and categorize transactions", color: "from-blue-500 to-purple-600" },
              { icon: Brain, title: "AI Insights", desc: "Get personalized financial insights", color: "from-purple-500 to-pink-600" },
              { icon: Target, title: "Goal Planning", desc: "Set and track your financial goals", color: "from-green-500 to-emerald-600" },
              { icon: TrendingUp, title: "Spending Analysis", desc: "Analyze your spending patterns", color: "from-orange-500 to-red-600" },
              { icon: BarChart3, title: "Financial Reports", desc: "Generate detailed financial reports", color: "from-cyan-500 to-blue-600" },
              { icon: Zap, title: "Smart Automation", desc: "Automate your financial tasks", color: "from-yellow-500 to-orange-600" }
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <button
                  key={index}
                  className="group flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[140px] hover:shadow-lg hover:shadow-purple-500/20 hover:ring-2 hover:ring-purple-500/30 hover:ring-opacity-50"
                  onClick={() => {
                    if (PRIME_CHAT_V2) {
                      window.dispatchEvent(new CustomEvent('prime:open', { detail: { intent: 'insights' } }));
                    } else {
                      setIsChatOpen(true);
                    }
                  }}
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-white/60 text-xs leading-tight">{feature.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Prime Chat Slide-Out Panel (legacy) */}
      {!PRIME_CHAT_V2 && (
      <div className={`fixed top-0 right-0 h-full w-96 bg-gradient-to-b from-slate-900 to-slate-800 border-l border-white/10 shadow-2xl transform transition-transform duration-300 z-50 ${
        isChatOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">👑</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Prime</h3>
              <p className="text-white/60 text-sm">AI Team Coordinator & Financial Boss</p>
            </div>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
                </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 h-[calc(100vh-140px)]">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-white text-sm">
                  👋 Hi! I'm Prime, your AI Team Coordinator. I oversee all your financial AI employees and can help you with:
                </p>
                <ul className="mt-2 space-y-1 text-white/80 text-sm">
                  <li>• Financial planning and advice</li>
                  <li>• Coordinating with specialist AI employees</li>
                  <li>• Transaction categorization</li>
                  <li>• Budget optimization</li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => sendMessage("What's my spending summary?")}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 text-left text-white text-sm transition-colors"
                >
                  📊 Spending Summary
                </button>
                <button 
                  onClick={() => sendMessage("Help me save money")}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 text-left text-white text-sm transition-colors"
                >
                  💰 Save Money
                </button>
                <button 
                  onClick={() => sendMessage("Analyze my transactions")}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 text-left text-white text-sm transition-colors"
                >
                  🔍 Analyze Transactions
                </button>
                <button 
                  onClick={() => sendMessage("Set financial goals")}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 text-left text-white text-sm transition-colors"
                >
                  🎯 Set Goals
                </button>
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl p-3 ${
                      message.role === 'user'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                  : 'bg-white/10 border border-white/10 text-white'
              }`}>
                {message.role === 'prime' && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">👑</span>
                    <span className="text-xs font-semibold text-yellow-400">Prime</span>
                  </div>
                )}
                <p className="text-sm">{message.content}</p>
                    </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 border border-white/10 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                  <span className="text-white/60 text-sm">Prime is thinking...</span>
                  </div>
                </div>
              </div>
            )}
              </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
              <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                placeholder="Ask Prime anything or request a specialist..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                    disabled={isLoading}
                />
              </div>
                  <button
                onClick={() => !isLoading && sendMessage(input)}
                    disabled={isLoading || !input.trim()}
              className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium"
            >
              {isLoading ? (<Loader2 className="w-4 h-4 animate-spin" />) : (<Send className="w-4 h-4" />)}
                  </button>
          </div>
        </div>
      </div>
      )}

      {/* AI Employee Activity Panel */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-gradient-to-b from-slate-900 to-slate-800 border-l border-white/10 shadow-2xl transform transition-transform duration-300 z-40 ${
        isEmployeePanelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI Team Activity</h3>
              <p className="text-white/60 text-sm">Live employee status</p>
            </div>
                </div>
          <button onClick={() => setIsEmployeePanelOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

        {/* Employee Status List */}
        <div className="p-4 space-y-4">
          {[
            { name: 'Byte', role: 'Document Processor', status: 'working', task: 'Processing receipts', progress: 75, avatar: '📄', color: 'from-blue-500 to-cyan-500' },
            { name: 'Tag', role: 'Categorization Expert', status: 'idle', task: 'Ready for new tasks', progress: 0, avatar: '🏷️', color: 'from-green-500 to-emerald-500' },
            { name: 'Crystal', role: 'Financial Analyst', status: 'working', task: 'Analyzing spending patterns', progress: 45, avatar: '💎', color: 'from-purple-500 to-pink-500' },
            { name: 'Finley', role: 'Financial Assistant', status: 'available', task: 'Ready to assist', progress: 0, avatar: '💰', color: 'from-yellow-500 to-orange-500' }
          ].map((employee, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 bg-gradient-to-r ${employee.color} rounded-lg flex items-center justify-center`}>
                  <span className="text-white text-lg">{employee.avatar}</span>
                          </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">{employee.name}</h4>
                  <p className="text-white/60 text-sm">{employee.role}</p>
                          </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  employee.status === 'working' ? 'bg-green-500/20 text-green-400' :
                  employee.status === 'available' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                  {employee.status}
                </div>
              </div>
              <p className="text-white/80 text-sm mb-2">{employee.task}</p>
              {employee.progress > 0 && (
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className={`bg-gradient-to-r ${employee.color} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${employee.progress}%` }}
                  ></div>
                        </div>
              )}
                      </div>
                    ))}
                  </div>

        {/* Activity Feed */}
        <div className="p-4 border-t border-white/10">
          <h4 className="text-white font-semibold mb-3">Recent Activity</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
            {[
              { action: 'Byte processed 5 receipts', time: '2 min ago', icon: '📄' },
              { action: 'Tag categorized 12 transactions', time: '5 min ago', icon: '🏷️' },
              { action: 'Crystal generated spending report', time: '8 min ago', icon: '💎' },
              { action: 'Finley provided budget advice', time: '12 min ago', icon: '💰' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <span className="text-lg">{activity.icon}</span>
                <div className="flex-1">
                  <p className="text-white/80">{activity.action}</p>
                  <p className="text-white/50 text-xs">{activity.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                  </div>
                  
      {/* AI Team Toggle Button */}
                        <button 
        onClick={() => setIsEmployeePanelOpen(!isEmployeePanelOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 px-3 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${
          isEmployeePanelOpen ? 'right-[320px] rounded-l-lg' : 'right-0 rounded-l-lg'
        }`}
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed'
        }}
        title="View AI Team Activity"
      >
        <span className="text-xs font-semibold">AI TEAM</span>
                        </button>

      {/* Prime Chat Toggle Button (legacy) */}
      {!PRIME_CHAT_V2 && (
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-white z-40 transition-all duration-200 ${
            isChatOpen ? 'opacity-50' : ''
          }`}
          title="Chat with Prime - AI Team Coordinator"
        >
          <span className="text-white text-lg">👑</span>
        </button>
      )}
    </>
  );
}
