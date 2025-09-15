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

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Header Section */}
      <div className="text-center mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-white mb-4"
        >
          Welcome to DJ Zen's Musical Wellness Studio
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-white/80 text-lg mb-6"
        >
          Your AI-powered musical companion for emotional wellness and financial focus
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setIsChatOpen(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center gap-2 mx-auto"
        >
          <MessageCircle size={20} />
          Chat with DJ Zen
        </motion.button>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Connection Status */}
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

        {/* Now Playing */}
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
                  {currentTrack.isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <button className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  <SkipForward size={24} />
                </button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-white/60 text-sm">{formatTime(currentTrack.progress)}</span>
                <div className="flex-1 bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-300"
                    style={{ width: `${(currentTrack.progress / currentTrack.duration) * 100}%` }}
                  ></div>
                </div>
                <span className="text-white/60 text-sm">{formatTime(currentTrack.duration)}</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-4 mt-4">
              <button 
                onClick={toggleMute}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <div className="flex-1 bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-300"
                  style={{ width: `${volume}%` }}
                ></div>
              </div>
              <span className="text-white/60 text-sm w-12">{volume}%</span>
            </div>
          </div>
        )}

        {/* Financial Focus Playlists */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-2xl p-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <TrendingUp size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Budgeting Beats</h3>
            <p className="text-white/80 text-sm mb-4">Lo-fi music designed for focused financial planning</p>
            <button className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 rounded-xl transition-all duration-200">
              Play Playlist
            </button>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl shadow-2xl p-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <Target size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Goal Setting Grooves</h3>
            <p className="text-white/80 text-sm mb-4">Motivational tracks for achieving financial goals</p>
            <button className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 rounded-xl transition-all duration-200">
              Play Playlist
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-pink-700 rounded-2xl shadow-2xl p-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <Heart size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Stress Relief Sounds</h3>
            <p className="text-white/80 text-sm mb-4">Calming music for financial wellness sessions</p>
            <button className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 rounded-xl transition-all duration-200">
              Play Playlist
            </button>
          </div>
        </div>
      </div>

      {/* DJ Zen Chat Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col"
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Music size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">DJ Zen</h3>
                  <p className="text-white/60 text-sm">Musical Wellness Companion</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    message.role === 'user' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                      : 'bg-white/10 text-white'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
              
              {isLoadingMessage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/10 text-white p-4 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>DJ Zen is crafting your perfect playlist...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 border-t border-white/10">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tell DJ Zen how you're feeling..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoadingMessage}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SpotifyIntegrationDashboard; 