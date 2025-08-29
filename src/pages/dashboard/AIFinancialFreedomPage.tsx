import React, { useState, useEffect } from 'react';
import { Crown, TrendingUp, Target, Zap, Star, CheckCircle, Clock, DollarSign } from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';

interface FreedomMilestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

interface FreedomPath {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  rewards: string[];
}

const AIFinancialFreedomPage = () => {
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  const [showPathBuilder, setShowPathBuilder] = useState(false);

  // Ensure page starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const freedomMilestones: FreedomMilestone[] = [
    {
      id: '1',
      title: 'Debt Freedom',
      description: 'Eliminate all high-interest debt',
      targetDate: '2024-12-31',
      status: 'in-progress',
      priority: 'high'
    },
    {
      id: '2',
      title: 'Emergency Fund',
      description: 'Build 6-month emergency fund',
      targetDate: '2024-08-15',
      status: 'completed',
      priority: 'high'
    },
    {
      id: '3',
      title: 'Investment Portfolio',
      description: 'Start building wealth through investments',
      targetDate: '2025-06-30',
      status: 'pending',
      priority: 'medium'
    }
  ];

  const freedomPaths: FreedomPath[] = [
    {
      id: '1',
      name: 'Debt Avalanche',
      description: 'Pay off debts from highest to lowest interest rate',
      difficulty: 'intermediate',
      estimatedTime: '2-5 years',
      rewards: ['Lower interest payments', 'Faster debt elimination', 'Improved credit score']
    },
    {
      id: '2',
      name: 'FIRE Movement',
      description: 'Financial Independence, Retire Early strategy',
      difficulty: 'advanced',
      estimatedTime: '10-20 years',
      rewards: ['Early retirement', 'Complete financial freedom', 'Lifestyle flexibility']
    },
    {
      id: '3',
      name: 'Passive Income',
      description: 'Build multiple income streams',
      difficulty: 'intermediate',
      estimatedTime: '3-7 years',
      rewards: ['Recurring income', 'Reduced work dependency', 'Financial security']
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20';
      case 'in-progress': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-yellow-400 bg-yellow-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-green-400';
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

  return (
    <div className="w-full">
      <DashboardHeader />
      
      <div className="max-w-7xl mx-auto space-y-8 px-6">
        {/* Freedom Overview */}
        <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl p-6 border border-purple-500/20">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
              <Crown size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Financial Freedom Journey</h2>
              <p className="text-white/80 text-lg">Your path to complete financial independence</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target size={24} className="text-green-400" />
              </div>
              <h3 className="text-white font-semibold mb-1">Freedom Score</h3>
              <p className="text-2xl font-bold text-green-400">78%</p>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={24} className="text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-1">Progress</h3>
              <p className="text-2xl font-bold text-blue-400">3/5</p>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock size={24} className="text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-1">Time to Freedom</h3>
              <p className="text-2xl font-bold text-purple-400">~8 years</p>
            </div>
          </div>
        </div>

        {/* Freedom Milestones */}
        <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Freedom Milestones</h2>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
              Add Milestone
            </button>
          </div>
          
          <div className="space-y-4">
            {freedomMilestones.map((milestone) => (
              <div
                key={milestone.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                onClick={() => setSelectedMilestone(milestone.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">{milestone.title}</h3>
                  <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(milestone.status)}`}>
                    {milestone.status}
                  </div>
                </div>
                
                <p className="text-white/70 text-sm mb-3">{milestone.description}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Target: {new Date(milestone.targetDate).toLocaleDateString()}</span>
                  <span className={`${getPriorityColor(milestone.priority)} capitalize`}>
                    {milestone.priority} priority
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Freedom Paths */}
        <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Freedom Paths</h2>
            <button
              onClick={() => setShowPathBuilder(!showPathBuilder)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Build Custom Path
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {freedomPaths.map((path) => (
              <div key={path.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">{path.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(path.difficulty)}`}>
                    {path.difficulty}
                  </span>
                </div>
                
                <p className="text-white/70 text-sm mb-4">{path.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <Clock size={14} className="text-white/60 mr-2" />
                    <span className="text-white/60">Time:</span>
                    <span className="text-white ml-1">{path.estimatedTime}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-white/80 text-sm font-medium">Rewards:</h4>
                  {path.rewards.map((reward, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <Star size={12} className="text-yellow-400 mr-2" />
                      <span className="text-white/70">{reward}</span>
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors text-sm">
                  Start Path
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* AI Freedom Coach */}
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-6 border border-green-500/20">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <Zap size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Freedom Coach</h2>
              <p className="text-white/80">Get personalized guidance on your freedom journey</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-3">Today's Focus</h3>
              <p className="text-white/80 text-sm mb-3">
                Based on your current financial situation, focus on increasing your emergency fund contribution by 20%.
              </p>
              <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">
                Get Details
              </button>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-3">Next Milestone</h3>
              <p className="text-white/80 text-sm mb-3">
                You're 85% of the way to debt freedom. Consider a side hustle to accelerate your progress.
              </p>
              <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFinancialFreedomPage;
