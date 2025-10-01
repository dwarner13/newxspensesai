import React, { useState, useRef, useEffect } from 'react';
import { usePersonalPodcast } from '../../contexts/PersonalPodcastContext';
import { PodcastEpisode } from '../../contexts/PersonalPodcastContext';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Share2,
  Download,
  Heart,
  Clock,
  Calendar,
  Mic,
  Sparkles,
  X
} from 'lucide-react';

interface EpisodePlayerProps {
  episode: PodcastEpisode;
  onClose?: () => void;
  className?: string;
}

export function EpisodePlayer({ episode, onClose, className = '' }: EpisodePlayerProps) {
  const { playEpisode, pauseEpisode, updatePlayProgress } = usePersonalPodcast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (isPlaying) {
      pauseEpisode(episode.id);
      setIsPlaying(false);
    } else {
      playEpisode(episode.id);
      setIsPlaying(true);
    }
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressWidth = rect.width;
    const newProgress = (clickX / progressWidth) * episode.duration;
    
    setCurrentTime(newProgress);
    updatePlayProgress(episode.id, newProgress);
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    // TODO: Implement actual volume control
  };

  // Handle skip forward/backward
  const handleSkip = (direction: 'forward' | 'backward') => {
    const skipAmount = 30; // 30 seconds
    const newTime = direction === 'forward' 
      ? Math.min(currentTime + skipAmount, episode.duration)
      : Math.max(currentTime - skipAmount, 0);
    
    setCurrentTime(newTime);
    updatePlayProgress(episode.id, newTime);
  };

  // Handle share
  const handleShare = () => {
    // TODO: Implement sharing functionality
    console.log('Sharing episode:', episode.title);
  };

  // Handle download
  const handleDownload = () => {
    // TODO: Implement download functionality
    console.log('Downloading episode:', episode.title);
  };

  // Handle favorite
  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Update favorite status in context
  };

  // Auto-hide volume slider
  useEffect(() => {
    if (showVolumeSlider) {
      const timer = setTimeout(() => setShowVolumeSlider(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showVolumeSlider]);

  // Update current time based on episode progress
  useEffect(() => {
    setCurrentTime(episode.playProgress);
    setIsPlaying(episode.isPlaying);
  }, [episode.playProgress, episode.isPlaying]);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Mic size={24} />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Sparkles size={14} />
                <span className="text-sm font-medium opacity-90">Your Financial Story</span>
              </div>
              <h2 className="text-xl font-bold">{episode.title}</h2>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white opacity-70 hover:opacity-100 transition-opacity"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Episode Info */}
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {episode.description}
        </p>
        
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <div className="flex items-center space-x-1">
            <Clock size={14} />
            <span>{formatTime(episode.duration)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar size={14} />
            <span>{new Date(episode.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Mic size={14} />
            <span className="capitalize">{episode.voiceType}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer relative overflow-hidden"
          >
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              style={{
                width: `${(currentTime / episode.duration) * 100}%`
              }}
              animate={{
                width: `${(currentTime / episode.duration) * 100}%`
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(episode.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleSkip('backward')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <SkipBack size={20} />
            </button>
            
            <button
              onClick={handlePlayPause}
              className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <button
              onClick={() => handleSkip('forward')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <SkipForward size={20} />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
                onClick={() => handleVolumeChange(volume === 0 ? 0.7 : 0)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              
              
                {showVolumeSlider && (
                  <div
                    className="absolute bottom-full right-0 mb-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                  >
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                )}
              
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFavorite}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isFavorite
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Heart size={14} className={isFavorite ? 'fill-current' : ''} />
              <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Share2 size={14} />
              <span>Share</span>
            </button>
          </div>
          
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Download size={14} />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Financial Insights Preview */}
      {episode.financialData && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700/50">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Episode Highlights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                ${episode.financialData.spendingTotal.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Total Spending
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {episode.financialData.goalProgress[0]?.percentage || 0}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Goal Progress
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {episode.financialData.achievements.length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Achievements
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
