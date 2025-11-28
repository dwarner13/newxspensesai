import React from 'react';
import { Bell, CheckCircle, Upload, Target, TrendingUp } from 'lucide-react';
import { getThemeClasses } from '../../theme/dashboardTheme';

/**
 * Right Activity Sidebar Component
 * 
 * Displays notifications, activity stream, and contextual widgets
 * Currently shows demo/placeholder data
 */

interface ActivityItem {
  id: string;
  type: 'upload' | 'goal' | 'achievement' | 'notification';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'upload',
    title: 'Receipt uploaded',
    description: '3 transactions extracted',
    timestamp: '2 min ago',
    icon: <Upload className="w-4 h-4" />,
  },
  {
    id: '2',
    type: 'goal',
    title: 'Goal updated',
    description: 'Vacation fund: 67% complete',
    timestamp: '1 hour ago',
    icon: <Target className="w-4 h-4" />,
  },
  {
    id: '3',
    type: 'achievement',
    title: 'Spending trend',
    description: 'Down 12% this month',
    timestamp: '3 hours ago',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    id: '4',
    type: 'notification',
    title: 'Bill reminder',
    description: 'Electric bill due in 2 days',
    timestamp: '5 hours ago',
    icon: <Bell className="w-4 h-4" />,
  },
];

export const RightActivitySidebar: React.FC = () => {
  return (
    <aside className="hidden xl:flex flex-col w-80 border-l border-white/10 bg-[#1e293b]/50">
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-white">Activity & Alerts</h2>
            <button
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-white/70" />
            </button>
          </div>
          <p className="text-sm text-white/60">Recent updates and notifications</p>
        </div>

        {/* Activity List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {mockActivities.map((activity) => (
            <div
              key={activity.id}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-white/90 flex-shrink-0 group-hover:scale-110 transition-transform">
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white mb-0.5">
                    {activity.title}
                  </h3>
                  <p className="text-xs text-white/70 mb-1">
                    {activity.description}
                  </p>
                  <span className="text-xs text-white/50">
                    {activity.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <button className="w-full px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200">
            See all notifications
          </button>
          <p className="mt-3 text-xs text-white/50 text-center">
            Coming soon: Real-time activity stream
          </p>
        </div>
      </div>
    </aside>
  );
};





