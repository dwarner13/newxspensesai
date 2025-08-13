import React from 'react';
import { Headphones, Play, Share2, Calendar, Clock } from 'lucide-react';

const PersonalPodcastCard = () => {
  const latestEpisode = {
    title: "Your December Financial Journey",
    duration: "12:34",
    date: "Dec 12, 2024",
    summary: "This month you saved 15% more than last month! Your emergency fund is growing steadily, and you're on track to reach your vacation goal by March.",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop&crop=center"
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
          <Headphones size={20} className="text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white">Personal Podcast</h3>
      </div>

      <div className="bg-white/5 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-4">
          <img 
            src={latestEpisode.image} 
            alt="Episode Cover" 
            className="w-16 h-16 rounded-lg object-cover shadow-lg"
          />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white mb-1">{latestEpisode.title}</h4>
            <div className="flex items-center gap-4 text-xs text-white/60 mb-2">
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                {latestEpisode.date}
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                {latestEpisode.duration}
              </div>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">{latestEpisode.summary}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
          <Play size={16} />
          Play Episode
        </button>
        <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 flex items-center gap-2">
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  );
};

export default PersonalPodcastCard; 
