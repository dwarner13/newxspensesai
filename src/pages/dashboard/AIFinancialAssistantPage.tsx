import { useState } from 'react';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import { 
  TrendingUp,
  Target,
  Brain,
  Upload,
  BarChart3,
  Zap
} from 'lucide-react';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export default function AIFinancialAssistantPage() {
  const { openChat } = useUnifiedChatLauncher();
  const [isEmployeePanelOpen, setIsEmployeePanelOpen] = useState(false);

  // Open unified chat with Prime
  const handleOpenChat = (initialQuestion?: string) => {
    openChat({
      initialEmployeeSlug: 'prime-boss',
      context: {
        page: 'ai-financial-assistant',
        data: {
          source: 'feature-card',
        },
      },
      initialQuestion,
    });
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
                  onClick={() => handleOpenChat()}
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

    </>
  );
}
