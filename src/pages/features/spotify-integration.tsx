import { useState } from 'react';
import { 
  Music, Heart, Crown, Zap, Play, SkipBack, SkipForward, 
  Volume2, RefreshCw, CheckCircle, Headphones
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicRecommendation {
  id: string;
  title: string;
  artist: string;
  mood: string;
  financialTask: string;
  aiReason: string;
  energy: number;
  genre: string;
}

interface AIEmployee {
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  color: string;
  musicStyle: string;
}

export default function SpotifyIntegrationFeaturePage() {
  const [showMusicStudio, setShowMusicStudio] = useState(false);
  const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
  const [playlistProgress, setPlaylistProgress] = useState(0);
  const [selectedMood, setSelectedMood] = useState<string>('motivated');
  const [currentRecommendation, setCurrentRecommendation] = useState<MusicRecommendation | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // AI Music Team
  const aiMusicTeam: AIEmployee[] = [
    {
      name: 'Prime',
      role: 'AI Music Director & Orchestrator',
      avatar: '👑',
      specialty: 'Orchestrates perfect music for every financial moment',
      color: 'from-yellow-400 via-orange-400 to-red-400',
      musicStyle: 'Strategic playlist curation & mood analysis'
    },
    {
      name: 'Crystal',
      role: 'Emotional Music Intelligence',
      avatar: '💎',
      specialty: 'Matches music to your financial emotions and goals',
      color: 'from-purple-500 to-pink-500',
      musicStyle: 'Emotional intelligence & mood-based recommendations'
    },
    {
      name: 'Finley',
      role: 'Financial Focus Music Curator',
      avatar: '💰',
      specialty: 'Creates playlists that enhance financial productivity',
      color: 'from-green-500 to-emerald-500',
      musicStyle: 'Productivity-focused beats & concentration music'
    },
    {
      name: 'Nova',
      role: 'Creative Music Innovation',
      avatar: '🌱',
      specialty: 'Discovers new music trends and innovative soundscapes',
      color: 'from-teal-500 to-cyan-500',
      musicStyle: 'Trend discovery & innovative sound design'
    }
  ];

  // Music Recommendations
  const musicRecommendations: MusicRecommendation[] = [
    {
      id: '1',
      title: 'Focus Flow',
      artist: 'AI Beats Collective',
      mood: 'motivated',
      financialTask: 'Budget Planning',
      aiReason: 'Prime suggests this high-energy track to boost your focus during budget planning',
      energy: 85,
      genre: 'Electronic'
    },
    {
      id: '2',
      title: 'Calm Calculations',
      artist: 'Crystal\'s Soundscapes',
      mood: 'calm',
      financialTask: 'Expense Review',
      aiReason: 'Crystal recommends this soothing track to reduce stress while reviewing expenses',
      energy: 35,
      genre: 'Ambient'
    },
    {
      id: '3',
      title: 'Money Moves',
      artist: 'Finley\'s Fintech',
      mood: 'confident',
      financialTask: 'Investment Analysis',
      aiReason: 'Finley curates this confident track to enhance your investment decision-making',
      energy: 70,
      genre: 'Hip-Hop'
    },
    {
      id: '4',
      title: 'Innovation Vibes',
      artist: 'Nova\'s Network',
      mood: 'creative',
      financialTask: 'Goal Setting',
      aiReason: 'Nova suggests this creative track to inspire innovative financial goal setting',
      energy: 60,
      genre: 'Indie'
    }
  ];

  // Playlist Generation Stages
  const playlistStages = [
    'Analyzing your financial mood...',
    'Scanning your music preferences...',
    'Crystal is matching emotions to beats...',
    'Finley is curating focus tracks...',
    'Nova is adding innovative sounds...',
    'Prime is orchestrating the perfect playlist...',
    'Your AI Music Experience is ready! 🎵'
  ];

  // Demo Functions for Marketing Page
  const handleSpotifyLogin = () => {
    setIsLoading(true);
    // Simulate OAuth flow for demo
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
    }, 2000);
  };

  const generateAIPlaylist = () => {
    setIsGeneratingPlaylist(true);
    setPlaylistProgress(0);
    
    const interval = setInterval(() => {
      setPlaylistProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGeneratingPlaylist(false);
          setCurrentRecommendation(musicRecommendations[Math.floor(Math.random() * musicRecommendations.length)]);
          return 100;
        }
        return prev + 15;
      });
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Prime's Crown Badge */}
          <div className="text-center mb-8">
        <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white px-4 py-2 rounded-full shadow-2xl"
            >
              <Crown size={20} className="mr-2" />
              <span className="font-bold">Prime's AI Music Division</span>
        </motion.div>
          </div>

          {/* Hero Content */}
          <div className="text-center mb-16">
            {/* Urgency Banner */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-full px-6 py-2 mb-8 inline-block"
            >
              <span className="text-red-300 text-sm font-medium">
                🎵 Limited Time: First month FREE for Spotify users
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              Finally, Music That{' '}
              <span className="text-green-400 drop-shadow-lg">
                Actually Gets Your Money
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-white/90 mb-8 max-w-4xl mx-auto leading-relaxed font-medium"
            >
              Stop listening to random playlists while managing your finances. Our AI analyzes your spending patterns and creates the perfect soundtrack for every financial moment - from budget planning to investment decisions.
            </motion.p>

            {/* Social Proof Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap justify-center items-center gap-8 mb-8 text-white/80"
            >
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-green-400" />
                <span className="font-semibold">8,500+ Spotify playlists created</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-400" />
                <span className="font-semibold">94% user satisfaction</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold">3x faster financial tasks</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              {!isConnected ? (
                <button
                  onClick={handleSpotifyLogin}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  {isLoading ? (
                    <>
                      <RefreshCw size={28} className="animate-spin" />
                      <span>Connecting to Spotify...</span>
                    </>
                  ) : (
                    <>
                      <Music size={28} />
                      <span>Get My Free AI Playlist</span>
                      <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full ml-2">
                        FREE
                      </div>
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setShowMusicStudio(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-emerald-500 hover:to-green-500 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                    <Music size={28} />
                    <span>Enter AI Music Studio</span>
                  </button>
                  <button 
                    onClick={generateAIPlaylist}
                    className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-105"
                  >
                    <Zap size={28} />
                    <span>See It In Action</span>
                  </button>
                </>
              )}
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap justify-center items-center gap-6 mt-8 text-white/60 text-sm"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Spotify Premium integration</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span>Your music taste stays private</span>
              </div>
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                <span>Works with your existing playlists</span>
              </div>
            </motion.div>
          </div>

          {/* Testimonials Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-16"
          >
            <h3 className="text-2xl font-bold text-white text-center mb-8">
              🎵 What Spotify Users Are Saying
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Heart key={i} size={16} className="text-red-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/90 mb-4 italic">
                  "I used to hate budgeting because it felt boring. Now I actually look forward to it because the AI creates the perfect playlist for my mood. I've saved $800 this month!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">S</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Sarah M.</p>
                    <p className="text-white/60 text-sm">Spotify Premium User</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Heart key={i} size={16} className="text-red-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/90 mb-4 italic">
                  "The AI knows exactly what music I need when I'm stressed about money. It's like having a personal DJ who understands my financial anxiety. Game changer!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">M</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Mike R.</p>
                    <p className="text-white/60 text-sm">Music Producer</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Heart key={i} size={16} className="text-red-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/90 mb-4 italic">
                  "I'm a financial advisor and I recommend this to all my clients. The music actually helps them stay focused during our sessions. It's incredible!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">J</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Jennifer L.</p>
                    <p className="text-white/60 text-sm">Financial Advisor</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Music Team Showcase */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-16"
          >
            <h3 className="text-2xl font-bold text-white text-center mb-8">
              🎵 Your Personal AI Music Curators
            </h3>
            <p className="text-white/80 text-center mb-8 max-w-3xl mx-auto">
              Meet the AI music experts who understand your financial journey and create the perfect soundtrack for every money moment. No more random playlists - just music that actually enhances your financial productivity.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {aiMusicTeam.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className={`w-16 h-16 bg-gradient-to-r ${member.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <span className="text-2xl">{member.avatar}</span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{member.name}</h4>
                  <p className="text-white/70 text-sm mb-2">{member.role}</p>
                  <p className="text-white/60 text-xs">{member.specialty}</p>
                </motion.div>
              ))}
            </div>
        </motion.div>
        </div>
      </div>

      {/* Spotify Integration Demo */}
      {isConnected && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
          >
            <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
                <CheckCircle size={24} className="text-green-400" />
                <h2 className="text-2xl font-bold text-white">See Your Music & Money Magic in Action</h2>
              </div>
              <p className="text-white/80">Watch as our AI analyzes your financial mood and creates the perfect playlist in real-time. No more guessing what music will help you focus on your money goals.</p>
            </div>
            
            {/* Demo Music Player */}
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Headphones size={20} className="text-green-400" />
                AI-Enhanced Music Experience
              </h3>
              <div className="flex items-center gap-4">
                <img 
                  src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center" 
                  alt="Album Art" 
                  className="w-16 h-16 rounded-lg object-cover shadow-md"
                />
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-white">Focus Flow</h4>
                  <p className="text-white/70 text-sm">AI Beats Collective</p>
                  <p className="text-white/60 text-xs">Perfect for Budget Planning</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-white/70 hover:text-white transition-colors">
                    <SkipBack size={20} />
                  </button>
                  <button className="w-10 h-10 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors">
                    <Play size={16} className="text-white" />
                  </button>
                  <button className="text-white/70 hover:text-white transition-colors">
                    <SkipForward size={20} />
                  </button>
                </div>
              </div>
              
              {/* Volume Control Demo */}
              <div className="flex items-center gap-3 mt-4">
                <Volume2 size={16} className="text-white/70" />
                <div className="flex-1 h-2 bg-white/20 rounded-lg">
                  <div className="h-2 bg-green-400 rounded-lg w-3/4"></div>
                </div>
                <span className="text-white/70 text-sm w-12">75%</span>
              </div>
            </div>

            {/* Demo Playlists */}
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Your AI-Curated Playlists</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: "Financial Focus", tracks: 24, mood: "Productive" },
                  { name: "Budget Beats", tracks: 18, mood: "Motivated" },
                  { name: "Investment Vibes", tracks: 31, mood: "Confident" },
                  { name: "Expense Review", tracks: 15, mood: "Calm" },
                  { name: "Goal Setting", tracks: 22, mood: "Inspired" },
                  { name: "Money Mindfulness", tracks: 19, mood: "Peaceful" }
                ].map((playlist, index) => (
                  <div 
                    key={index}
                    className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&crop=center" 
                        alt="Playlist" 
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm truncate">{playlist.name}</h4>
                        <p className="text-white/60 text-xs">{playlist.tracks} tracks • {playlist.mood}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          </div>
      )}

      {/* Live AI Music Generation Demo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              🎵 Live AI Music Generation Theater
            </h2>
            <p className="text-lg text-white/80 max-w-3xl mx-auto">
              Watch as our AI creates the perfect playlist for your financial mood. This is where music meets money management!
            </p>
          </div>

          {/* Playlist Generation Progress */}
          {isGeneratingPlaylist && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8"
            >
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-semibold">AI Generating Your Playlist...</span>
                  <span className="text-green-400 font-bold">{playlistProgress}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                  <motion.div 
                    className="bg-gradient-to-r from-green-400 to-emerald-400 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${playlistProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
          </div>
                <div className="text-center">
                  <p className="text-white/80 text-sm">
                    {playlistStages[Math.floor((playlistProgress / 15))] || 'Finalizing...'}
                  </p>
          </div>
        </div>
            </motion.div>
          )}

          {/* Generated Music Recommendation Display */}
          {currentRecommendation && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{currentRecommendation.title}</h3>
                <span className="text-green-400 text-sm">{currentRecommendation.genre}</span>
              </div>
              <p className="text-white/80 mb-4">by {currentRecommendation.artist}</p>
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 mb-4">
                <p className="text-white font-semibold text-sm mb-2">🎯 Perfect for: {currentRecommendation.financialTask}</p>
                <p className="text-white/90 text-sm">{currentRecommendation.aiReason}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white/60">Mood: <span className="text-white font-semibold">{currentRecommendation.mood}</span></span>
                <span className="text-white/60">Energy: <span className="text-white font-semibold">{currentRecommendation.energy}%</span></span>
              </div>
            </motion.div>
          )}

          {/* Playlist Generation Controls */}
          <div className="text-center">
            <button 
              onClick={generateAIPlaylist}
              disabled={isGeneratingPlaylist}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg flex items-center gap-2 mx-auto"
            >
              <Zap size={20} />
              {isGeneratingPlaylist ? 'Generating...' : 'Generate New AI Playlist'}
            </button>
          </div>
        </motion.div>
            </div>

      {/* AI Music Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            🎧 AI-Powered Music Features
          </h2>
          <p className="text-lg text-white/80 leading-relaxed max-w-4xl mx-auto">
            Our AI doesn't just play music - it creates the perfect soundtrack for your financial journey. From mood analysis to productivity enhancement, experience music like never before.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {[
            {
              title: 'Mood-Based Recommendations',
              description: 'AI analyzes your financial mood and suggests music that enhances your productivity and emotional state.',
              icon: '🧠',
              color: 'from-purple-500 to-pink-500'
            },
            {
              title: 'Task-Specific Playlists',
              description: 'Different music for different financial tasks - focus beats for budgeting, calm tunes for expense review.',
              icon: '🎯',
              color: 'from-green-500 to-emerald-500'
            },
            {
              title: 'Emotional Intelligence',
              description: 'Crystal understands your emotional relationship with money and curates music that supports your financial wellness.',
              icon: '💎',
              color: 'from-blue-500 to-cyan-500'
            },
            {
              title: 'Productivity Enhancement',
              description: 'Finley creates playlists scientifically designed to boost focus and concentration during financial tasks.',
              icon: '⚡',
              color: 'from-orange-500 to-red-500'
            },
            {
              title: 'Trend Discovery',
              description: 'Nova discovers new music trends and innovative soundscapes to keep your financial soundtrack fresh.',
              icon: '🌱',
              color: 'from-teal-500 to-cyan-500'
            },
            {
              title: 'Smart Integration',
              description: 'Prime orchestrates seamless integration between your music and financial workflow for maximum efficiency.',
              icon: '👑',
              color: 'from-yellow-500 to-orange-500'
            }
          ].map((feature, index) => (
            <motion.div 
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <span className="text-2xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-white/80 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
              </div>
            </div>

      {/* Call to Action Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Stop Struggling With Random Playlists During Financial Tasks
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Join 8,500+ Spotify users who've transformed their financial productivity with AI-curated playlists. Get your first personalized playlist free and discover what it feels like to have music that actually understands your money goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button 
              onClick={() => setShowMusicStudio(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-emerald-500 hover:to-green-500 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <Music size={28} />
              <span>Get My Free AI Playlist</span>
              <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full ml-2">
                FREE
              </div>
            </button>
            <button 
              onClick={generateAIPlaylist}
              className="border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-105"
            >
              <Zap size={28} />
              <span>See It In Action</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* AI Music Studio Modal */}
      <AnimatePresence>
        {showMusicStudio && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowMusicStudio(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">
                  🎵 Welcome to Prime's AI Music Studio
                </h2>
                <p className="text-white/80">
                  This is where the magic happens. Choose your financial mood and let our AI create the perfect music experience for you.
                </p>
              </div>

              {/* Mood Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div 
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedMood === 'motivated' 
                      ? 'border-green-400 bg-green-500/20' 
                      : 'border-white/20 bg-white/10'
                  }`}
                  onClick={() => setSelectedMood('motivated')}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap size={32} className="text-white" />
            </div>
                    <h3 className="text-xl font-bold text-white mb-2">Motivated Mode</h3>
                    <p className="text-white/80 text-sm">Get energized and focused for financial tasks!</p>
          </div>
        </div>

                <div 
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedMood === 'calm' 
                      ? 'border-blue-400 bg-blue-500/20' 
                      : 'border-white/20 bg-white/10'
                  }`}
                  onClick={() => setSelectedMood('calm')}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart size={32} className="text-white" />
            </div>
                    <h3 className="text-xl font-bold text-white mb-2">Calm Mode</h3>
                    <p className="text-white/80 text-sm">Relax and reduce stress while managing finances!</p>
            </div>
          </div>
        </div>

              {/* Studio Actions */}
              <div className="text-center">
        <button
                  onClick={() => {
                    setShowMusicStudio(false);
                    generateAIPlaylist();
                  }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center gap-2 mx-auto"
                >
                  <Zap size={24} />
                  Generate {selectedMood === 'motivated' ? 'Motivated' : 'Calm'} Playlist
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 
