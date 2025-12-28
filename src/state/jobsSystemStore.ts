/**
 * Jobs System Store
 * 
 * Global state management for jobs and notifications
 * Used by RightPulseRail and JobsDrawer components
 */

import { create } from 'zustand';

export type JobStatus = 'queued' | 'running' | 'needs_user' | 'completed' | 'failed';

export interface Job {
  id: string;
  user_id: string;
  conversation_id: string | null;
  created_by_employee: string;
  assigned_to_employee: string;
  title: string;
  status: JobStatus;
  progress: number;
  result_summary: string | null;
  result_payload: any | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  job_id: string | null;
  type: 'job_completed' | 'job_needs_user' | 'job_failed' | 'system_info';
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export type JobsDrawerTab = 'active' | 'needs_you' | 'completed';

interface JobsSystemState {
  // Data
  jobs: Job[];
  notifications: Notification[];
  
  // UI State
  isDrawerOpen: boolean;
  activeTab: JobsDrawerTab;
  focusedJobId: string | null;
  
  // Computed counts
  unreadCount: number;
  unreadAiCount: number; // Notifications where type starts with 'job_' and is_read=false
  unreadAllCount: number; // All unread notifications
  runningCount: number;
  needsUserCount: number;
}

interface JobsSystemActions {
  // Drawer actions
  setDrawerOpen: (open: boolean) => void;
  setActiveTab: (tab: JobsDrawerTab) => void;
  focusJob: (jobId: string | null) => void;
  
  // Data actions
  setJobs: (jobs: Job[]) => void;
  upsertJob: (job: Job) => void;
  setNotifications: (notifications: Notification[]) => void;
  upsertNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  
  // Computed getters
  getJobsByTab: (tab: JobsDrawerTab) => Job[];
}

type JobsSystemStore = JobsSystemState & JobsSystemActions;

export const useJobsSystemStore = create<JobsSystemStore>((set, get) => ({
  // Initial state
  jobs: [],
  notifications: [],
  isDrawerOpen: false,
  activeTab: 'active',
  focusedJobId: null,
  unreadCount: 0,
  unreadAiCount: 0,
  unreadAllCount: 0,
  runningCount: 0,
  needsUserCount: 0,
  
  // Drawer actions
  setDrawerOpen: (open) => {
    set({ isDrawerOpen: open });
    // Mark notifications as read when drawer opens
    if (open) {
      const { notifications } = get();
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        set({
          notifications: notifications.map(n =>
            unreadIds.includes(n.id) ? { ...n, is_read: true } : n
          ),
          unreadCount: 0,
          unreadAiCount: 0,
          unreadAllCount: 0,
        });
      }
    }
  },
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  focusJob: (jobId) => set({ focusedJobId: jobId }),
  
  // Data actions
  setJobs: (jobs) => {
    const runningCount = jobs.filter(j => j.status === 'running' || j.status === 'queued').length;
    const needsUserCount = jobs.filter(j => j.status === 'needs_user').length;
    set({ jobs, runningCount, needsUserCount });
  },
  
  upsertJob: (job) => {
    const { jobs } = get();
    const existingIndex = jobs.findIndex(j => j.id === job.id);
    const newJobs = existingIndex >= 0
      ? jobs.map((j, i) => i === existingIndex ? job : j)
      : [...jobs, job];
    
    const runningCount = newJobs.filter(j => j.status === 'running' || j.status === 'queued').length;
    const needsUserCount = newJobs.filter(j => j.status === 'needs_user').length;
    
    set({ jobs: newJobs, runningCount, needsUserCount });
  },
  
  setNotifications: (notifications) => {
    const unreadAll = notifications.filter(n => !n.is_read);
    const unreadAi = unreadAll.filter(n => n.type.startsWith('job_'));
    set({ 
      notifications, 
      unreadCount: unreadAi.length, // For backward compatibility, keep as AI count
      unreadAiCount: unreadAi.length,
      unreadAllCount: unreadAll.length,
    });
  },
  
  upsertNotification: (notification) => {
    const { notifications } = get();
    const existingIndex = notifications.findIndex(n => n.id === notification.id);
    const newNotifications = existingIndex >= 0
      ? notifications.map((n, i) => i === existingIndex ? notification : n)
      : [...notifications, notification];
    
    const unreadAll = newNotifications.filter(n => !n.is_read);
    const unreadAi = unreadAll.filter(n => n.type.startsWith('job_'));
    set({ 
      notifications: newNotifications, 
      unreadCount: unreadAi.length,
      unreadAiCount: unreadAi.length,
      unreadAllCount: unreadAll.length,
    });
  },
  
  markNotificationRead: (notificationId) => {
    const { notifications } = get();
    const newNotifications = notifications.map(n =>
      n.id === notificationId ? { ...n, is_read: true } : n
    );
    const unreadAll = newNotifications.filter(n => !n.is_read);
    const unreadAi = unreadAll.filter(n => n.type.startsWith('job_'));
    set({ 
      notifications: newNotifications, 
      unreadCount: unreadAi.length,
      unreadAiCount: unreadAi.length,
      unreadAllCount: unreadAll.length,
    });
  },
  
  markAllNotificationsRead: () => {
    const { notifications } = get();
    const newNotifications = notifications.map(n => ({ ...n, is_read: true }));
    set({ 
      notifications: newNotifications, 
      unreadCount: 0,
      unreadAiCount: 0,
      unreadAllCount: 0,
    });
  },
  
  // Computed getters
  getJobsByTab: (tab) => {
    const { jobs } = get();
    switch (tab) {
      case 'active':
        return jobs.filter(j => j.status === 'queued' || j.status === 'running');
      case 'needs_you':
        return jobs.filter(j => j.status === 'needs_user');
      case 'completed':
        return jobs.filter(j => j.status === 'completed' || j.status === 'failed');
      default:
        return [];
    }
  },
}));

















