import React, { useState } from 'react';
import { 
  BookOpen, 
  BarChart3, 
  Download, 
  FileText, 
  TrendingUp, 
  Target, 
  DollarSign,
  Calendar,
  Users,
  Zap,
  ArrowRight,
  Play, 
  Mic,
  Headphones
} from 'lucide-react';

const FinancialStoryPage: React.FC = () => {
  const [activeView, setActiveView] = useState('overview');

  return (
    <div className="w-full pt-4 px-4 sm:px-6 lg:px-8 min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Mobile Page Title */}
      <div className="md:hidden text-center mb-4 mt-1">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-3" style={{ WebkitBackgroundClip: 'text' }}>
          Financial Story
        </h1>
        <p className="text-white/60 text-base">Transform your financial data into compelling stories</p>
      </div>
      
      {/* Desktop Title */}
      <div className="hidden md:block text-center mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2" style={{ WebkitBackgroundClip: 'text' }}>
          Financial Story
        </h1>
        <p className="text-white/60 text-lg">
          Transform your financial data into compelling stories
        </p>
      </div>
      
      {/* Welcome Banner */}
      <div className="max-w-6xl mx-auto pr-4 lg:pr-20 mb-8">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-1">
            Welcome to Your Financial Story Studio
          </h2>
          <p className="text-white/60 text-sm mb-4">
            Transform your financial journey into compelling narratives and insights
          </p>
        </div>

        {/* Feature Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[
            { icon: BookOpen, title: "Story Generator", desc: "Create personalized financial narratives", color: "from-purple-500 to-pink-600" },
            { icon: BarChart3, title: "Data Analytics", desc: "Analyze your financial patterns", color: "from-blue-500 to-cyan-600" },
            { icon: FileText, title: "Report Builder", desc: "Generate comprehensive reports", color: "from-green-500 to-emerald-600" },
            { icon: TrendingUp, title: "Progress Tracking", desc: "Monitor your financial growth", color: "from-orange-500 to-yellow-600" },
            { icon: Download, title: "Export Stories", desc: "Download and share your stories", color: "from-red-500 to-pink-600" },
            { icon: Users, title: "AI Narrator", desc: "AI-powered story creation", color: "from-indigo-500 to-purple-600" }
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
    </div>
  );
};

export default FinancialStoryPage;