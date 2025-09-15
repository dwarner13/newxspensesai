import React, { useState, useEffect } from 'react';
import { Bot, Target, TrendingUp, Calendar, CheckCircle, Clock, Star, Zap } from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';

interface Goal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status: 'active' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
}

interface LearningMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  date: string;
}

const AIGoalConcierge = () => {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);

  // Ensure page starts at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goals: Goal[] = [
    {
      id: '1',
      title: 'Emergency Fund',
      description: 'Build a 6-month emergency fund',
      targetAmount: 15000,
      currentAmount: 8500,
      deadline: '2024-12-31',
      status: 'active',
      priority: 'high'
    },
    {
      id: '2',
      title: 'Vacation Fund',
      description: 'Save for dream vacation',
      targetAmount: 5000,
      currentAmount: 3200,
      deadline: '2024-08-15',
      status: 'active',
      priority: 'medium'
    },
    {
      id: '3',
      title: 'Investment Portfolio',
      description: 'Start building investment portfolio',
      targetAmount: 10000,
      currentAmount: 10000,
      deadline: '2024-06-30',
      status: 'completed',
      priority: 'high'
    }
  ];

  const learningMilestones: LearningMilestone[] = [
    {
      id: '1',
      title: 'Budgeting Basics',
      description: 'Learn fundamental budgeting principles',
      completed: true,
      date: '2024-01-15'
    },
    {
      id: '2',
      title: 'Investment Fundamentals',
      description: 'Understand basic investment concepts',
      completed: true,
      date: '2024-02-20'
    },
    {
      id: '3',
      title: 'Tax Optimization',
      description: 'Learn tax-efficient strategies',
      completed: false,
      date: '2024-04-15'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'overdue': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pt-32">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-1">
          Welcome to Goalie's Goals Setting Session
        </h2>
        <p className="text-white/60 text-sm mb-3">
          Your intelligent guide to setting, tracking, and achieving your financial goals
        </p>
      </div>

      <div className="space-y-8">
        {/* Goalie AI Assistant */}
        <section className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Goalie AI</h3>
                <p className="text-white/60 text-sm">Your personal goal-setting coach</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">AI Active</span>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <p className="text-white/80 text-sm mb-3">
              "Hi! I'm Goalie, your AI goal-setting assistant. I can help you create smart financial goals, 
              track your progress, and provide personalized strategies to achieve them faster. What would you like to work on today?"
            </p>
            <div className="flex gap-2">
              <button className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                Chat with Goalie
              </button>
              <button className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                Get Goal Suggestions
              </button>
            </div>
          </div>
        </section>

        {/* AI-Powered Goal Management */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">AI-Powered Goal Management</h2>
              <p className="text-white/60 text-sm">Let Goalie help you set and achieve your financial goals</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
              >
                <Target size={16} />
                <span>Create Goal</span>
              </button>
              <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
                <Zap size={16} />
                <span>AI Suggestions</span>
              </button>
            </div>
          </div>

          {/* Goalie's Insights */}
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-purple-400 font-semibold text-sm mb-1">🎯 Goalie's Analysis</div>
                <p className="text-white/80 text-sm leading-relaxed mb-2">
                  "You're making great progress! Your Emergency Fund is 57% complete. I suggest increasing your monthly contribution by $200 to reach your goal 2 months early."
                </p>
                <div className="flex gap-2">
                  <button className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded px-3 py-1 text-xs transition-colors">
                    Get Strategy
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 text-white rounded px-3 py-1 text-xs transition-colors">
                    Adjust Goal
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
                onClick={() => setSelectedGoal(goal.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">{goal.title}</h3>
                  <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(goal.status)} bg-white/10`}>
                    {goal.status}
                  </div>
                </div>
                
                <p className="text-white/70 text-sm mb-4">{goal.description}</p>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/60">Progress</span>
                      <span className="text-white">{getProgressPercentage(goal.currentAmount, goal.targetAmount).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                        style={{ width: `${getProgressPercentage(goal.currentAmount, goal.targetAmount)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Current</span>
                    <span className="text-white">${goal.currentAmount.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Target</span>
                    <span className="text-white">${goal.targetAmount.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Deadline</span>
                    <span className="text-white">{new Date(goal.deadline).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Priority</span>
                    <span className={`${getPriorityColor(goal.priority)} capitalize`}>{goal.priority}</span>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded px-2 py-1 text-xs transition-colors">
                      Ask Goalie
                    </button>
                    <button className="bg-white/10 hover:bg-white/20 text-white rounded px-2 py-1 text-xs transition-colors">
                      Update
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions Section */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-white font-semibold text-sm">Smart Goal Creation</h3>
              </div>
              <p className="text-white/60 text-xs mb-3">Let Goalie analyze your finances and suggest personalized goals</p>
              <button className="w-full bg-green-500 hover:bg-green-600 text-white rounded px-3 py-2 text-xs transition-colors">
                Create Smart Goal
              </button>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-white font-semibold text-sm">Progress Tracking</h3>
              </div>
              <p className="text-white/60 text-xs mb-3">Get AI-powered insights on your goal progress and recommendations</p>
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-2 text-xs transition-colors">
                View Analytics
              </button>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-white font-semibold text-sm">Achievement Rewards</h3>
              </div>
              <p className="text-white/60 text-xs mb-3">Celebrate milestones and unlock achievements with Goalie</p>
              <button className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded px-3 py-2 text-xs transition-colors">
                View Achievements
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGoalConcierge;
