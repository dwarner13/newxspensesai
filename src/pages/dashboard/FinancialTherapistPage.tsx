import { useState, useEffect } from 'react';
import { 
  Heart, 
  Brain, 
  MessageCircle, 
  Users, 
  Target, 
  BarChart3,
  BookOpen,
  Play,
  Shield,
  Star,
  Coffee,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Smile,
  Frown,
  Meh
} from 'lucide-react';

export default function FinancialTherapistPage() {
  const [activeView, setActiveView] = useState('overview');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock therapist data
  const [therapists] = useState([
    { id: 'dr-sarah', name: 'Dr. Sarah Chen', specialty: 'Financial Anxiety', emoji: '🧘‍♀️', color: 'from-blue-500 to-cyan-500' },
    { id: 'dr-marcus', name: 'Dr. Marcus Williams', specialty: 'Money Psychology', emoji: '🧠', color: 'from-purple-500 to-pink-500' },
    { id: 'dr-elena', name: 'Dr. Elena Rodriguez', specialty: 'Spending Habits', emoji: '💝', color: 'from-green-500 to-emerald-500' },
    { id: 'dr-james', name: 'Dr. James Thompson', specialty: 'Investment Psychology', emoji: '📈', color: 'from-orange-500 to-yellow-500' }
  ]);

  const [wellnessJourney] = useState({
    sessionsCompleted: 12,
    stressReduction: 35,
    confidenceScore: 78,
    goalsAchieved: 8,
    currentStreak: 5});

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toLocaleString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage = {
        role: 'assistant',
        content: `I understand you're feeling ${content.toLowerCase().includes('anxiety') ? 'anxious' : 'concerned'} about your financial situation. Let's work through this together. What specific aspect would you like to explore?`,
        timestamp: new Date().toLocaleString()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

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
                    <h2
                      className="text-xl font-bold text-white mb-1"
                    >
                      Welcome to Your Financial Therapist
                    </h2>
                    <p
                      className="text-white/60 text-sm mb-3"
                    >
                      Professional financial therapy and emotional support for your money journey
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                      {[
                        { icon: Heart, title: "Therapy Sessions", desc: "One-on-one financial therapy", color: "from-pink-500 to-rose-500", view: "sessions" },
                        { icon: Brain, title: "AI Therapists", desc: "Meet your therapy team", color: "from-blue-500 to-cyan-500", view: "therapists" },
                        { icon: Target, title: "Wellness Journey", desc: "Track your emotional progress", color: "from-green-500 to-emerald-500", view: "journey" },
                        { icon: BarChart3, title: "Therapy Analytics", desc: "Monitor your mental health", color: "from-purple-500 to-violet-500", view: "analytics" },
                        { icon: BookOpen, title: "Resources", desc: "Educational therapy materials", color: "from-indigo-500 to-purple-500", view: "resources" },
                        { icon: Shield, title: "Crisis Support", desc: "Emergency financial therapy", color: "from-orange-500 to-red-500", view: "crisis" }
                      ].map((item, index) => (
                        <button
                          key={item.title}
                          onClick={() => setActiveView(item.view)}
                          className="group flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[80px] hover:shadow-lg hover:shadow-pink-500/10"
                        >
                          <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-semibold text-white mb-0.5">{item.title}</h3>
                            <p className="text-white/60 text-xs leading-tight">{item.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeView === 'therapists' ? (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Meet Your AI Therapists</h2>
                    <p className="text-white/60">Professional financial therapy team</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {therapists.map((therapist, index) => (
                      <div
                        key={therapist.id}
                        className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="text-4xl">{therapist.emoji}</div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{therapist.name}</h3>
                            <p className="text-white/70 text-sm">{therapist.specialty}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-white/80">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span>Available for sessions</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-white/80">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span>Specialized in financial psychology</span>
                          </div>
                        </div>
                        <button className="w-full mt-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200">
                          Start Session
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeView === 'journey' ? (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Your Wellness Journey</h2>
                    <p className="text-white/60">Track your emotional and financial progress</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center">
                      <div className="text-2xl font-bold text-white mb-1">{wellnessJourney.sessionsCompleted}</div>
                      <div className="text-white/70 text-sm">Sessions Completed</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center">
                      <div className="text-2xl font-bold text-green-400 mb-1">{wellnessJourney.stressReduction}%</div>
                      <div className="text-white/70 text-sm">Stress Reduction</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400 mb-1">{wellnessJourney.confidenceScore}</div>
                      <div className="text-white/70 text-sm">Confidence Score</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400 mb-1">{wellnessJourney.currentStreak}</div>
                      <div className="text-white/70 text-sm">Day Streak</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
                    <p className="text-white/60">This feature is under development</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Input Area */}
            <div className="px-2 pt-1 pb-0.5 border-t border-white/10 bg-gradient-to-r from-pink-500/5 to-purple-500/5">
              <div className="flex gap-1">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                    placeholder="Ask about therapy, emotional support, or financial wellness..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 pr-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent transition-all text-sm"
                    disabled={isLoading}
                  />
                </div>
                <button
                  onClick={() => !isLoading && sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="px-2 py-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}