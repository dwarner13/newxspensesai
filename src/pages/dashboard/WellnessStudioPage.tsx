import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Brain, 
  Wind, 
  Activity, 
  Moon, 
  Sun,
  Zap,
  Target,
  BarChart3,
  MessageCircle,
  Users,
  BookOpen,
  Play,
  Pause,
  Timer,
  TrendingUp,
  CheckCircle,
  Star,
  Sparkles
} from 'lucide-react';

export default function WellnessStudioPage() {
  const [activeView, setActiveView] = useState('overview');
  const [messages, setMessages] = useState<any[]>([]);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathCount, setBreathCount] = useState(0);
  const [currentHabit, setCurrentHabit] = useState('');

  // Mock wellness data
  const [wellnessStats] = useState({
    stressLevel: 25,
    mindfulnessScore: 87,
    habitsCompleted: 12,
    breathingSessions: 8,
    sleepQuality: 92,
    moodRating: 8.5
  });

  const [habits] = useState([
    { id: 1, name: 'Morning Meditation', completed: true, streak: 7, icon: Sun, color: 'from-yellow-500 to-orange-500' },
    { id: 2, name: 'Evening Reflection', completed: false, streak: 3, icon: Moon, color: 'from-blue-500 to-purple-500' },
    { id: 3, name: 'Financial Check-in', completed: true, streak: 12, icon: Target, color: 'from-green-500 to-emerald-500' },
    { id: 4, name: 'Gratitude Journal', completed: false, streak: 5, icon: Heart, color: 'from-pink-500 to-rose-500' },
    { id: 5, name: 'Breathing Exercise', completed: true, streak: 4, icon: Wind, color: 'from-cyan-500 to-blue-500' },
    { id: 6, name: 'Digital Detox', completed: false, streak: 2, icon: Brain, color: 'from-purple-500 to-indigo-500' }
  ]);

  const [stories] = useState([
    { id: 1, title: 'My Journey to Financial Peace', content: 'How I transformed my relationship with money through mindfulness...', date: '2024-01-15', mood: 'peaceful' },
    { id: 2, title: 'Breaking the Impulse Spending Cycle', content: 'Learning to pause and breathe before making purchases...', date: '2024-01-12', mood: 'empowered' },
    { id: 3, title: 'Finding Balance in Wealth Building', content: 'The importance of wellness in achieving financial goals...', date: '2024-01-10', mood: 'balanced' }
  ]);

  const breathingExercises = [
    { name: '4-7-8 Breathing', description: 'Inhale 4, hold 7, exhale 8', duration: 60, color: 'from-blue-500 to-cyan-500' },
    { name: 'Box Breathing', description: '4-4-4-4 pattern', duration: 120, color: 'from-green-500 to-emerald-500' },
    { name: 'Calming Breath', description: 'Slow, deep breathing', duration: 180, color: 'from-purple-500 to-pink-500' }
  ];

  return (
    <>
      <div className="max-w-7xl mx-auto p-6 pt-32">
        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px]">
              {activeView === 'overview' ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-2xl">
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl font-bold text-white mb-1"
                    >
                      Welcome to Your Wellness Studio
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-white/60 text-sm mb-3"
                    >
                      Mindful money management, stress reduction, and healthy financial habits
                    </motion.p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                      {[
                        { icon: Heart, title: "Wellness Stories", desc: "Personal financial wellness journeys", color: "from-pink-500 to-rose-500", view: "stories" },
                        { icon: Target, title: "Healthy Habits", desc: "Track mindful financial habits", color: "from-green-500 to-emerald-500", view: "habits" },
                        { icon: Wind, title: "Breathing Exercises", desc: "Calm your mind before decisions", color: "from-blue-500 to-cyan-500", view: "breathing" },
                        { icon: BarChart3, title: "Wellness Analytics", desc: "Track your wellness progress", color: "from-purple-500 to-violet-500", view: "analytics" },
                        { icon: Brain, title: "Mindfulness Tools", desc: "Meditation and reflection guides", color: "from-indigo-500 to-purple-500", view: "mindfulness" },
                        { icon: Activity, title: "Stress Relief", desc: "Manage financial stress effectively", color: "from-orange-500 to-red-500", view: "stress_relief" }
                      ].map((item, index) => (
                        <motion.button
                          key={item.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          onClick={() => setActiveView(item.view)}
                          className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-pink-500/10"
                        >
                          <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                            <p className="text-white/60 text-xs leading-tight">{item.desc}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeView === 'stories' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Wellness Stories</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Personal financial wellness journeys and reflections</p>
                  </div>

                  <div className="space-y-4">
                    {stories.map((story, index) => (
                      <motion.div
                        key={story.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-500/30 to-rose-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Heart className="w-5 h-5 text-pink-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold mb-1">{story.title}</h3>
                            <p className="text-white/70 text-sm mb-2">{story.content}</p>
                            <div className="flex items-center gap-3 text-xs text-white/60">
                              <span>{new Date(story.date).toLocaleDateString()}</span>
                              <span className={`px-2 py-1 rounded-full ${
                                story.mood === 'peaceful' ? 'bg-green-500/20 text-green-400' :
                                story.mood === 'empowered' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {story.mood}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : activeView === 'habits' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Healthy Habits</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Track and improve routines that impact your spending and stress</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {habits.map((habit, index) => (
                      <motion.div
                        key={habit.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 bg-gradient-to-br ${habit.color} rounded-lg flex items-center justify-center`}>
                            <habit.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold">{habit.name}</h3>
                            <p className="text-white/60 text-sm">{habit.streak} day streak</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            habit.completed ? 'bg-green-500' : 'bg-gray-500'
                          }`}>
                            {habit.completed ? (
                              <CheckCircle className="w-4 h-4 text-white" />
                            ) : (
                              <div className="w-3 h-3 bg-white rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70 text-sm">Today</span>
                          <button
                            onClick={() => setCurrentHabit(habit.name)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              habit.completed 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-500/20 text-gray-400 hover:bg-green-500/20 hover:text-green-400'
                            }`}
                          >
                            {habit.completed ? 'Completed' : 'Mark Complete'}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : activeView === 'breathing' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Breathing Exercises</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Quick breathing guides to reset before financial decisions</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {breathingExercises.map((exercise, index) => (
                      <motion.div
                        key={exercise.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300"
                      >
                        <div className={`w-12 h-12 bg-gradient-to-br ${exercise.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                          <Wind className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-white font-semibold text-center mb-2">{exercise.name}</h3>
                        <p className="text-white/70 text-sm text-center mb-3">{exercise.description}</p>
                        <div className="flex items-center justify-between text-xs text-white/60 mb-3">
                          <span>Duration</span>
                          <span>{exercise.duration}s</span>
                        </div>
                        <button
                          onClick={() => setIsBreathing(!isBreathing)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                          {isBreathing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          {isBreathing ? 'Pause' : 'Start'}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : activeView === 'analytics' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Wellness Analytics</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Track your wellness progress and financial mindfulness</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/70 text-sm">Stress Level</p>
                          <p className="text-2xl font-bold text-green-400">{wellnessStats.stressLevel}%</p>
                        </div>
                        <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <Activity className="w-6 h-6 text-green-400" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/70 text-sm">Mindfulness Score</p>
                          <p className="text-2xl font-bold text-blue-400">{wellnessStats.mindfulnessScore}%</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Brain className="w-6 h-6 text-blue-400" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/70 text-sm">Habits Completed</p>
                          <p className="text-2xl font-bold text-purple-400">{wellnessStats.habitsCompleted}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-purple-400" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/70 text-sm">Breathing Sessions</p>
                          <p className="text-2xl font-bold text-cyan-400">{wellnessStats.breathingSessions}</p>
                        </div>
                        <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                          <Wind className="w-6 h-6 text-cyan-400" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/70 text-sm">Sleep Quality</p>
                          <p className="text-2xl font-bold text-indigo-400">{wellnessStats.sleepQuality}%</p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                          <Moon className="w-6 h-6 text-indigo-400" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/70 text-sm">Mood Rating</p>
                          <p className="text-2xl font-bold text-pink-400">{wellnessStats.moodRating}/10</p>
                        </div>
                        <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center">
                          <Heart className="w-6 h-6 text-pink-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : activeView === 'mindfulness' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Mindfulness Tools</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Meditation and reflection guides for financial wellness</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="flex items-center gap-3 p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-white transition-colors">
                      <Brain className="w-5 h-5" />
                      <span>Guided Meditation</span>
                    </button>
                    <button className="flex items-center gap-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-white transition-colors">
                      <BookOpen className="w-5 h-5" />
                      <span>Reflection Journal</span>
                    </button>
                    <button className="flex items-center gap-3 p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-white transition-colors">
                      <Target className="w-5 h-5" />
                      <span>Goal Setting</span>
                    </button>
                    <button className="flex items-center gap-3 p-4 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-lg text-white transition-colors">
                      <Heart className="w-5 h-5" />
                      <span>Gratitude Practice</span>
                    </button>
                  </div>
                </motion.div>
              ) : activeView === 'stress_relief' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Stress Relief</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Manage financial stress effectively with proven techniques</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="flex items-center gap-3 p-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-white transition-colors">
                      <Activity className="w-5 h-5" />
                      <span>Quick Stress Relief</span>
                    </button>
                    <button className="flex items-center gap-3 p-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-white transition-colors">
                      <Zap className="w-5 h-5" />
                      <span>Emergency Calm</span>
                    </button>
                    <button className="flex items-center gap-3 p-4 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg text-white transition-colors">
                      <Sun className="w-5 h-5" />
                      <span>Positive Affirmations</span>
                    </button>
                    <button className="flex items-center gap-3 p-4 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-white transition-colors">
                      <Sparkles className="w-5 h-5" />
                      <span>Mindfulness Reset</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-white/60">Content coming soon! Use the feature boxes to explore.</p>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="px-2 pt-1 pb-0.5 border-t border-white/10 bg-gradient-to-r from-pink-500/5 to-rose-500/5">
              <div className="flex gap-1">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Ask about wellness, mindfulness, stress relief, or healthy habits..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 pr-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent transition-all text-sm"
                    disabled
                  />
                </div>
                <button
                  disabled
                  className="px-2 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg opacity-50 cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
                >
                  <Heart className="w-4 h-4" />
                  <span>Coming Soon</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}



