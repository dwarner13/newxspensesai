import React from 'react';
import { Music, Play, Wifi, WifiOff } from 'lucide-react';

const SpotifyIntegrationCard = () => {
  const isConnected = false;
  const todaysPlaylist = {
    name: "Financial Focus Mix",
    tracks: 23,
    mood: "Productive",
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150&h=150&fit=crop"
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
          <Music size={20} className="text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white">Spotify Integration</h3>
        <div className="ml-auto">
          {isConnected ? (
            <div className="flex items-center gap-1 text-green-400">
              <Wifi size={14} />
              <span className="text-xs">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-white/60">
              <WifiOff size={14} />
              <span className="text-xs">Disconnected</span>
            </div>
          )}
        </div>
      </div>

      {isConnected ? (
        <>
          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <img 
                src={todaysPlaylist.image} 
                alt="Playlist Cover" 
                className="w-12 h-12 rounded-lg object-cover shadow-lg"
              />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white">{todaysPlaylist.name}</h4>
                <p className="text-xs text-white/60">{todaysPlaylist.tracks} tracks • {todaysPlaylist.mood}</p>
              </div>
            </div>
          </div>
          <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
            <Play size={16} />
            Listen Now
          </button>
        </>
      ) : (
        <>
          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <p className="text-sm text-white/80 mb-3">Connect your Spotify account to enjoy music while managing your finances.</p>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>OAuth Login</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Playlist Access</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Financial Focus Playlists</span>
            </div>
          </div>
          <button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
            <Music size={16} />
            Connect Spotify
          </button>
        </>
      )}
    </div>
  );
};

export default SpotifyIntegrationCard; 
