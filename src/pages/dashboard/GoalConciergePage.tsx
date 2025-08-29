import React, { useState, useRef, useEffect } from 'react';
import { 
  Target, TrendingUp, Brain, Heart, Mic, Volume2, Calendar, 
  DollarSign, PiggyBank, Car, Home, Plane, Gift, Zap, 
  CheckCircle, AlertCircle, Clock, BarChart3, Settings, 
  Plus, Edit, Trash2, Play, Pause, RotateCcw, Star,
  Lightbulb, Users, Award, Trophy, Crown, Sparkles, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationSpacing } from '../../hooks/useNotificationSpacing';
import DashboardHeader from '../../components/ui/DashboardHeader';


interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  type: 'savings' | 'debt' | 'investment' | 'emergency';
  aiComment: string;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  motivation: 'calm' | 'accountability' | 'celebration';
  lastUpdated: string;
}

interface AIPersonality {
  learningDay: number;
  preferredStyle: 'visual' | 'audio' | 'text';
  motivationMode: 'calm' | 'accountability' | 'celebration';
  behaviorPatterns: string[];
  successRate: number;
}

const GoalConciergePage = () => {
  const navigate = useNavigate();
  const { hasNotifications } = useNotificationSpacing();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // State for AI Learning Slider
  const [learningDay, setLearningDay] = useState(45);
  
  // State for Active Goals
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      name: 'Emergency Fund',
      target: 10000,
      current: 6500,
      deadline: '2024-12-31',
      type: 'emergency',
      aiComment: 'Great progress! You save best on Mondays.',
      progress: 65,
      status: 'active',
      motivation: 'calm',
      lastUpdated: '2024-01-15'
    },
    {
      id: '2',
      name: 'Vacation Fund',
      target: 5000,
      current: 1200,
      deadline: '2024-06-30',
      type: 'savings',
      aiComment: 'Adjusted target based on your spending patterns.',
      progress: 24,
      status: 'active',
      motivation: 'celebration',
      lastUpdated: '2024-01-15'
    },
    {
      id: '3',
      name: 'Credit Card Payoff',
      target: 8000,
      current: 3200,
      deadline: '2024-08-31',
      type: 'debt',
      aiComment: 'You respond well to aggressive goals. Keep it up!',
      progress: 40,
      status: 'active',
      motivation: 'accountability',
      lastUpdated: '2024-01-15'
    }
  ]);

  // State for Smart Goal Setter
  const [showGoalSetter, setShowGoalSetter] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [goalAnswers, setGoalAnswers] = useState<{[key: string]: string}>({});

  // State for AI Personality
  const [aiPersonality, setAiPersonality] = useState<AIPersonality>({
    learningDay: 45,
    preferredStyle: 'visual',
    motivationMode: 'calm',
    behaviorPatterns: [
      'Saves aggressively in January',
      'Avoids checking goals on weekends',
      'Responds well to visual progress',
      'Prefers gentle nudges over aggressive reminders'
    ],
    successRate: 78
  });

  // State for Motivational Nudges
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [audioMode, setAudioMode] = useState(false);
  const [celebrationMode, setCelebrationMode] = useState(false);

  // AI Learning Slider Messages
  const getLearningMessage = (day: number) => {
    if (day <= 10) return "Try saving 10% of your income to start building good habits.";
    if (day <= 30) return "You overspend on weekends. Try saving on Mondays instead.";
    if (day <= 60) return "You respond best to visual goals. Here's your progress chart.";
    if (day <= 90) return "When you listen to money podcasts, you hit your targets. Want to schedule one?";
    return "I've learned your patterns. Let me adjust your goals automatically.";
  };

  // Smart Goal Setter AI Questions
  const generateAIQuestions = (goal: string) => {
    const questions = [
      "What's your ideal timeline for this goal?",
      "How flexible are you with the deadline?",
      "What's your current savings rate?",
      "What motivates you most - visual progress, celebrations, or gentle reminders?",
      "Would you like me to create a visual tracker for this goal?"
    ];
    setAiQuestions(questions);
    setCurrentQuestion(0);
  };

  const handleGoalInput = () => {
    if (goalInput.trim()) {
      generateAIQuestions(goalInput);
      setShowGoalSetter(true);
    }
  };

  const handleAnswer = (answer: string) => {
    setGoalAnswers(prev => ({ ...prev, [currentQuestion]: answer }));
    
    if (currentQuestion < aiQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Create the goal based on answers
      createSmartGoal();
    }
  };

  const createSmartGoal = () => {
    const newGoal: Goal = {
      id: Date.now().toString(),
      name: goalInput,
      target: 5000, // Calculate based on answers
      current: 0,
      deadline: '2024-12-31', // Calculate based on answers
      type: 'savings',
      aiComment: 'AI-created goal based on your preferences.',
      progress: 0,
      status: 'active',
      motivation: aiPersonality.motivationMode,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    setGoals(prev => [...prev, newGoal]);
    setShowGoalSetter(false);
    setGoalInput('');
    setGoalAnswers({});
    setCurrentQuestion(0);
  };

  // Motivational Messages
  const motivationalMessages = [
    "You are not your balance. You are your effort.",
    "Every dollar saved is a step toward your dreams.",
    "Progress, not perfection. You're doing great!",
    "Your future self will thank you for today's choices.",
    "Small steps lead to big changes. Keep going!"
  ];

  useEffect(() => {
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    setMotivationalMessage(randomMessage);
  }, []);

  return (
    <>
      {/* Standardized Dashboard Header */}
      <DashboardHeader />

      {/* Scrollable Content Area */}
      <div className={`flex-1 overflow-y-auto p-6 ${hasNotifications ? 'pt-20' : ''}`}>
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Section 1: AI Learning Slider */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center">
                <Brain size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">AI Learning Timeline</h3>
                <p className="text-white/60 text-sm">Watch how your AI coach evolves</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Day 1</span>
                <span className="text-white font-semibold">Day {learningDay}</span>
                <span className="text-white/60 text-sm">Day 90</span>
              </div>
              
              <input
                type="range"
                min="1"
                max="90"
                value={learningDay}
                onChange={(e) => setLearningDay(parseInt(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
              
              <div className="bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-xl p-4 border border-white/20">
                <p className="text-white font-medium">{getLearningMessage(learningDay)}</p>
              </div>
            </div>
          </div>
          
          {/* Section 2: Active Goals Dashboard */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Active Goals</h3>
              <button 
                onClick={() => setShowGoalSetter(true)}
                className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>New Goal</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map((goal) => (
                <div key={goal.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {goal.type === 'emergency' && <AlertCircle size={24} className="text-orange-400" />}
                      {goal.type === 'savings' && <PiggyBank size={24} className="text-green-400" />}
                      {goal.type === 'debt' && <DollarSign size={24} className="text-red-400" />}
                      {goal.type === 'investment' && <TrendingUp size={24} className="text-blue-400" />}
                      <h4 className="text-white font-semibold">{goal.name}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="text-white/60 hover:text-white transition-colors">
                        <Edit size={16} />
                      </button>
                      <button className="text-white/60 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/60">Progress</span>
                        <span className="text-white font-semibold">{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Current</span>
                      <span className="text-white">${goal.current.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Target</span>
                      <span className="text-white">${goal.target.toLocaleString()}</span>
                    </div>
                    
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-white/80 text-sm italic">"{goal.aiComment}"</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Smart Goal Setter Modal */}
          {showGoalSetter && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full mx-4 border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Smart Goal Setter</h3>
                  <button 
                    onClick={() => setShowGoalSetter(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {currentQuestion === 0 ? (
                  <div className="space-y-6">
                    <div>
                      <label className="text-white font-semibold mb-2 block">What's your goal?</label>
                      <input
                        type="text"
                        value={goalInput}
                        onChange={(e) => setGoalInput(e.target.value)}
                        placeholder="e.g., Save for a vacation, Pay off credit card..."
                        className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <button 
                      onClick={handleGoalInput}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-xl font-semibold transition-all duration-200"
                    >
                      Let AI Help Me Set This Goal
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-white font-semibold mb-4">{aiQuestions[currentQuestion]}</h4>
                      <div className="space-y-3">
                        {currentQuestion === 0 && (
                          <>
                            <button onClick={() => handleAnswer('3 months')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">3 months</button>
                            <button onClick={() => handleAnswer('6 months')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">6 months</button>
                            <button onClick={() => handleAnswer('1 year')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">1 year</button>
                            <button onClick={() => handleAnswer('2+ years')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">2+ years</button>
                          </>
                        )}
                        {currentQuestion === 1 && (
                          <>
                            <button onClick={() => handleAnswer('Very flexible')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">Very flexible</button>
                            <button onClick={() => handleAnswer('Somewhat flexible')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">Somewhat flexible</button>
                            <button onClick={() => handleAnswer('Not flexible')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">Not flexible</button>
                          </>
                        )}
                        {currentQuestion === 2 && (
                          <>
                            <button onClick={() => handleAnswer('0-5%')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">0-5% of income</button>
                            <button onClick={() => handleAnswer('5-10%')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">5-10% of income</button>
                            <button onClick={() => handleAnswer('10-20%')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">10-20% of income</button>
                            <button onClick={() => handleAnswer('20%+')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">20%+ of income</button>
                          </>
                        )}
                        {currentQuestion === 3 && (
                          <>
                            <button onClick={() => handleAnswer('Visual progress')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">Visual progress charts</button>
                            <button onClick={() => handleAnswer('Celebrations')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">Celebrations and rewards</button>
                            <button onClick={() => handleAnswer('Gentle reminders')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">Gentle reminders</button>
                          </>
                        )}
                        {currentQuestion === 4 && (
                          <>
                            <button onClick={() => handleAnswer('Yes')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">Yes, create a visual tracker</button>
                            <button onClick={() => handleAnswer('No')} className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-left">No, keep it simple</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Personality & Learning Engine */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <Users size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">AI Personality & Learning</h3>
                <p className="text-white/60 text-sm">Your AI coach's understanding of you</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-white font-semibold">Behavior Patterns</h4>
                <div className="space-y-2">
                  {aiPersonality.behaviorPatterns.map((pattern, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Lightbulb size={16} className="text-yellow-400" />
                      <span className="text-white/80 text-sm">{pattern}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-white font-semibold">Success Metrics</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Success Rate</span>
                    <span className="text-white font-semibold">{aiPersonality.successRate}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full"
                      style={{ width: `${aiPersonality.successRate}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Preferred Style</span>
                    <span className="text-white font-semibold capitalize">{aiPersonality.preferredStyle}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Motivation Mode</span>
                    <span className="text-white font-semibold capitalize">{aiPersonality.motivationMode}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Section 5: Motivational Nudge Center */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <Heart size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Motivational Nudge Center</h3>
                <p className="text-white/60 text-sm">Your daily dose of financial motivation</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-white/20">
                  <p className="text-white font-medium text-lg mb-2">Today's Message</p>
                  <p className="text-white/80 italic">"{motivationalMessage}"</p>
                </div>

                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setAudioMode(!audioMode)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      audioMode 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Mic size={16} />
                    <span>Audio Mode</span>
                  </button>
                  
                  <button 
                    onClick={() => setCelebrationMode(!celebrationMode)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      celebrationMode 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Trophy size={16} />
                    <span>Celebration Mode</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-white font-semibold">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-sm">
                    Record Motivation
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-sm">
                    View Progress
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-sm">
                    Adjust Goals
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all duration-200 text-sm">
                    Get Advice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GoalConciergePage; 