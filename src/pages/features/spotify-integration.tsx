import React, { useState } from 'react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { Helmet } from 'react-helmet-async';
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
  LogOut
} from 'lucide-react';

const SpotifyIntegrationFeaturePage = () => {
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
    <WebsiteLayout>
      <Helmet>
        <title>Spotify Integration - Music While You Budget | XspensesAI</title>
        <meta name="description" content="Connect your Spotify account and control music while budgeting. Access playlists, control playback, and enjoy Financial Focus playlists." />
        <meta name="keywords" content="spotify integration, music while budgeting, financial focus playlists, spotify dashboard, expense tracking music" />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-green-700 text-white py-20 px-4 text-center rounded-3xl shadow-xl mb-16">
        <motion.div
          className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Music size={40} className="text-white" />
        </motion.div>
        <motion.h1
          className="text-5xl md:text-6xl font-extrabold mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Connect Your <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Spotify</span> Account
        </motion.h1>
        <motion.p
          className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Control your music while budgeting. Access your playlists, control playback, and enjoy <span className="font-bold text-white">Financial Focus</span> playlists designed for money management.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <button
            onClick={handleSpotifyLogin}
            disabled={isLoading}
            className="inline-block bg-gradient-to-r from-green-500 to-emerald-500 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:from-emerald-500 hover:to-green-500 transition-all duration-300 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw size={20} className="animate-spin inline mr-2" />
                Connecting to Spotify...
              </>
            ) : (
              <>
                <Music size={20} className="inline mr-2" />
                Connect Spotify Account
              </>
            )}
          </button>
        </motion.div>
      </section>

      {/* Connection Status */}
      {isConnected && (
        <section className="max-w-4xl mx-auto mb-20">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CheckCircle size={24} className="text-green-500" />
              <h2 className="text-2xl font-bold text-gray-900">Successfully Connected to Spotify</h2>
            </div>
            <p className="text-gray-600 mb-6">You can now control your music while managing your finances.</p>
            
            {/* Currently Playing Demo */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Headphones size={20} className="text-green-500" />
                Currently Playing
              </h3>
              <div className="flex items-center gap-4">
                <img 
                  src={currentTrack.albumArt} 
                  alt="Album Art" 
                  className="w-16 h-16 rounded-lg object-cover shadow-md"
                />
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-gray-900">{currentTrack.name}</h4>
                  <p className="text-gray-600 text-sm">{currentTrack.artist}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-gray-600 hover:text-gray-900 transition-colors">
                    <SkipBack size={20} />
                  </button>
                  <button 
                    onClick={togglePlayPause}
                    className="w-10 h-10 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors"
                  >
                    {currentTrack.isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white" />}
                  </button>
                  <button className="text-gray-600 hover:text-gray-900 transition-colors">
                    <SkipForward size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* What Makes It Special */}
      <section className="max-w-4xl mx-auto mb-20">
        <h2 className="text-3xl font-bold text-center mb-10 text-gray-900">Seamless Music Integration for Financial Focus</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-4xl mb-4">🎵</div>
            <h3 className="text-xl font-bold text-green-700 mb-2">OAuth Login</h3>
            <p className="text-gray-700">Secure connection with your Spotify account using industry-standard OAuth 2.0 authentication.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-4xl mb-4">🎧</div>
            <h3 className="text-xl font-bold text-green-700 mb-2">Playlist Access</h3>
            <p className="text-gray-700">Browse and play your personal playlists while managing expenses and budgets.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-4xl mb-4">🎛️</div>
            <h3 className="text-xl font-bold text-green-700 mb-2">Full Playback Control</h3>
            <p className="text-gray-700">Play, pause, skip, and control volume directly from your financial dashboard.</p>
          </div>
        </div>
      </section>

      {/* Feature List */}
      <section className="max-w-4xl mx-auto mb-20">
        <h2 className="text-3xl font-bold text-center mb-10 text-gray-900">Complete Spotify Integration Features</h2>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">OAuth Login</h4>
                <p className="text-gray-600 text-sm">Secure connection with your Spotify account</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Playlist Access</h4>
                <p className="text-gray-600 text-sm">Browse and play your personal playlists</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Playback Control</h4>
                <p className="text-gray-600 text-sm">Play, pause, skip, and control volume</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Financial Focus</h4>
                <p className="text-gray-600 text-sm">Curated playlists for financial tasks</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Real-time Sync</h4>
                <p className="text-gray-600 text-sm">Live updates from your Spotify account</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Premium Support</h4>
                <p className="text-gray-600 text-sm">Full features for Spotify Premium users</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto mb-20">
        <h2 className="text-3xl font-bold text-center mb-10 text-gray-900">How Users Enjoy Music While Budgeting</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4 text-white text-2xl">🎵</div>
            <p className="text-gray-700 italic mb-4">"I love having my music while I budget. It makes the whole process so much more enjoyable!"</p>
            <div className="font-bold text-gray-900">Sarah K.</div>
            <div className="text-sm text-gray-500">Student</div>
            </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4 text-white text-2xl">🎧</div>
            <p className="text-gray-700 italic mb-4">"The Financial Focus playlists are perfect for when I'm reviewing my expenses."</p>
            <div className="font-bold text-gray-900">Mike R.</div>
            <div className="text-sm text-gray-500">Freelancer</div>
            </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4 text-white text-2xl">🎛️</div>
            <p className="text-gray-700 italic mb-4">"Seamless integration. I can control my music without leaving the dashboard."</p>
            <div className="font-bold text-gray-900">Emma L.</div>
            <div className="text-sm text-gray-500">Designer</div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl mt-16 text-white text-center max-w-4xl mx-auto shadow-xl">
        <h2 className="text-3xl font-bold mb-4">Ready to Connect Your Spotify?</h2>
        <p className="text-xl mb-8 opacity-90">Start enjoying music while you manage your finances today.</p>
        <button
          onClick={handleSpotifyLogin}
          disabled={isLoading}
          className="bg-white text-green-600 hover:bg-gray-100 disabled:opacity-50 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300"
        >
          {isLoading ? (
            <>
              <RefreshCw size={20} className="animate-spin inline mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <Music size={20} className="inline mr-2" />
              Connect Spotify Now
            </>
          )}
        </button>
      </section>
    </WebsiteLayout>
  );
};

export default SpotifyIntegrationFeaturePage; 
