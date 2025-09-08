import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  MessageCircle,
  Play,
  Pause,
  Filter,
  Users,
  Bot,
  Crown,
  ChevronDown,
  Settings
} from 'lucide-react';
import './AITeamSidebar.css';
import { AI_EMPLOYEES } from '../../orchestrator/aiEmployees';

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
  const navigate = useNavigate();
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [activeWorkers, setActiveWorkers] = useState<string[]>([]);

  // Function to manually trigger AI workers (can be called from dashboard cards)
  const triggerAIWorkers = (workerNames: string[]) => {
    const newActivities = workerNames.map((name, index) => ({
      id: `manual-${Date.now()}-${index}`,
      aiName: name,
      aiEmoji: '🤖',
      type: 'processing' as const,
      title: 'Processing Request',
      description: 'Working on your request',
      timestamp: 'Just now',
      progress: Math.floor(Math.random() * 100),
      isNew: true
    }));

    setActivities(prev => {
      // Remove any existing processing activities for these workers
      const filtered = prev.filter(activity => 
        !(activity.type === 'processing' && workerNames.includes(activity.aiName))
      );
      return [...newActivities, ...filtered].slice(0, 10);
    });
  };

  // Expose the function globally so dashboard cards can call it
  React.useEffect(() => {
    (window as any).triggerAIWorkers = triggerAIWorkers;
    return () => {
      delete (window as any).triggerAIWorkers;
    };
  }, []);

  // Handle activity click to navigate to chatbot
  const handleActivityClick = (activity: LiveActivity) => {
    // Navigate to AI Financial Assistant with the activity context
    navigate('/dashboard/ai-financial-assistant', { 
      state: { 
        activityContext: {
          aiName: activity.aiName,
          activityType: activity.type,
          activityTitle: activity.title,
          timestamp: activity.timestamp
        }
      }
    });
  };

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
      type: 'processing',
      title: 'Analyzing Trends',
      description: 'Predicting next month\'s spending',
      timestamp: '5 min ago',
      progress: 45,
      isNew: true
    },
    {
      id: '3',
      aiName: 'Tag',
      aiEmoji: '🏷️',
      type: 'processing',
      title: 'Categorizing Transactions',
      description: 'Auto-categorizing 15 new transactions',
      timestamp: '12 min ago',
      progress: 78,
      isNew: true
    },
    {
      id: '7',
      aiName: 'Ledger',
      aiEmoji: '📊',
      type: 'processing',
      title: 'Tax Analysis',
      description: 'Identifying tax deductions and savings',
      timestamp: '8 min ago',
      progress: 52,
      isNew: true
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
      aiName: 'Finley',
      aiEmoji: '💼',
      type: 'completed',
      title: 'Financial Analysis Complete',
      description: 'Auto-categorized 23 transactions with 96% accuracy',
      timestamp: '25 min ago'
    },
    {
      id: '6',
      aiName: 'Goalie',
      aiEmoji: '🥅',
      type: 'available',
      title: 'Ready to Chat',
      description: 'Available for financial advice and insights',
      timestamp: '30 min ago'
    }
  ]);

  // Auto-scroll Live Activity section
  const activityRef = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (activityRef.current) {
      activityRef.current.scrollTop = activityRef.current.scrollHeight;
    }
  }, [activities]);

  // Update active workers based on current activities
  useEffect(() => {
    const processingActivities = activities.filter(activity => activity.type === 'processing');
    const workerNames = processingActivities.map(activity => activity.aiName);
    console.log('Processing activities:', processingActivities);
    console.log('Active workers:', workerNames);
    setActiveWorkers(workerNames);
  }, [activities]);

  // Simulate new activities - much slower and more controlled
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const processingActivities = activities.filter(activity => activity.type === 'processing');
      
      // Add new activity more frequently for live feel
      if (processingActivities.length < 3) {
      const newActivities = [
        {
          id: Date.now().toString(),
          aiName: 'Byte',
          aiEmoji: '📄',
            type: 'processing' as const,
            title: 'Processing Documents',
            description: 'Analyzing uploaded receipts',
          timestamp: 'Just now',
            progress: Math.floor(Math.random() * 100),
          isNew: true
        },
        {
          id: (Date.now() + 1).toString(),
          aiName: 'Crystal',
          aiEmoji: '🔮',
          type: 'processing' as const,
          title: 'Analyzing Trends',
          description: 'Predicting next month\'s spending',
          timestamp: 'Just now',
            progress: Math.floor(Math.random() * 100),
            isNew: true
          },
          {
            id: (Date.now() + 2).toString(),
            aiName: 'Tag',
            aiEmoji: '🏷️',
            type: 'processing' as const,
            title: 'Categorizing Transactions',
            description: 'Auto-categorizing new transactions',
            timestamp: 'Just now',
            progress: Math.floor(Math.random() * 100),
          isNew: true
        }
      ];

      const randomActivity = newActivities[Math.floor(Math.random() * newActivities.length)];
      
      setActivities(prev => {
        const updated = [randomActivity, ...prev.slice(0, 9)]; // Keep only 10 most recent
        return updated;
      });
      }
    }, 8000); // New activity every 8 seconds for more live feel

    return () => clearInterval(interval);
  }, [isPaused, activities]);

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
      {/* Live Activity Section - Expanded */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">LIVE ACTIVITY</h3>
            </div>
          <div className="bg-green-500/20 text-green-400 text-xs rounded-full px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center animate-pulse">
            {activities.length}
          </div>
        </div>

        <div ref={activityRef} className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <AnimatePresence>
            {activities.slice(0, 6).map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => handleActivityClick(activity)}
                className={`py-0.5 hover:text-white hover:bg-white/10 transition-all cursor-pointer border-l-2 ${
                  activity.type === 'processing' ? 'border-l-blue-500 bg-blue-500/5' :
                  activity.type === 'completed' ? 'border-l-green-500 bg-green-500/5' :
                  activity.type === 'alert' ? 'border-l-yellow-500 bg-yellow-500/5' :
                  'border-l-gray-500 bg-gray-500/5'
                } pl-1.5 rounded-r`}
              >
                <div className="flex items-center gap-1">
                  <div className={`w-1 h-1 rounded-full ${
                    activity.type === 'processing' ? 'bg-blue-500 animate-pulse' :
                    activity.type === 'completed' ? 'bg-green-500' :
                    activity.type === 'alert' ? 'bg-yellow-500 animate-pulse' :
                    'bg-gray-500'
                  }`}></div>
                  <div className="text-xs text-white/50">{activity.timestamp}</div>
                </div>
                <div className="text-xs text-white/80 mt-0.5">{activity.aiName} {activity.title.toLowerCase()}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Ultra-Compact WORKERS */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">WORKERS</h3>
          <span className="text-xs text-white/60">{activeWorkers.length}/4</span>
        </div>
        
        <div className="space-y-0.5">
          {activeWorkers.length > 0 ? (
            activeWorkers.slice(0, 4).map((workerName) => {
              const employee = AI_EMPLOYEES[workerName];
              if (!employee) return null;
              
              // Find the current activity for this worker
              const currentActivity = activities.find(activity => 
                activity.aiName === workerName && activity.type === 'processing'
              );
              const progress = currentActivity?.progress || 0;
              
              // Debug logging
              console.log(`Worker: ${workerName}, Activity:`, currentActivity, `Progress: ${progress}%`);
              
              return (
            <motion.div
                  key={workerName}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded p-1"
                >
                  <div className="mb-0.5">
                    <h4 className="text-xs font-semibold text-white truncate">
                      {workerName} - {employee.role.split(' - ')[0]}
                    </h4>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-white/20 rounded-full h-1.5 mb-0.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${progress || 0}%` }}
                    ></div>
                </div>
                  <div className="text-xs text-center text-blue-400 font-semibold">
                    {progress || 0}%
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-white/50">No active workers</p>
                    </div>
                  )}
              </div>
      </div>

      {/* Prime at Bottom */}
      <div className="mt-auto pt-2">
        <div className="bg-gradient-to-r from-purple-500/15 to-cyan-500/15 border border-purple-500/30 rounded p-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Crown className="w-2 h-2 text-yellow-400" />
              <div>
                <h4 className="text-xs font-semibold text-white">Prime</h4>
                <p className="text-xs text-white/60">AI</p>
        </div>
            </div>
            <div className="bg-green-500/30 text-green-400 text-xs px-1 py-0.5 rounded-full font-semibold">
              ON
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITeamSidebar;