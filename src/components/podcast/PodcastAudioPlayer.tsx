import React, { useState, useRef, useEffect } from 'react';
import { PodcastEpisode } from '../../types/podcast.types';

interface PodcastAudioPlayerProps {
  episode: PodcastEpisode;
  onClose: () => void;
}

const PodcastAudioPlayer: React.FC<PodcastAudioPlayerProps> = ({
  episode,
  onClose
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showScript, setShowScript] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getAIEmployeeIcons = (employees: string[]) => {
    const employeeIcons: Record<string, string> = {
      'Prime': '👑',
      'Goalie': '🥅',
      'Crystal': '🔮',
      'Blitz': '⚡',
      'Tag': '🏷️',
      'Byte': '💾',
      'Intelia': '🧠',
      'Liberty': '🕊️',
      'Automa': '🤖',
      'Custodian': '🛡️'
    };

    return employees.map(employee => ({
      name: employee,
      icon: employeeIcons[employee] || '👤'
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-semibold">{episode.title}</h2>
                <p className="text-indigo-100 text-sm">
                  {new Date(episode.generated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getAIEmployeeIcons(episode.ai_employees_used).map((employee, index) => (
                <span
                  key={index}
                  className="text-lg"
                  title={employee.name}
                >
                  {employee.icon}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row h-[calc(90vh-120px)]">
          {/* Audio Player */}
          <div className="flex-1 p-6">
            {episode.audio_url ? (
              <div className="space-y-6">
                {/* Audio Controls */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <audio ref={audioRef} src={episode.audio_url} />
                  
                  {/* Play/Pause Button */}
                  <div className="flex justify-center mb-6">
                    <button
                      onClick={togglePlay}
                      className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors"
                    >
                      {isPlaying ? (
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center space-x-3 mt-4">
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>

                {/* Episode Info */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Episode Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <span className="ml-2 text-gray-900">
                        {episode.duration_seconds ? formatTime(episode.duration_seconds) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className="ml-2 text-gray-900 capitalize">{episode.generation_status}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">File Size:</span>
                      <span className="ml-2 text-gray-900">
                        {episode.file_size_bytes ? `${Math.round(episode.file_size_bytes / 1024 / 1024 * 100) / 100} MB` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Rating:</span>
                      <span className="ml-2 text-gray-900">
                        {episode.rating ? `${episode.rating}/5 ⭐` : 'Not rated'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎙️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Audio not available
                </h3>
                <p className="text-gray-600 mb-6">
                  This episode is still being generated or the audio file is not ready yet.
                </p>
                <button
                  onClick={() => setShowScript(true)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  View Script Instead
                </button>
              </div>
            )}
          </div>

          {/* Script Panel */}
          <div className="lg:w-1/2 border-l border-gray-200">
            <div className="p-6 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Episode Script</h3>
                <button
                  onClick={() => setShowScript(!showScript)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  {showScript ? 'Hide' : 'Show'} Script
                </button>
              </div>
              
              {showScript && (
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {episode.script_content || 'Script content not available'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastAudioPlayer;
