import React from 'react';
import { Headphones, Play, Share2 } from 'lucide-react';

/**
 * PersonalPodcastCard component for AI-generated podcast episodes
 * Displays current episode and playback controls
 */
const PersonalPodcastCard = () => {
  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
          <Headphones size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Personal Podcast</h3>
          <p className="text-sm text-white/60">Your AI-generated episodes</p>
        </div>
      </div>
      <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
        <h4 className="text-white font-semibold mb-1">Your December Financial Journey</h4>
        <p className="text-white/60 text-sm mb-2">December 15, 2024 • 12 min</p>
        <p className="text-white/80 text-sm">You saved 15% more this month! Your emergency fund is growing steadily.</p>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2.5 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2">
          <Play size={14} />
          Play Episode
        </button>
        <button className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/20">
          <Share2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default PersonalPodcastCard; 