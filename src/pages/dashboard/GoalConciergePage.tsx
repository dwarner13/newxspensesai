import React, { useState, useRef, useEffect } from 'react';
import { Target, BarChart3, Trophy, Send, Loader2, X, Brain } from 'lucide-react';

interface GoalieMessage {
  role: 'user' | 'goalie';
  content: string;
  timestamp: string;
}

const GoalConciergePage: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<GoalieMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isEmployeePanelOpen, setIsEmployeePanelOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: GoalieMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const goalieResponse: GoalieMessage = {
        role: 'goalie',
        content: getGoalieResponse(message),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, goalieResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getGoalieResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('emergency fund') || lowerMessage.includes('emergency')) {
      return "Great question about emergency funds! I recommend building 3-6 months of expenses. Based on your current progress of $8,500, you're doing well! Consider increasing your monthly contribution to $750 to reach your goal 3 months earlier. Would you like me to help you create a savings strategy?";
    }
    
    if (lowerMessage.includes('vacation') || lowerMessage.includes('travel')) {
      return "Vacation planning is exciting! Your vacation fund is at 64% completion - excellent progress! To reach your $5,000 target by August, consider setting up automatic transfers of $200/month. I can also help you find ways to save on travel expenses. What's your dream destination?";
    }
    
    if (lowerMessage.includes('debt') || lowerMessage.includes('payoff')) {
      return "Debt payoff is a smart priority! Your credit card debt of $7,700 is manageable. I suggest the avalanche method - pay minimums on all cards, then put extra money toward the highest interest rate card. Would you like me to create a personalized debt payoff timeline?";
    }
    
    if (lowerMessage.includes('goal') || lowerMessage.includes('target')) {
      return "I love helping with goal setting! The key is making goals SMART - Specific, Measurable, Achievable, Relevant, and Time-bound. Based on your current goals, you're making great progress. What new goal would you like to work on?";
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('spending')) {
      return "Budgeting is the foundation of financial success! I recommend the 50/30/20 rule: 50% for needs, 30% for wants, 20% for savings and debt payoff. Would you like me to analyze your spending patterns and suggest budget optimizations?";
    }
    
    return "Thanks for reaching out! I'm here to help you achieve your financial goals. Whether it's building emergency funds, planning vacations, paying off debt, or creating budgets - I've got strategies for you! What specific goal would you like to work on today?";
  };

  return (
    <div className="w-full pt-4 px-4 sm:px-6 lg:px-8 min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Mobile Page Title */}
      <div className="md:hidden text-center mb-4 mt-1">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-3" style={{ WebkitBackgroundClip: 'text' }}>
          AI Goal Concierge
        </h1>
        <p className="text-white/60 text-base">Set and track your financial goals</p>
      </div>
      
      {/* Desktop Title */}
      <div className="hidden md:block text-center mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2" style={{ WebkitBackgroundClip: 'text' }}>
          AI Goal Concierge
        </h1>
        <p className="text-white/60 text-lg">
          Set and track your financial goals with AI assistance
        </p>
      </div>
      
      {/* Welcome Banner */}
      <div className="max-w-6xl mx-auto pr-4 lg:pr-20 mb-8">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-1">
            Welcome to Goalie's Goals Setting Session
          </h2>
          <p className="text-white/60 text-sm mb-4">
            Your intelligent guide to setting, tracking, and achieving your financial goals
          </p>
        </div>

        {/* Feature Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[
            { icon: Target, title: "Emergency Fund", desc: "Build your financial safety net", color: "from-green-500 to-emerald-600" },
            { icon: Trophy, title: "Vacation Goals", desc: "Plan and save for your dream trip", color: "from-blue-500 to-cyan-600" },
            { icon: BarChart3, title: "Debt Payoff", desc: "Create a debt elimination strategy", color: "from-red-500 to-pink-600" },
            { icon: Brain, title: "Smart Goals", desc: "AI-powered goal recommendations", color: "from-purple-500 to-violet-600" },
            { icon: Target, title: "Progress Tracking", desc: "Monitor your goal achievements", color: "from-orange-500 to-yellow-600" },
            { icon: Brain, title: "Goal Analytics", desc: "Get insights on your progress", color: "from-indigo-500 to-purple-600" }
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <button
                key={index}
                className="group flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[140px] hover:shadow-lg hover:shadow-purple-500/20 hover:ring-2 hover:ring-purple-500/30 hover:ring-opacity-50"
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
    </div>
  );
};

export default GoalConciergePage;