import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  SkipBack,
  SkipForward,
  Download,
  Share2,
  Heart,
  MessageCircle,
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  Target,
  Zap,
  Crown,
  Brain,
  Mic,
  Headphones,
  Star,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Upload,
  FileText,
  DollarSign
} from 'lucide-react';

interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  duration: number;
  podcaster: string;
  audioUrl?: string;
}

interface AIPodcaster {
  id: string;
  name: string;
  emoji: string;
  personality: string;
  specialty: string;
  color: string;
}

export default function PersonalPodcastPage() {
  // View state
  const [activeView, setActiveView] = useState('overview');
  const [selectedPodcaster, setSelectedPodcaster] = useState('prime');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Also scroll the dashboard main content if it exists
    const dashboardContent = document.querySelector('.dashboard-main-content');
    if (dashboardContent) {
      dashboardContent.scrollTop = 0;
    }
  }, []);

  // Mock data
  const episodes: PodcastEpisode[] = [
    {
      id: '1',
      title: 'Financial Freedom in 2024',
      description: 'Learn the secrets to achieving financial independence',
      duration: 1800,
      podcaster: 'prime'
    },
    {
      id: '2', 
      title: 'Smart Investment Strategies',
      description: 'Dive deep into modern investment approaches',
      duration: 2100,
      podcaster: 'crystal'
    }
  ];

  const aiPodcasters: AIPodcaster[] = [
    {
      id: 'prime',
      name: 'Prime',
      emoji: '👑',
      personality: 'Motivational Leader',
      specialty: 'Financial Strategy',
      color: 'from-orange-500 to-yellow-500'
    },
    {
      id: 'crystal',
      name: 'Crystal',
      emoji: '💎',
      personality: 'Analytical Expert',
      specialty: 'Data Insights',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkipForward = () => {
    setCurrentTime(Math.min(currentTime + 30, duration));
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
  };

  const getIconForView = (view: string) => {
    switch (view) {
      case 'generate_episode': return <Play className="w-4 h-4" />;
      case 'cheerleaders': return <Heart className="w-4 h-4" />;
      case 'reality_checkers': return <ThumbsDown className="w-4 h-4" />;
      case 'financial_data': return <BarChart3 className="w-4 h-4" />;
      case 'ai_podcasters': return <Users className="w-4 h-4" />;
      case 'audio_studio': return <Mic className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <>
      <div className="dashboard-main-content max-w-7xl mx-auto p-4 md:p-6 pt-20 md:pt-32" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}>
        {/* Main Content */}
        <div className="min-h-[400px]">
          {/* Chat Messages Area */}
          <div className="p-2 space-y-2" style={{ wordBreak: 'normal', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
            {activeView === 'overview' ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-2xl">
                  <h2
                    className="text-xl font-bold text-white mb-1"
                    style={{ wordBreak: 'normal', overflowWrap: 'break-word', whiteSpace: 'normal' }}
                  >
                    Welcome to Your Personal Financial Podcast Studio
                  </h2>
                  <p
                    className="text-white/60 text-sm mb-3"
                  >
                    Your AI-powered entertainment platform where financial advice meets personality
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                    {[
                      { icon: Play, title: "Generate Episode", desc: "Create personalized podcast episodes", color: "from-green-500 to-emerald-500", view: "generate_episode" },
                      { icon: Heart, title: "Meet Cheerleaders", desc: "Your financial motivation team", color: "from-blue-500 to-cyan-500", view: "cheerleaders" },
                      { icon: ThumbsDown, title: "Reality Checkers", desc: "Get honest financial feedback", color: "from-red-500 to-pink-500", view: "reality_checkers" },
                      { icon: BarChart3, title: "Financial Data", desc: "View your spending insights", color: "from-purple-500 to-violet-500", view: "financial_data" },
                      { icon: Users, title: "AI Podcasters", desc: "Meet your 12 AI hosts", color: "from-orange-500 to-yellow-500", view: "ai_podcasters" },
                      { icon: Mic, title: "Audio Studio", desc: "Listen to your episodes", color: "from-indigo-500 to-purple-500", view: "audio_studio" }
                    ].map((item, index) => (
                      <button
                        key={item.title}
                        onClick={() => setActiveView(item.view)}
                        className="group flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[80px] hover:shadow-lg hover:shadow-green-500/10"
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
            ) : activeView === 'generate_episode' ? (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Generate Podcast Episode</h2>
                  <p className="text-white/60">Create personalized financial content</p>
                </div>
                
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white font-medium mb-2">Topic</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Retirement Planning, Investment Strategies..."
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white font-medium mb-2">AI Podcaster</label>
                      <select className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent">
                        <option value="">Select AI Podcaster</option>
                        {aiPodcasters.map(podcaster => (
                          <option key={podcaster.id} value={podcaster.id}>
                            {podcaster.emoji} {podcaster.name} - {podcaster.personality}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-white font-medium mb-2">Episode Length</label>
                      <select className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent">
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                      </select>
                    </div>
                    
                    <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2">
                      <Play className="w-5 h-5" />
                      Generate Episode
                    </button>
                  </div>
                </div>
              </div>
            ) : activeView === 'ai_podcasters' ? (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">AI Podcasters</h2>
                  <p className="text-white/60">Meet your 12 AI hosts</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiPodcasters.map((podcaster, index) => (
                    <div
                      key={podcaster.id}
                      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-300"
                    >
                      <div className="text-center">
                        <div className={`w-16 h-16 bg-gradient-to-br ${podcaster.color} rounded-xl flex items-center justify-center text-2xl mx-auto mb-3`}>
                          {podcaster.emoji}
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">{podcaster.name}</h3>
                        <p className="text-white/60 text-sm mb-2">{podcaster.personality}</p>
                        <p className="text-white/40 text-xs">{podcaster.specialty}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeView === 'audio_studio' ? (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Audio Studio</h2>
                  <p className="text-white/60">Listen to your episodes</p>
                </div>
                
                <div className="space-y-3">
                  {episodes.map((episode) => {
                    const podcaster = aiPodcasters.find(p => p.id === episode.podcaster);
                    return (
                      <div key={episode.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{podcaster?.emoji}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-white">{episode.title}</h3>
                              <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded-full">
                                {formatTime(episode.duration)}
                              </span>
                            </div>
                            <p className="text-white/60 text-sm mb-3">{episode.description}</p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setCurrentEpisode(episode)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition-all duration-200"
                              >
                                <Play className="w-4 h-4" />
                                Play
                              </button>
                              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200">
                                <Download className="w-4 h-4" />
                                Download
                              </button>
                              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200">
                                <Share2 className="w-4 h-4" />
                                Share
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/60">Content coming soon! Use the feature boxes to explore.</p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="px-2 pt-1 pb-0.5 border-t border-white/10 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
            <div className="flex gap-1">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Ask about podcast generation, AI hosts, or financial insights..."
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 pr-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all text-sm"
                  disabled
                />
              </div>
              <button
                disabled
                className="px-2 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg opacity-50 cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Coming Soon</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Player */}
      {currentEpisode && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-white/10 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="w-12 h-12 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              
              <div className="flex-1">
                <h4 className="text-white font-medium">{currentEpisode.title}</h4>
                <p className="text-white/70 text-sm">{currentEpisode.description}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-sm">{formatTime(currentTime)}</span>
                <div className="w-32 bg-white/20 rounded-full h-1">
                  <div 
                    className="bg-green-400 h-1 rounded-full" 
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  ></div>
                </div>
                <span className="text-white/70 text-sm">{formatTime(duration)}</span>
                <button onClick={handleSkipForward} className="p-2 hover:bg-white/10 rounded-lg text-white">
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={handleMute} className="p-2 hover:bg-white/10 rounded-lg text-white">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="w-16 bg-white/20 rounded-full h-1">
                  <div 
                    className="bg-green-400 h-1 rounded-full" 
                    style={{ width: `${isMuted ? 0 : volume}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}