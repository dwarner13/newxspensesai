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
    <div className="w-full">
      <DashboardHeader />
      
      <div className="max-w-7xl mx-auto space-y-8 px-6">
        {/* AI Learning Timeline */}
        <section className="ai-timeline-section">
          <div className="timeline-header">
            <div className="ai-coach-info">
              <div className="ai-coach-avatar">
                <Bot size={24} />
              </div>
              <div className="coach-details">
                <h3>AI Learning Timeline</h3>
                <div className="coach-status">
                  <div className="online-indicator"></div>
                  <span>Watch how your AI coach evolves</span>
                </div>
              </div>
            </div>
            <button className="timeline-toggle">
              <TrendingUp size={20} />
              <span>View Progress</span>
            </button>
          </div>
          
          <div className="timeline-content">
            <div className="timeline-track">
              {learningMilestones.map((milestone, index) => (
                <div key={milestone.id} className="timeline-item">
                  <div className={`timeline-marker ${milestone.completed ? 'completed' : ''}`}>
                    {milestone.completed ? <CheckCircle size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="timeline-content">
                    <h4 className="timeline-title">{milestone.title}</h4>
                    <p className="timeline-description">{milestone.description}</p>
                    <span className="timeline-date">{milestone.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Financial Goals */}
        <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Your Financial Goals</h2>
            <button
              onClick={() => setShowGoalForm(!showGoalForm)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Target size={16} />
              <span>Add Goal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
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
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGoalConcierge;
