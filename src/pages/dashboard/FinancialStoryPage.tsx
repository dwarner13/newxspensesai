import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Download, 
  Share2, 
  Plus, 
  BookOpen, 
  Mic, 
  Headphones,
  Clock,
  Star,
  MoreVertical,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import DashboardHeader from '../../components/ui/DashboardHeader';

interface Story {
  id: string;
  title: string;
  description: string;
  duration: string;
  createdAt: string;
  status: 'draft' | 'generating' | 'ready' | 'published';
  hosts: string[];
  thumbnail: string;
  listens: number;
  rating: number;
}

const FinancialStoryPage = () => {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stories, setStories] = useState<Story[]>([
    {
      id: '1',
      title: 'The Mystery of the Missing Savings',
      description: 'Spark and Wisdom investigate where your money went this month, uncovering surprising patterns in your late-night spending.',
      duration: '12:34',
      createdAt: '2 hours ago',
      status: 'ready',
      hosts: ['Spark', 'Wisdom'],
      thumbnail: '🔍',
      listens: 47,
      rating: 4.8
    },
    {
      id: '2',
      title: 'The Great Coffee Shop Conspiracy',
      description: 'Roast Master exposes your $247 monthly coffee addiction while Fortune finds the silver lining in your loyalty rewards.',
      duration: '18:22',
      createdAt: '1 day ago',
      status: 'ready',
      hosts: ['Roast Master', 'Fortune'],
      thumbnail: '☕',
      listens: 23,
      rating: 4.9
    },
    {
      id: '3',
      title: 'New Beginnings & Old Habits',
      description: 'Your first financial story! Nova and Serenity explore your spending personality and create your money mission statement.',
      duration: '15:18',
      createdAt: '3 days ago',
      status: 'ready',
      hosts: ['Nova', 'Serenity'],
      thumbnail: '🌱',
      listens: 89,
      rating: 4.7
    },
    {
      id: '4',
      title: 'The Investment Adventure',
      description: 'Crystal predicts market trends while Liberty guides you through your first investment decisions.',
      duration: '22:45',
      createdAt: '1 week ago',
      status: 'generating',
      hosts: ['Crystal', 'Liberty'],
      thumbnail: '📈',
      listens: 0,
      rating: 0
    }
  ]);

  const handlePlay = (story: Story) => {
    setSelectedStory(story);
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleCreateNew = () => {
    // TODO: Implement create new story functionality
    console.log('Create new story');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-400 bg-green-400/10';
      case 'generating': return 'text-blue-400 bg-blue-400/10';
      case 'draft': return 'text-yellow-400 bg-yellow-400/10';
      case 'published': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready': return 'Ready to Play';
      case 'generating': return 'Generating...';
      case 'draft': return 'Draft';
      case 'published': return 'Published';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      <DashboardHeader 
        customTitle="Financial Story"
        customSubtitle="Transform your financial data into engaging stories with AI storytellers"
      />

      <div className="p-6 space-y-6">
        {/* Action Bar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">Your Stories</h2>
            <span className="text-white/60">({stories.length} stories)</span>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-cyan-600 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Create New Story
          </button>
        </div>

        {/* Now Playing Bar */}
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center text-2xl">
                {selectedStory.thumbnail}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">{selectedStory.title}</h3>
                <p className="text-white/60 text-sm">{selectedStory.hosts.join(' & ')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={isPlaying ? handlePause : () => handlePlay(selectedStory)}
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  {isPlaying ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                </button>
                <span className="text-white/60 text-sm">{selectedStory.duration}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300 group"
            >
              {/* Story Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center text-2xl">
                  {story.thumbnail}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(story.status)}`}>
                    {getStatusText(story.status)}
                  </span>
                  <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              </div>

              {/* Story Content */}
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2 group-hover:text-purple-400 transition-colors">
                  {story.title}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed mb-3">
                  {story.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {story.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Headphones className="w-3 h-3" />
                    {story.listens} listens
                  </div>
                  {story.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {story.rating}
                    </div>
                  )}
                </div>
              </div>

              {/* Hosts */}
              <div className="mb-4">
                <p className="text-xs text-white/50 mb-2">Hosted by:</p>
                <div className="flex gap-2">
                  {story.hosts.map((host, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-white/10 rounded-lg text-xs text-white/80"
                    >
                      {host}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePlay(story)}
                  disabled={story.status !== 'ready'}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-cyan-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  Play
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Download className="w-4 h-4 text-white/60" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Share2 className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Created Date */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/50">Created {story.createdAt}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {stories.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-12 h-12 text-white/40" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Stories Yet</h3>
            <p className="text-white/60 mb-6">Create your first financial story to get started</p>
            <button
              onClick={handleCreateNew}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-cyan-600 transition-all duration-200"
            >
              Create Your First Story
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FinancialStoryPage;

