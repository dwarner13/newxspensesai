/**
 * NotificationsPanel Component
 * 
 * Premium dropdown/slide panel for viewing notifications
 * Shows recent notifications with unread styling
 * Clicking job-related notifications opens Jobs Drawer focused on that job
 */

import React from 'react';
import { X, CheckCircle, AlertCircle, Info, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobsSystemStore, type Notification } from '../../state/jobsSystemStore';
import { getSupabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const { 
    notifications, 
    unreadAllCount,
    markNotificationRead, 
    markAllNotificationsRead,
    setDrawerOpen,
    focusJob,
  } = useJobsSystemStore();
  
  // Get 20 most recent notifications
  const recentNotifications = notifications
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);
  
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      markNotificationRead(notification.id);
      
      // Update in database
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);
      }
    }
    
    // If job-related, open Jobs Drawer focused on that job
    if (notification.job_id) {
      focusJob(notification.job_id);
      setDrawerOpen(true);
      onClose();
    }
  };
  
  const handleMarkAllRead = async () => {
    markAllNotificationsRead();
    
    // Update in database
    const supabase = getSupabase();
    if (supabase && unreadAllCount > 0) {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    }
  };
  
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'job_completed':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'job_needs_user':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'job_failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'system_info':
        return <Info className="w-4 h-4 text-blue-400" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'ease-out' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[75]"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
            className="absolute right-0 top-full mt-2 w-96 bg-slate-950/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl z-[80] max-h-[80vh] flex flex-col transform-gpu"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                {unreadAllCount > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">{unreadAllCount} unread</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadAllCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Mark all as read"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4 text-slate-400" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                    <Info className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-400">No notifications</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {recentNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-all duration-200",
                        "hover:bg-white/5",
                        !notification.is_read && "bg-blue-500/10 border-l-2 border-blue-500"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium",
                            notification.is_read ? "text-slate-300" : "text-white"
                          )}>
                            {notification.title}
                          </p>
                          {notification.body && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {notification.body}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 mt-1">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                        
                        {/* Unread indicator */}
                        {!notification.is_read && (
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

















