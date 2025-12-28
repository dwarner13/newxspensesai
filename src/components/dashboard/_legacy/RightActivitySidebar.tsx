// LEGACY: Old activity sidebar kept for reference. Not used by current dashboard layout.
// The dashboard now uses ActivityFeedSidebar + ActivityFeed components for all activity displays.

import React from 'react';
import { Bell, CheckCircle, Upload, Target, TrendingUp } from 'lucide-react';
import { getThemeClasses } from '../../../theme/dashboardTheme';

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
  {
    id: '5',
    type: 'achievement',
    title: 'Milestone reached',
    description: 'Saved $5,000 this year',
    timestamp: '1 day ago',
    icon: <CheckCircle className="w-4 h-4" />,
  },
];

export const RightActivitySidebar: React.FC = () => {
  const theme = getThemeClasses();

  return (
    <div className={`${theme.sidebar.bg} ${theme.sidebar.border} rounded-xl p-6 h-full flex flex-col`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`${theme.sidebar.title} text-sm font-semibold tracking-wide`}>
          Activity Feed
        </h3>
        <span className={`${theme.sidebar.subtitle} text-xs`}>Recent activity</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {mockActivities.map((activity) => (
          <div
            key={activity.id}
            className={`${theme.sidebar.item.bg} ${theme.sidebar.item.border} rounded-lg p-3 border`}
          >
            <div className="flex items-start gap-3">
              <div className={`${theme.sidebar.item.icon} flex-shrink-0 mt-0.5`}>
                {activity.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`${theme.sidebar.item.title} text-sm font-medium mb-1`}>
                  {activity.title}
                </p>
                <p className={`${theme.sidebar.item.description} text-xs mb-1`}>
                  {activity.description}
                </p>
                <p className={`${theme.sidebar.item.timestamp} text-[11px]`}>
                  {activity.timestamp}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};



















