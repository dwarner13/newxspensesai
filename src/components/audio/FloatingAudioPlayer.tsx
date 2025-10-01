import React, { useState, useRef, useEffect } from 'react';
import { useAudio, AudioTrack } from '../../contexts/AudioContext';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX,
  List,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface FloatingAudioPlayerProps {
  className?: string;
}

export function FloatingAudioPlayer({ className = '' }: FloatingAudioPlayerProps) {
  const { state, playTrack, pauseTrack, resumeTrack, skipTrack, previousTrack, setVolume } = useAudio();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !state.currentTrack) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressWidth = rect.width;
    const newProgress = (clickX / progressWidth) * state.currentTrack.duration;
    
    // TODO: Implement actual audio seeking
    console.log('Seek to:', newProgress);
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (!state.currentTrack) return;
    
    if (state.isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };

  // Auto-hide volume slider
  useEffect(() => {
    if (showVolumeSlider) {
      const timer = setTimeout(() => setShowVolumeSlider(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showVolumeSlider]);

  // Don't render if no track is playing
  if (!state.currentTrack) {
    return null;
  }

  return (
    
      <div
        className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
      >
        <div
          layout
          className={`
            bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700
            ${isExpanded ? 'w-96' : 'w-80'}
            transition-all duration-300 ease-in-out
          `}
        >
          {/* Main Player */}
          <div className="p-4">
            {/* Track Info */}
            <div className="flex items-center space-x-3 mb-3">
              <div className="relative">
                <img
                  src={state.currentTrack.albumArt || 'https://via.placeholder.com/60x60/6366f1/ffffff?text=🎵'}
                  alt={state.currentTrack.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg flex items-center justify-center">
                  {state.currentTrack.source === 'spotify' && (
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {state.currentTrack.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {state.currentTrack.artist}
                </p>
                {state.currentTrack.album && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                    {state.currentTrack.album}
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div
                ref={progressRef}
                onClick={handleProgressClick}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer relative overflow-hidden"
              >
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  style={{
                    width: `${(state.progress / (state.currentTrack.duration || 1)) * 100}%`
                  }}
                  animate={{
                    width: `${(state.progress / (state.currentTrack.duration || 1)) * 100}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>{formatTime(state.progress)}</span>
                <span>{formatTime(state.currentTrack.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={previousTrack}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <SkipBack size={20} />
                </button>
                
                <button
                  onClick={handlePlayPause}
                  className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {state.isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                
                <button
                  onClick={skipTrack}
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
                    onClick={() => setVolume(state.volume === 0 ? 0.7 : 0)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {state.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
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
                          value={state.volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>
                    )}
                  
                </div>
              </div>
            </div>
          </div>

          {/* Expanded Queue View */}
          
            {showQueue && (
              <div
                className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-4 max-h-48 overflow-y-auto">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Queue ({state.queue.length})
                  </h5>
                  {state.queue.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No tracks in queue
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {state.queue.map((track, index) => (
                        <div
                          key={track.id}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <img
                            src={track.albumArt || 'https://via.placeholder.com/40x40/6366f1/ffffff?text=🎵'}
                            alt={track.title}
                            className="w-8 h-8 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {track.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {track.artist}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {formatTime(track.duration)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          
        </div>
      </div>
    
  );
} 
