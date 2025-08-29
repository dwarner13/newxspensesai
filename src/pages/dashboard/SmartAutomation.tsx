import React, { useState, useEffect, useRef } from 'react';
import { Plus, Zap, Settings, Play, Pause, Trash2, Edit3, Bot, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';

interface Automation {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'error';
  type: 'transaction' | 'budget' | 'investment' | 'custom';
  lastRun: string;
  nextRun: string;
  successRate: number;
}

interface AutomationRecipe {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  estimatedTime: string;
}

const SmartAutomation = () => {
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ensure page starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Mock active automations
  const activeAutomations: Automation[] = [
    {
      id: '1',
      name: 'Smart Budget Allocation',
      description: 'Automatically distribute income across budget categories',
      status: 'active',
      type: 'budget',
      lastRun: '2024-01-15 09:00',
      nextRun: '2024-01-16 09:00',
      successRate: 98
    },
    {
      id: '2',
      name: 'Investment Rebalancing',
      description: 'Rebalance portfolio when allocations drift by 5%',
      status: 'active',
      type: 'investment',
      lastRun: '2024-01-14 15:30',
      nextRun: '2024-01-21 15:30',
      successRate: 95
    },
    {
      id: '3',
      name: 'Expense Categorization',
      description: 'AI-powered transaction categorization and tagging',
      status: 'paused',
      type: 'transaction',
      lastRun: '2024-01-13 12:00',
      nextRun: 'Paused',
      successRate: 92
    }
  ];

  // Mock automation recipes
  const automationRecipes: AutomationRecipe[] = [
    {
      id: '1',
      name: 'Emergency Fund Builder',
      description: 'Automatically save 10% of income until emergency fund is complete',
      difficulty: 'beginner',
      category: 'Savings',
      estimatedTime: '5 min'
    },
    {
      id: '2',
      name: 'Debt Snowball',
      description: 'Automatically pay extra toward smallest debt first',
      difficulty: 'beginner',
      category: 'Debt',
      estimatedTime: '8 min'
    },
    {
      id: '3',
      name: 'Tax Loss Harvesting',
      description: 'Automatically sell losing investments to offset gains',
      difficulty: 'advanced',
      category: 'Investment',
      estimatedTime: '15 min'
    }
  ];

  // Mock leaderboard data
  const leaderboard = [
    { rank: 1, name: 'Sarah Chen', automations: 12, efficiency: 98 },
    { rank: 2, name: 'Mike Rodriguez', automations: 10, efficiency: 96 },
    { rank: 3, name: 'Emma Thompson', automations: 9, efficiency: 94 },
    { rank: 4, name: 'David Kim', automations: 8, efficiency: 92 },
    { rank: 5, name: 'Lisa Wang', automations: 7, efficiency: 90 }
  ];

  // Mock automation activities
  const automationActivities = [
    { time: '2 min ago', action: 'Smart Budget Allocation completed successfully', status: 'success' },
    { time: '15 min ago', action: 'Investment Rebalancing triggered', status: 'info' },
    { time: '1 hour ago', action: 'Expense Categorization paused by user', status: 'warning' },
    { time: '2 hours ago', action: 'New automation "Tax Loss Harvesting" created', status: 'success' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play size={16} className="text-green-400" />;
      case 'paused': return <Pause size={16} className="text-yellow-400" />;
      case 'error': return <AlertTriangle size={16} className="text-red-400" />;
      default: return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-green-500 bg-green-500/10';
      case 'paused': return 'border-yellow-500 bg-yellow-500/10';
      case 'error': return 'border-red-500 bg-red-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-500/20';
      case 'intermediate': return 'text-yellow-400 bg-yellow-500/20';
      case 'advanced': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const toggleAutomation = (id: string) => {
    // Toggle automation status logic would go here
    console.log('Toggling automation:', id);
  };

  return (
    <div className="w-full">
      <DashboardHeader />
      
      <div className="max-w-7xl mx-auto space-y-8 px-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Smart Automation</h2>
            <p className="text-white/70 text-lg">Automate repetitive tasks and workflows to save time and reduce errors</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
              <Plus size={20} />
              New Automation
            </button>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
              <Settings size={20} />
              Settings
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Active Automations</p>
                <p className="text-2xl font-bold text-white">12</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Zap size={24} className="text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Success Rate</p>
                <p className="text-2xl font-bold text-white">96.2%</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <TrendingUp size={24} className="text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Time Saved</p>
                <p className="text-2xl font-bold text-white">24.5h</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Clock size={24} className="text-purple-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Money Saved</p>
                <p className="text-2xl font-bold text-white">$2,847</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <CheckCircle size={24} className="text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Automations */}
        <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-6">Active Automations</h3>
          <div className="space-y-4">
            {activeAutomations.map((automation) => (
              <div
                key={automation.id}
                className={`p-4 rounded-xl border ${getStatusColor(automation.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      {getStatusIcon(automation.status)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{automation.name}</h4>
                      <p className="text-white/70 text-sm">{automation.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-white/60 text-xs">Success Rate</p>
                      <p className="text-white font-semibold">{automation.successRate}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/60 text-xs">Last Run</p>
                      <p className="text-white text-sm">{automation.lastRun}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleAutomation(automation.id)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                      >
                        {automation.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                        <Edit3 size={16} />
                      </button>
                      <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Automations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-6">Suggested Automations</h3>
            <div className="space-y-4">
              {automationRecipes.map((recipe) => (
                <div key={recipe.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">{recipe.name}</h4>
                      <p className="text-white/70 text-sm mb-3">{recipe.description}</p>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(recipe.difficulty)}`}>
                          {recipe.difficulty}
                        </span>
                        <span className="text-white/60 text-xs">{recipe.category}</span>
                        <span className="text-white/60 text-xs">{recipe.estimatedTime}</span>
                      </div>
                    </div>
                    <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">
                      Create
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-6">Automation Leaderboard</h3>
            <div className="space-y-4">
              {leaderboard.map((user) => (
                <div key={user.rank} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      user.rank === 1 ? 'bg-yellow-500 text-black' :
                      user.rank === 2 ? 'bg-gray-400 text-black' :
                      user.rank === 3 ? 'bg-amber-600 text-white' :
                      'bg-white/10 text-white'
                    }`}>
                      {user.rank}
                    </div>
                    <span className="text-white font-medium">{user.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm">{user.automations} automations</p>
                    <p className="text-white/60 text-xs">{user.efficiency}% efficiency</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Build Your Own Automation */}
        <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Plus size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Build Your Own Automation</h3>
                <p className="text-white/60 text-sm">Create custom automations with plain English</p>
              </div>
            </div>
            <button 
              onClick={() => setShowBuilder(!showBuilder)}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              {showBuilder ? 'Hide Builder' : 'Open Builder'}
            </button>
          </div>

          {showBuilder && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-white mb-4">Common Patterns</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left text-white/80 hover:text-white text-sm p-2 rounded hover:bg-white/10 transition-all">
                      If spending {'>'} $X, then alert
                    </button>
                    <button className="w-full text-left text-white/80 hover:text-white text-sm p-2 rounded hover:bg-white/10 transition-all">
                      If income {'>'} $X, then invest 20%
                    </button>
                    <button className="w-full text-left text-white/80 hover:text-white text-sm p-2 rounded hover:bg-white/10 transition-all">
                      If budget exceeded, then pause spending
                    </button>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-white mb-4">Custom Automation</h4>
                  <textarea
                    placeholder="Describe your automation in plain English..."
                    className="w-full h-32 bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                  <button className="mt-3 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">
                    Create Automation
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
          <div className="space-y-3">
            {automationActivities.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-400' :
                  activity.status === 'warning' ? 'bg-yellow-400' :
                  'bg-blue-400'
                }`} />
                <span className="text-white/60 text-sm">{activity.time}</span>
                <span className="text-white text-sm">{activity.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartAutomation;
