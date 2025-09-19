import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Music,
  Headphones,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  CheckCircle,
  RefreshCw,
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  User,
  Settings,
  LogOut,
  Plus,
  MessageCircle,
  Send,
  Loader2,
  X
} from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';

interface Message {
  role: 'user' | 'djzen';
  content: string;
  timestamp: string;
}

const SpotifyIntegrationDashboard = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'djzen',
      content: "Hey there! I'm DJ Zen, your musical wellness companion. How are you feeling today? Let me curate the perfect soundtrack for your mood! 🎵",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [currentTrack, setCurrentTrack] = useState({
    name: "Lo-fi Study Beats",
    artist: "Chill Vibes Collective",
    album: "Focus & Flow",
    albumArt: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center",
    duration: 180,
    progress: 45,
    isPlaying: true
  });
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);

  const handleSpotifyLogin = async () => {
    setIsLoading(true);
    // Simulate OAuth flow
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
    }, 2000);
  };

  const togglePlayPause = () => {
    setCurrentTrack(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoadingMessage(true);

    // Simulate DJ Zen's response
    setTimeout(() => {
      const responses = [
        "I feel that energy! Let me create a playlist that matches your vibe perfectly. 🎶",
        "That's exactly what I needed to hear! Here's a curated mix just for you! ✨",
        "I love your honesty! Music has the power to transform any mood. Let's find your perfect sound! 🎵",
        "Your feelings are valid, and I'm here to help you process them through music! 🎧",
        "That's beautiful! Let me craft something special that speaks to your soul! 🌟",
        "I understand completely! Music is the universal language of emotions. Here's your soundtrack! 🎼"
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const djzenMessage: Message = {
        role: 'djzen',
        content: randomResponse,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, djzenMessage]);
      setIsLoadingMessage(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const [activeView, setActiveView] = useState('overview');

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
                      Spotify Integration
                    </motion.h2>
        <motion.p 
                      initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-white/60 text-sm mb-3"
        >
          Your AI-powered musical companion for emotional wellness and financial focus
        </motion.p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                      {[
                        { icon: Music, title: "Connect Spotify", desc: "Link your Spotify account", color: "from-green-500 to-emerald-500", view: "connect" },
                        { icon: Play, title: "Music Player", desc: "Control your music playback", color: "from-blue-500 to-cyan-500", view: "player" },
                        { icon: Heart, title: "Mood Playlists", desc: "Music for your emotions", color: "from-purple-500 to-violet-500", view: "mood" },
                        { icon: Target, title: "Focus Music", desc: "Productivity-enhancing tracks", color: "from-orange-500 to-yellow-500", view: "focus" },
                        { icon: TrendingUp, title: "Music Analytics", desc: "Track your listening habits", color: "from-red-500 to-pink-500", view: "analytics" },
                        { icon: MessageCircle, title: "Chat with DJ Zen", desc: "AI music companion", color: "from-indigo-500 to-purple-500", view: "chat" }
                      ].map((item, index) => (
        <motion.button
                          key={item.title}
                          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          onClick={() => setActiveView(item.view)}
                          className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-green-500/10"
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
              ) : activeView === 'connect' ? (
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
                    <h2 className="text-xl font-bold text-white">Connect Your Spotify Account</h2>
      </div>

        <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Music size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Spotify Account</h2>
                <p className="text-white/80">Connect your Spotify for seamless music control</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isConnected ? (
                <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full">
                  <CheckCircle size={20} className="text-green-400" />
                  <span className="text-green-400 font-semibold">Connected</span>
                </div>
              ) : (
                <button
                  onClick={handleSpotifyLogin}
                  disabled={isLoading}
                  className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Music size={20} />
                      Connect Spotify
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
                </motion.div>
              ) : activeView === 'player' ? (
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
                    <h2 className="text-xl font-bold text-white">Music Player</h2>
                  </div>
                  
        {isConnected && (
          <div className="bg-gradient-to-br from-purple-600 to-pink-700 rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Now Playing</h2>
            <div className="flex items-center gap-6">
              <img 
                src={currentTrack.albumArt} 
                alt="Album Art" 
                className="w-24 h-24 rounded-lg shadow-lg"
              />
              <div className="flex-1">
                <h4 className="text-xl font-bold text-white">{currentTrack.name}</h4>
                <p className="text-white/80">{currentTrack.artist}</p>
                <p className="text-white/60 text-sm">{currentTrack.album}</p>
              </div>
              <div className="flex items-center gap-4">
                <button className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  <SkipBack size={24} />
                </button>
                <button 
                  onClick={togglePlayPause}
                  className="p-4 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all duration-200"
                >
                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <button className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  <SkipForward size={24} />
                </button>
              </div>
            </div>
                </div>
                  )}
                </motion.div>
              ) : activeView === 'chat' ? (
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
                    <h2 className="text-xl font-bold text-white">Chat with DJ Zen</h2>
            </div>

                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <div className="h-96 overflow-y-auto p-4 space-y-4 bg-white/5 rounded-lg mb-4">
                      {messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-green-600 text-white'
                              : 'bg-white/10 text-white border border-white/20'
                          }`}>
                            <div className="whitespace-pre-wrap">{message.content}</div>
                            <div className="text-xs opacity-60 mt-2">
                              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
                        </motion.div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask DJ Zen about music..."
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-green-500"
                        disabled={isLoadingMessage}
                      />
                      <button
                        onClick={() => sendMessage(input)}
                        disabled={isLoadingMessage || !input.trim()}
                        className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
                      >
                        <Send className="w-5 h-5" />
            </button>
          </div>
            </div>
                </motion.div>
              ) : activeView === 'mood' ? (
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
                    <h2 className="text-xl font-bold text-white">Mood Playlists</h2>
          </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Current Mood</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Energy Level</span>
                          <span className="text-green-400 font-medium">High</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Stress Level</span>
                          <span className="text-yellow-400 font-medium">Low</span>
            </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Focus State</span>
                          <span className="text-blue-400 font-medium">Enhanced</span>
          </div>
        </div>
      </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Recommended Playlists</h3>
                      <div className="space-y-3">
                        <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                          <h4 className="text-white font-medium">High Energy Focus</h4>
                          <p className="text-white/70 text-sm">Perfect for budget planning sessions</p>
                        </div>
                        <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                          <h4 className="text-white font-medium">Calm Confidence</h4>
                          <p className="text-white/70 text-sm">Ideal for investment decisions</p>
                </div>
                </div>
              </div>
            </div>
                </motion.div>
              ) : activeView === 'focus' ? (
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
                    <h2 className="text-xl font-bold text-white">Focus Music</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <Target size={24} className="text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">Deep Focus</h3>
                          <p className="text-white/70 text-sm">Complex analysis</p>
                        </div>
                      </div>
                      <p className="text-white/60 text-xs">Instrumental tracks for sustained concentration</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Play size={24} className="text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">Quick Tasks</h3>
                          <p className="text-white/70 text-sm">Routine updates</p>
                        </div>
                      </div>
                      <p className="text-white/60 text-xs">Upbeat tracks for quick financial tasks</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Heart size={24} className="text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">Learning Mode</h3>
                          <p className="text-white/70 text-sm">Education & research</p>
                        </div>
                      </div>
                      <p className="text-white/60 text-xs">Calm music for financial learning</p>
                    </div>
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
                    <h2 className="text-xl font-bold text-white">Music Analytics</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Listening Stats</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Total Playtime</span>
                          <span className="text-green-400 font-medium">47 hours</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Favorite Genre</span>
                          <span className="text-blue-400 font-medium">Lo-fi</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Productivity Boost</span>
                          <span className="text-purple-400 font-medium">+23%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Trending Now</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Ambient Focus</span>
                          <span className="text-green-400 text-sm">+23%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Nature Sounds</span>
                          <span className="text-blue-400 text-sm">+31%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">Binaural Beats</span>
                          <span className="text-purple-400 text-sm">+27%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎵</div>
                    <h3 className="text-xl font-bold text-white mb-2">Feature Coming Soon</h3>
                    <p className="text-white/70">This feature is under development</p>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            {messages.length > 0 && activeView === 'chat' && (
              <div className="mt-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask DJ Zen about music..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-green-500"
                    disabled={isLoadingMessage}
                />
                <button
                  onClick={() => sendMessage(input)}
                    disabled={isLoadingMessage || !input.trim()}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
                >
                    <Send className="w-5 h-5" />
                </button>
                </div>
              </div>
            )}
            </div>
        </div>
    </div>
    </>
  );
};

export default SpotifyIntegrationDashboard; 