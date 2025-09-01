
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UploadCloud, Bot, HeartPulse, Target, LineChart, Bell, 
  PiggyBank, Crown, Mic, Music, FileText, BarChart3, 
  Zap, Activity, Settings, User, Play, TrendingUp, Users, Award, Star,
  Calculator, Building2, CreditCard, Eye, Sparkles, TrendingDown, DollarSign
} from 'lucide-react';
import DashboardHeader from './ui/DashboardHeader';

export default function XspensesProDashboard() {
  const [viewMode, setViewMode] = useState('grid');

  return (
    <div className="w-full">
      <DashboardHeader />

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

          {/* Smart Overview Grid - 3x3 Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Financial Health Score */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-xl font-bold text-white mb-1">85</div>
              <div className="text-white/90 text-xs mb-1">Financial Health Score</div>
              <div className="text-green-300 text-xs">+5 points this month</div>
            </div>

            {/* Monthly Spending */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 text-center">
              <div className="text-2xl mb-1">💰</div>
              <div className="text-lg font-bold text-green-400 mb-1">$2,847</div>
              <div className="text-white/70 text-xs mb-1">Monthly Spending</div>
              <div className="text-green-400 text-xs flex items-center justify-center gap-1">
                <TrendingUp size={10} />
                +12%
              </div>
            </div>

            {/* Savings Rate */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 text-center">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-lg font-bold text-blue-400 mb-1">23%</div>
              <div className="text-white/70 text-xs mb-1">Savings Rate</div>
              <div className="text-green-400 text-xs flex items-center justify-center gap-1">
                <TrendingUp size={10} />
                +3%
              </div>
            </div>

            {/* Bills Due */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 text-center">
              <div className="text-2xl mb-1">📅</div>
              <div className="text-lg font-bold text-orange-400 mb-1">3</div>
              <div className="text-white/70 text-xs mb-1">Bills Due</div>
              <div className="text-orange-400 text-xs">This week</div>
            </div>

            {/* Net Worth */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 text-center">
              <div className="text-2xl mb-1">💎</div>
              <div className="text-lg font-bold text-purple-400 mb-1">$45,230</div>
              <div className="text-white/70 text-xs mb-1">Net Worth</div>
              <div className="text-green-400 text-xs flex items-center justify-center gap-1">
                <TrendingUp size={10} />
                +8.2%
              </div>
            </div>

            {/* Credit Score */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-lg font-bold text-indigo-400 mb-1">742</div>
              <div className="text-white/70 text-xs mb-1">Credit Score</div>
              <div className="text-green-400 text-xs flex items-center justify-center gap-1">
                <TrendingUp size={10} />
                +15
              </div>
            </div>

            {/* Monthly Income */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 text-center">
              <div className="text-2xl mb-1">💵</div>
              <div className="text-lg font-bold text-emerald-400 mb-1">$4,200</div>
              <div className="text-white/70 text-xs mb-1">Monthly Income</div>
              <div className="text-green-400 text-xs flex items-center justify-center gap-1">
                <TrendingUp size={10} />
                +5.1%
              </div>
            </div>

            {/* Debt-to-Income */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 text-center">
              <div className="text-2xl mb-1">⚖️</div>
              <div className="text-lg font-bold text-yellow-400 mb-1">18%</div>
              <div className="text-white/70 text-xs mb-1">Debt-to-Income</div>
              <div className="text-green-400 text-xs flex items-center justify-center gap-1">
                <TrendingDown size={10} />
                -2%
              </div>
            </div>

            {/* Emergency Fund */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 text-center">
              <div className="text-2xl mb-1">🛡️</div>
              <div className="text-lg font-bold text-cyan-400 mb-1">$8,500</div>
              <div className="text-white/70 text-xs mb-1">Emergency Fund</div>
              <div className="text-green-400 text-xs flex items-center justify-center gap-1">
                <TrendingUp size={10} />
                +$200
              </div>
            </div>
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
              <div className="absolute top-3 right-3">
                <UploadCloud className="w-6 h-6 text-white/80" />
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
              <Link to="/dashboard/smart-import-ai" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Import Now
              </Link>
            </div>

            {/* AI Financial Assistant */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-purple-600 to-indigo-700 hover:shadow-purple-500/25">
              <div className="absolute top-3 right-3">
                <Bot className="w-6 h-6 text-white/80" />
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
              <Link to="/dashboard/ai-financial-assistant" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Chat Now
              </Link>
            </div>

            {/* AI Financial Therapist */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-pink-600 to-rose-700 hover:shadow-pink-500/25">
              <div className="absolute top-3 right-3">
                <HeartPulse className="w-6 h-6 text-white/80" />
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
              <Link to="/dashboard/financial-therapist" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Start Session
              </Link>
            </div>

            {/* AI Goal Concierge */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-green-600 to-emerald-700 hover:shadow-green-500/25">
              <div className="absolute top-3 right-3">
                <Target className="w-6 h-6 text-white/80" />
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
              <Link to="/dashboard/goal-concierge" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Set Goals
              </Link>
            </div>

            {/* Spending Predictions */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-indigo-600 to-purple-700 hover:shadow-indigo-500/25">
              <div className="absolute top-3 right-3">
                <LineChart className="w-6 h-6 text-white/80" />
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
              <Link to="/dashboard/spending-predictions" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                View Predictions
              </Link>
            </div>

            {/* AI Categorization */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-orange-600 to-red-700 hover:shadow-orange-500/25">
              <div className="absolute top-3 right-3">
                <FileText className="w-6 h-6 text-white/80" />
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
              <Link to="/dashboard/ai-categorization" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Manage Categories
              </Link>
            </div>
          </div>
        </section>

        {/* Expense & Planning Tools Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-8 h-8 text-green-400" />
            <h2 className="text-2xl font-bold text-white">Expense & Planning Tools</h2>
          </div>
          <div className={`grid gap-6 ${
            viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'
          }`}>
            
            {/* Bill Reminders */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-yellow-600 to-orange-700 hover:shadow-yellow-500/25">
              <div className="absolute top-3 right-3">
                <Bell className="w-6 h-6 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Bill Reminder System</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Never miss a payment with smart bill tracking and automated reminders.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>3 bills due this week</span>
                  <span>100% on-time rate</span>
                </div>
              </div>
              <Link to="/dashboard/bill-reminders" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Manage Bills
              </Link>
            </div>

            {/* Debt Payoff Planner */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-red-600 to-pink-700 hover:shadow-red-500/25">
              <div className="absolute top-3 right-3">
                <CreditCard className="w-6 h-6 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Debt Payoff Planner</h3>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Strategic debt payoff planning with AI-powered recommendations and tracking.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>2 active plans</span>
                  <span>45% debt reduction</span>
                </div>
              </div>
              <Link to="/dashboard/debt-payoff-planner" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Plan Payoff
              </Link>
            </div>

            {/* AI Financial Freedom */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-emerald-600 to-teal-700 hover:shadow-emerald-500/25">
              <div className="absolute top-3 right-3">
                <Award className="w-6 h-6 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">AI Financial Freedom</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Path to financial independence with AI-guided strategies and milestones.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>12 years to FIRE</span>
                  <span>67% progress</span>
                </div>
              </div>
              <Link to="/dashboard/ai-financial-freedom" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Start Journey
              </Link>
            </div>
          </div>
        </section>

        {/* Audio Entertainment Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Music className="w-8 h-8 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">Audio Entertainment</h2>
          </div>
          <div className={`grid gap-6 ${
            viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'
          }`}>
            
            {/* Personal Podcast */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-purple-600 to-violet-700 hover:shadow-purple-500/25">
              <div className="absolute top-3 right-3">
                <Mic className="w-6 h-6 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Personal Podcast</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">AI-generated podcasts about your financial journey and money story.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>Last episode: 2 days ago</span>
                  <span>24 episodes total</span>
                </div>
              </div>
              <Link to="/dashboard/personal-podcast" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Listen Now
              </Link>
            </div>

            {/* Spotify Integration */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-green-500 to-emerald-600 hover:shadow-green-500/25">
              <div className="absolute top-3 right-3">
                <Music className="w-6 h-6 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Spotify Integration</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Curated playlists for focus, relaxation, and financial motivation.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>Connected</span>
                  <span>8 playlists</span>
                </div>
              </div>
              <Link to="/dashboard/spotify-integration" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Connect
              </Link>
            </div>

            {/* Wellness Studio */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-pink-500 to-rose-600 hover:shadow-pink-500/25">
              <div className="absolute top-3 right-3">
                <HeartPulse className="w-6 h-6 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Wellness Studio</h3>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Financial wellness tools and mindfulness practices for better money habits.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>Last session: 1 week ago</span>
                  <span>Stress level: Low</span>
                </div>
              </div>
              <Link to="/dashboard/wellness-studio" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Enter Studio
              </Link>
            </div>
          </div>
        </section>

        {/* Tax, Business & Automation Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-8 h-8 text-indigo-400" />
            <h2 className="text-2xl font-bold text-white">Tax, Business & Automation</h2>
          </div>
          <div className={`grid gap-6 ${
            viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'
          }`}>
            
            {/* Tax Assistant */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-blue-600 to-indigo-700 hover:shadow-blue-500/25">
              <div className="absolute top-3 right-3">
                <Calculator className="w-6 h-6 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Tax Assistant</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Tax answers and optimization guidance for freelancers and businesses.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>Tax season ready</span>
                  <span>98% accuracy</span>
                </div>
              </div>
              <Link to="/dashboard/tax-assistant" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Get Help
              </Link>
            </div>

            {/* Business Intelligence */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-slate-600 to-slate-800 hover:shadow-slate-500/25">
              <div className="absolute top-3 right-3">
                <Building2 className="w-6 h-6 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Business Intelligence</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Trends and insights for business growth and expense optimization.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>12 insights this month</span>
                  <span>Revenue +8%</span>
                </div>
              </div>
              <Link to="/dashboard/business-intelligence" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                View Insights
              </Link>
            </div>

            {/* Smart Automation */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-cyan-600 to-blue-700 hover:shadow-cyan-500/25">
              <div className="absolute top-3 right-3">
                <Zap className="w-6 h-6 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Smart Automation</h3>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Automate repetitive tasks and workflows for better efficiency.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>5 active workflows</span>
                  <span>Time saved: 12h/week</span>
                </div>
              </div>
              <Link to="/dashboard/smart-automation" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Configure
              </Link>
            </div>
          </div>
        </section>

        {/* Tools Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-8 h-8 text-slate-400" />
            <h2 className="text-2xl font-bold text-white">Tools</h2>
          </div>
          <div className={`grid gap-6 ${
            viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'
          }`}>
            
            {/* Analytics */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-slate-600 to-slate-800 hover:shadow-slate-500/25">
              <div className="absolute top-3 right-3">
                <BarChart3 className="w-6 h-6 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Analytics</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Comprehensive financial analytics and reporting dashboard.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>Last updated: 1 hour ago</span>
                  <span>15 reports available</span>
                </div>
              </div>
              <Link to="/dashboard/analytics" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                View Reports
              </Link>
            </div>

            {/* Settings */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-slate-600 to-slate-800 hover:shadow-slate-500/25">
              <div className="absolute top-3 right-3">
                <Settings className="w-6 h-6 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Settings</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Configure your account, preferences, and security settings.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>Account verified</span>
                  <span>2FA enabled</span>
                </div>
              </div>
              <Link to="/dashboard/settings" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Configure
              </Link>
            </div>

            {/* Reports */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-slate-600 to-slate-800 hover:shadow-slate-500/25">
              <div className="absolute top-3 right-3">
                <FileText className="w-6 h-6 text-white/80" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">Reports</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed mb-4">Generate and export detailed financial reports and summaries.</p>
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>Last report: 3 days ago</span>
                  <span>PDF export ready</span>
                </div>
              </div>
              <Link to="/dashboard/reports" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Generate
              </Link>
            </div>
          </div>
        </section>


      </div>
    </div>
  );
}
