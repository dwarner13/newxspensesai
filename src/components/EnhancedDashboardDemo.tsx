import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UploadCloud, Bot, HeartPulse, Target, LineChart, Bell, 
  PiggyBank, Crown, Mic, Music, FileText, BarChart3, 
  Zap, Activity, Settings, User, Play, TrendingUp, Users, Award, Star,
  Calculator, Building2, CreditCard, Eye, Sparkles, TrendingDown, DollarSign
} from 'lucide-react';

export default function EnhancedDashboardDemo() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Simple Header */}
      <div className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">👑</div>
            <h1 className="text-xl font-bold text-white">Enhanced Dashboard Demo</h1>
          </div>
          <Link to="/dashboard" className="text-white/70 hover:text-white text-sm">
            ← Back to Main Dashboard
          </Link>
        </div>
      </div>

      {/* Enhanced Dashboard Content */}
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        
        {/* Smart Overview Section */}
        <section className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-2xl p-6 border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">Smart Overview</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Grid
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'list' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                List
              </button>
            </div>
          </div>

          {/* Financial Health Score & Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Financial Health Score */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-2">🏆</div>
              <div className="text-3xl font-bold text-white mb-1">85</div>
              <div className="text-white/90 text-sm mb-2">Financial Health Score</div>
              <div className="text-green-300 text-xs">+5 points this month</div>
            </div>

            {/* Quick Stats */}
            {[
              { metric: 'Monthly Spending', value: '$2,847', icon: '💰', color: 'text-green-400', change: '+12%', trend: 'up' },
              { metric: 'Savings Rate', value: '23%', icon: '🎯', color: 'text-blue-400', change: '+3%', trend: 'up' },
              { metric: 'Bills Due', value: '3', icon: '📅', color: 'text-orange-400', change: 'This week', trend: 'neutral' }
            ].map((stat, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center">
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-white/70 text-sm mb-2">{stat.metric}</div>
                <div className={`text-xs flex items-center justify-center gap-1 ${
                  stat.trend === 'up' ? 'text-green-400' : 
                  stat.trend === 'down' ? 'text-red-400' : 'text-orange-400'
                }`}>
                  {stat.trend === 'up' && <TrendingUp size={12} />}
                  {stat.trend === 'down' && <TrendingDown size={12} />}
                  {stat.change}
                </div>
              </div>
            ))}
          </div>

          {/* AI Recommendations */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center gap-3 mb-3">
              <Bot className="w-6 h-6 text-purple-400" />
              <h3 className="font-semibold text-white">AI Recommendations</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                <Target className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-white text-sm font-medium">Set up Goal Concierge</div>
                  <div className="text-white/60 text-xs">You're 15% behind on savings goal</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                <Calculator className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-white text-sm font-medium">Check Tax Assistant</div>
                  <div className="text-white/60 text-xs">Tax season approaching</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                <Bell className="w-5 h-5 text-orange-400" />
                <div>
                  <div className="text-white text-sm font-medium">Review Bill Reminders</div>
                  <div className="text-white/60 text-xs">3 bills due this week</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Personal Finance AI Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Bot className="w-8 h-8 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Personal Finance AI</h2>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">AI Active</span>
            </div>
          </div>
          
          <div className={`grid gap-6 ${
            viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'
          }`}>
            
            {/* Smart Import AI */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-blue-600 to-cyan-700 hover:shadow-blue-500/25">
              <div className="absolute top-4 right-4">
                <UploadCloud className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Smart Import AI</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Upload receipts and bank statements. Our AI automatically categorizes and organizes your expenses.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>Last used: 2 hours ago</span>
                  <span>247 documents processed</span>
                </div>
              </div>
              <button className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Import Now
              </button>
            </div>

            {/* AI Financial Assistant */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-purple-600 to-indigo-700 hover:shadow-purple-500/25">
              <div className="absolute top-4 right-4">
                <Bot className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">AI Financial Assistant</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Get personalized financial advice and insights from our AI assistant.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>Available 24/7</span>
                  <span>99.7% accuracy</span>
                </div>
              </div>
              <button className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Chat Now
              </button>
            </div>

            {/* AI Financial Therapist */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-pink-600 to-rose-700 hover:shadow-pink-500/25">
              <div className="absolute top-4 right-4">
                <HeartPulse className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">AI Financial Therapist</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Emotional and behavioral coaching to improve your financial wellness.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>Last session: 3 days ago</span>
                  <span>Stress level: Low</span>
                </div>
              </div>
              <button className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Start Session
              </button>
            </div>

            {/* AI Goal Concierge */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-green-600 to-emerald-700 hover:shadow-green-500/25">
              <div className="absolute top-4 right-4">
                <Target className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">AI Goal Concierge</h3>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Set and track your financial goals with AI-powered insights and recommendations.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>3 active goals</span>
                  <span>75% completion</span>
                </div>
              </div>
              <button className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Set Goals
              </button>
            </div>

            {/* Spending Predictions */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-indigo-600 to-purple-700 hover:shadow-indigo-500/25">
              <div className="absolute top-4 right-4">
                <LineChart className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Spending Predictions</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">AI-powered spending forecasts and trend analysis to help you plan better.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>Next month: $3,200</span>
                  <span>94% confidence</span>
                </div>
              </div>
              <button className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                View Predictions
              </button>
            </div>

            {/* AI Categorization */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-orange-600 to-red-700 hover:shadow-orange-500/25">
              <div className="absolute top-4 right-4">
                <FileText className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">AI Categorization</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Automatic transaction categorization with smart rules and learning capabilities.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>24 categories</span>
                  <span>99.2% accuracy</span>
                </div>
              </div>
              <button className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Manage Categories
              </button>
            </div>
          </div>
        </section>

        {/* Quick Actions Bar */}
        <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl hover:scale-105 transition-all">
              <UploadCloud className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Import Receipt</span>
            </button>
            <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:scale-105 transition-all">
              <Bot className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Ask AI</span>
            </button>
            <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:scale-105 transition-all">
              <Target className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Set Goal</span>
            </button>
            <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl hover:scale-105 transition-all">
              <Bell className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Check Bills</span>
            </button>
          </div>
        </section>

        {/* Demo Notice */}
        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-yellow-400" />
            <div>
              <h3 className="font-semibold text-white">Enhanced Dashboard Demo</h3>
              <p className="text-white/80 text-sm">This is a preview of the enhanced dashboard design. Features include smart overview, live data, AI recommendations, and improved visual hierarchy.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
