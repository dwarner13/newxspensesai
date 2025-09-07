import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  MessageCircle,
  Play,
  Pause,
  Filter
} from 'lucide-react';
import './AITeamSidebar.css';

interface LiveActivity {
  id: string;
  aiName: string;
  aiEmoji: string;
  type: 'processing' | 'completed' | 'alert' | 'achievement' | 'available';
  title: string;
  description: string;
  timestamp: string;
  progress?: number;
  isNew?: boolean;
}

const AITeamSidebar: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [activities, setActivities] = useState<LiveActivity[]>([
    {
      id: '1',
      aiName: 'Byte',
      aiEmoji: '📄',
      type: 'processing',
      title: 'Processing Chase Statement',
      description: 'Analyzing 47 transactions from 12/15/2023',
      timestamp: '2 min ago',
      progress: 67,
      isNew: true
    },
    {
      id: '2',
      aiName: 'Crystal',
      aiEmoji: '🔮',
      type: 'completed',
      title: 'Spending Analysis Complete',
      description: 'Found 3 spending patterns in your data',
      timestamp: '5 min ago',
      isNew: true
    },
    {
      id: '3',
      aiName: 'Goalie',
      aiEmoji: '🥅',
      type: 'achievement',
      title: 'Savings Goal Updated',
      description: 'You\'re $247 ahead of schedule this week!',
      timestamp: '12 min ago'
    },
    {
      id: '4',
      aiName: 'Chime',
      aiEmoji: '🔔',
      type: 'alert',
      title: 'Bill Reminder',
      description: 'Credit card payment due in 2 days',
      timestamp: '18 min ago'
    },
    {
      id: '5',
      aiName: 'Tag',
      aiEmoji: '🏷️',
      type: 'completed',
      title: 'Categorization Complete',
      description: 'Auto-categorized 23 transactions with 96% accuracy',
      timestamp: '25 min ago'
    },
    {
      id: '6',
      aiName: 'Finley',
      aiEmoji: '💼',
      type: 'available',
      title: 'Ready to Chat',
      description: 'Available for financial advice and insights',
      timestamp: '30 min ago'
    }
  ]);

  // Simulate new activities
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const newActivities = [
        {
          id: Date.now().toString(),
          aiName: 'Byte',
          aiEmoji: '📄',
          type: 'completed' as const,
          title: 'Document Processed',
          description: 'Successfully processed 3 receipts',
          timestamp: 'Just now',
          isNew: true
        },
        {
          id: (Date.now() + 1).toString(),
          aiName: 'Dash',
          aiEmoji: '📈',
          type: 'completed' as const,
          title: 'Weekly Report Generated',
          description: 'Your spending summary is ready',
          timestamp: 'Just now',
          isNew: true
        },
        {
          id: (Date.now() + 2).toString(),
          aiName: 'Crystal',
          aiEmoji: '🔮',
          type: 'processing' as const,
          title: 'Analyzing Trends',
          description: 'Predicting next month\'s spending',
          timestamp: 'Just now',
          progress: 23,
          isNew: true
        }
      ];

      const randomActivity = newActivities[Math.floor(Math.random() * newActivities.length)];
      
      setActivities(prev => {
        const updated = [randomActivity, ...prev.slice(0, 9)]; // Keep only 10 most recent
        return updated;
      });
    }, 8000); // New activity every 8 seconds

    return () => clearInterval(interval);
  }, [isPaused]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'processing':
        return <Activity className="w-4 h-4 text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'achievement':
        return <TrendingUp className="w-4 h-4 text-purple-400" />;
      case 'available':
        return <MessageCircle className="w-4 h-4 text-cyan-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'processing':
        return 'border-l-blue-400 bg-blue-400/5';
      case 'completed':
        return 'border-l-green-400 bg-green-400/5';
      case 'alert':
        return 'border-l-orange-400 bg-orange-400/5';
      case 'achievement':
        return 'border-l-purple-400 bg-purple-400/5';
      case 'available':
        return 'border-l-cyan-400 bg-cyan-400/5';
      default:
        return 'border-l-gray-400 bg-gray-400/5';
    }
  };

  const filteredActivities = filter 
    ? activities.filter(activity => activity.aiName.toLowerCase() === filter.toLowerCase())
    : activities;

  const uniqueAIs = [...new Set(activities.map(a => a.aiName))];

  return (
    <div className="ai-team-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Live Activity</h2>
            <div className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
              {activities.filter(a => a.isNew).length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title={isPaused ? 'Resume updates' : 'Pause updates'}
            >
              {isPaused ? <Play className="w-4 h-4 text-white/70" /> : <Pause className="w-4 h-4 text-white/70" />}
            </button>
            <div className="relative">
              <select
                value={filter || ''}
                onChange={(e) => setFilter(e.target.value || null)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All AIs</option>
                {uniqueAIs.map(ai => (
                  <option key={ai} value={ai}>{ai}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="activity-feed">
        <AnimatePresence>
          {filteredActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ 
                duration: 0.4, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              className={`activity-item ${getActivityColor(activity.type)} ${
                activity.isNew ? 'ring-2 ring-purple-400/30' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-lg">
                    {activity.aiEmoji}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getActivityIcon(activity.type)}
                    <span className="text-sm font-semibold text-white">{activity.aiName}</span>
                    <span className="text-xs text-white/50">{activity.timestamp}</span>
                    {activity.isNew && (
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  
                  <h4 className="text-sm font-medium text-white/90 mb-1">
                    {activity.title}
                  </h4>
                  
                  <p className="text-xs text-white/60 mb-2">
                    {activity.description}
                  </p>

                  {activity.progress !== undefined && (
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-white/50 mb-1">
                        <span>Progress</span>
                        <span>{activity.progress}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <motion.div
                          className="bg-gradient-to-r from-blue-400 to-cyan-400 h-1.5 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${activity.progress}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  )}

                  {activity.type === 'available' && (
                    <button className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-2 py-1 rounded-md transition-colors">
                      Chat Now
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Executive Section - Keep Prime */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Executive</h3>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center text-xl">
              👑
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white">Prime</h4>
              <p className="text-xs text-white/60">Orchestrating your empire</p>
            </div>
            <div className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
              FOLLOWING
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITeamSidebar;