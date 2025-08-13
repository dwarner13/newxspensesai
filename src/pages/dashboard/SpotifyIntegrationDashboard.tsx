import React, { useState } from 'react';
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
  MessageCircle
} from 'lucide-react';

const SpotifyIntegrationDashboard = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Spotify Integration</h1>
      <p className="text-lg text-gray-300 mb-8">Control your music while budgeting</p>

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
    </div>
  );
};

export default SpotifyIntegrationDashboard; 