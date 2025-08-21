import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Target, 
  Plus, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Zap,
  Brain,
  Lightbulb,
  Clock,
  CheckCircle,
  AlertCircle,
  Crown,
  Bot,
  ArrowRight,
  Sparkles,
  Eye,
  BarChart3
} from 'lucide-react';
import './AIGoalConcierge.css';

interface Goal {
  id: string;
  title: string;
  type: 'emergency' | 'vacation' | 'debt' | 'investment' | 'custom';
  currentAmount: number;
  targetAmount: number;
  progress: number;
  status: 'ai-optimized' | 'learning' | 'urgent-focus';
  lastAnalysis: string;
  predictedCompletion: string;
  aiMessage: string;
  suggestions: string[];
  icon: string;
  color: string;
}

interface Milestone {
  id: string;
  day: number;
  title: string;
  description: string;
  isCurrent: boolean;
  progress?: number;
}

interface BehaviorInsight {
  id: string;
  icon: string;
  text: string;
  confidence: number;
}

interface SuccessMetric {
  label: string;
  value: string;
}

const AIGoalConcierge: React.FC = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [behaviorInsights, setBehaviorInsights] = useState<BehaviorInsight[]>([]);
  const [successMetrics, setSuccessMetrics] = useState<SuccessMetric[]>([]);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = () => {
    // Initialize goals
    const initialGoals: Goal[] = [
      {
        id: '1',
        title: 'Emergency Fund',
        type: 'emergency',
        currentAmount: 6500,
        targetAmount: 10000,
        progress: 65,
        status: 'ai-optimized',
        lastAnalysis: 'Updated 5 min ago',
        predictedCompletion: 'March 15, 2024',
        aiMessage: "Great progress! You save best on Mondays. Your next $500 deposit should hit the goal 2 weeks early.",
        suggestions: ['Auto-save coffee money', 'Schedule weekly deposit'],
        icon: '🚨',
        color: 'linear-gradient(135deg, #f59e0b, #d97706)'
      },
      {
        id: '2',
        title: 'Vacation Fund',
        type: 'vacation',
        currentAmount: 1200,
        targetAmount: 5000,
        progress: 24,
        status: 'learning',
        lastAnalysis: 'Updated 1 hour ago',
        predictedCompletion: 'August 20, 2024',
        aiMessage: "Adjusted target based on your spending patterns. You're doing great - stay consistent!",
        suggestions: ['Set milestone rewards', 'Increase by $50/month'],
        icon: '🏖️',
        color: 'linear-gradient(135deg, #10b981, #059669)'
      },
      {
        id: '3',
        title: 'Credit Card Payoff',
        type: 'debt',
        currentAmount: 3200,
        targetAmount: 8000,
        progress: 40,
        status: 'urgent-focus',
        lastAnalysis: 'Updated 30 min ago',
        predictedCompletion: 'November 10, 2024',
        aiMessage: "You respond well to aggressive goals. Keep it up! Interest saved: $347 so far.",
        suggestions: ['Accelerate payments', 'Track interest saved'],
        icon: '💳',
        color: 'linear-gradient(135deg, #ef4444, #dc2626)'
      }
    ];

    // Initialize milestones
    const initialMilestones: Milestone[] = [
      {
        id: '1',
        day: 1,
        title: 'Learning Starts',
        description: 'Getting to know your financial habits',
        isCurrent: false
      },
      {
        id: '2',
        day: 45,
        title: 'Current Learning Stage',
        description: 'Understanding your spending patterns',
        isCurrent: true,
        progress: 67
      },
      {
        id: '3',
        day: 90,
        title: 'Advanced Coaching',
        description: 'Predictive insights and recommendations',
        isCurrent: false
      }
    ];

    // Initialize behavior insights
    const initialInsights: BehaviorInsight[] = [
      {
        id: '1',
        icon: '💪',
        text: 'Saves aggressively in January',
        confidence: 95
      },
      {
        id: '2',
        icon: '📱',
        text: 'Avoids checking goals on weekends',
        confidence: 87
      },
      {
        id: '3',
        icon: '🎯',
        text: 'Responds well to visual progress',
        confidence: 92
      },
      {
        id: '4',
        icon: '🔔',
        text: 'Prefers gentle nudges',
        confidence: 78
      }
    ];

    // Initialize success metrics
    const initialMetrics: SuccessMetric[] = [
      { label: 'Success Rate', value: '78%' },
      { label: 'Preferred Style', value: 'Visual' },
      { label: 'Motivation Mode', value: 'Calm' },
      { label: 'Best Save Day', value: 'Monday' }
    ];

    setGoals(initialGoals);
    setMilestones(initialMilestones);
    setBehaviorInsights(initialInsights);
    setSuccessMetrics(initialMetrics);
  };

  const handleNewGoal = () => {
    setShowNewGoalModal(true);
    toast.success('Goal creation coming soon!');
  };

  const handleQuickAdd = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      toast.success(`Quick add for ${goal.title} coming soon!`);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    toast.success(`Implementing: ${suggestion}`);
  };

  const handleAskCoach = () => {
    toast.success('AI Coach chat coming soon!');
  };

  const handleSeeScenarios = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      toast.success(`Scenarios for ${goal.title} coming soon!`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'ai-optimized': { text: 'AI Optimized', color: 'bg-green-500/20 text-green-400' },
      'learning': { text: 'Learning', color: 'bg-blue-500/20 text-blue-400' },
      'urgent-focus': { text: 'Urgent Focus', color: 'bg-red-500/20 text-red-400' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.learning;
    
    return (
      <span className={`${config.color} text-xs font-semibold px-2 py-1 rounded-md uppercase`}>
        {config.text}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="ai-goal-concierge">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="main-title">AI Goal Concierge</h1>
            <p className="welcome-subtitle">
              Your intelligent financial coach that learns and adapts to help you achieve every goal
            </p>
          </div>
          <div className="header-right">
            {/* Spotify and profile widgets can be added here */}
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="dashboard-content">
        
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
            <button className="ask-coach-btn" onClick={handleAskCoach}>
              <Brain size={16} />
              Ask Coach
            </button>
          </div>
          
          <div className="learning-timeline">
            <div className="timeline-track"></div>
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className={`timeline-milestone ${milestone.isCurrent ? 'current' : ''}`}>
                <div className={`milestone-marker ${milestone.isCurrent ? 'current' : ''}`}>
                  <span className="day-number">Day {milestone.day}</span>
                </div>
                <div className="milestone-content">
                  <h4>{milestone.title}</h4>
                  <p>{milestone.description}</p>
                  {milestone.progress && (
                    <div className="learning-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${milestone.progress}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">{milestone.progress}% Complete</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="ai-insight-banner">
            <div className="insight-content">
              <Lightbulb size={20} className="insight-icon" />
              <span className="insight-text">
                You respond best to visual goals. Here's your progress chart.
              </span>
            </div>
          </div>
        </section>
        
        {/* Active Goals */}
        <section className="active-goals-section">
          <div className="section-header">
            <h2 className="section-title">Active Goals</h2>
            <button className="new-goal-btn" onClick={handleNewGoal}>
              <Plus size={20} />
              New Goal
            </button>
          </div>
          
          <div className="goals-grid">
            {goals.map((goal) => (
              <div key={goal.id} className="goal-card">
                <div className="goal-header">
                  <div className="goal-icon" style={{ background: goal.color }}>
                    <span className="goal-emoji">{goal.icon}</span>
                    <div className="smart-indicator"></div>
                  </div>
                  <div className="goal-info">
                    <h3 className="goal-title">{goal.title}</h3>
                    <div className="ai-status">
                      {getStatusBadge(goal.status)}
                      <span className="last-analysis">{goal.lastAnalysis}</span>
                    </div>
                  </div>
                  <div className="goal-actions">
                    <button 
                      className="quick-add-btn"
                      onClick={() => handleQuickAdd(goal.id)}
                    >
                      <Plus size={14} />
                      Quick Add
                    </button>
                  </div>
                </div>
                
                <div className="progress-section">
                  <div className="progress-ring">
                    <div 
                      className="progress-circle"
                      style={{
                        background: `conic-gradient(${goal.color} 0deg, ${goal.color} ${goal.progress * 3.6}deg, rgba(255, 255, 255, 0.1) ${goal.progress * 3.6}deg)`
                      }}
                    >
                      <div className="progress-center">
                        <span className="progress-percent">{goal.progress}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="progress-details">
                    <div className="current-amount">{formatCurrency(goal.currentAmount)}</div>
                    <div className="target-amount">of {formatCurrency(goal.targetAmount)}</div>
                    <div className="remaining-amount">
                      {formatCurrency(goal.targetAmount - goal.currentAmount)} to go
                    </div>
                  </div>
                </div>
                
                <div className="coach-message">
                  <div className="coach-avatar-small">
                    <Bot size={16} />
                  </div>
                  <div className="coach-text">{goal.aiMessage}</div>
                </div>
                
                <div className="smart-suggestions">
                  {goal.suggestions.map((suggestion, index) => (
                    <button 
                      key={index}
                      className="suggestion-chip"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <Sparkles size={12} />
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
                
                <div className="prediction-banner">
                  <div className="prediction-text">
                    <Eye size={16} />
                    <span>Predicted completion: {goal.predictedCompletion}</span>
                  </div>
                  <button 
                    className="see-scenarios-btn"
                    onClick={() => handleSeeScenarios(goal.id)}
                  >
                    See Scenarios
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* AI Personality Section */}
        <section className="ai-personality-section">
          <div className="personality-header">
            <div className="ai-avatar-large">
              <Bot size={32} />
              <div className="thinking-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
            <div className="personality-info">
              <h3>AI Personality & Learning</h3>
              <p>Your AI coach's understanding of you</p>
            </div>
          </div>
          
          <div className="learning-grid">
            <div className="behavior-insights">
              <h4>Behavior Patterns</h4>
              <div className="insight-list">
                {behaviorInsights.map((insight) => (
                  <div key={insight.id} className="insight-item">
                    <span className="insight-icon">{insight.icon}</span>
                    <span className="insight-text">{insight.text}</span>
                    <div 
                      className="confidence-dot"
                      style={{ 
                        background: insight.confidence > 90 ? '#10b981' : 
                                   insight.confidence > 80 ? '#f59e0b' : '#ef4444' 
                      }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="success-metrics">
              <h4>Success Metrics</h4>
              <div className="metrics-grid">
                {successMetrics.map((metric, index) => (
                  <div key={index} className="metric-item">
                    <div className="metric-label">{metric.label}</div>
                    <div className="metric-value">{metric.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        
      </div>
    </div>
  );
};

export default AIGoalConcierge;
