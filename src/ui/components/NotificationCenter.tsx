import React, { useState, useEffect } from 'react';

interface Notification {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message?: string;
  action_type?: string;
  action_url?: string;
  read_at?: string;
  created_at: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    loadNotifications();
    subscribeToUpdates();
  }, []);
  
  const loadNotifications = async () => {
    try {
      const response = await fetch('/.netlify/functions/notifications-list', {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
      });
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };
  
  const subscribeToUpdates = () => {
    // WebSocket connection for real-time updates
    const ws = new WebSocket(process.env.REACT_APP_WS_URL || 'ws://localhost:8080');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        setNotifications(prev => [data.payload, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };
  
  const markAsRead = async (id: string) => {
    try {
      await fetch('/.netlify/functions/notifications-mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
        body: JSON.stringify({ id }),
      });
      
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };
  
  const dismissNotification = async (id: string) => {
    try {
      await fetch('/.netlify/functions/notifications-dismiss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
        body: JSON.stringify({ id }),
      });
      
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '⚠️';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => markAsRead(notification.id)}
                onDismiss={() => dismissNotification(notification.id)}
                getSeverityColor={getSeverityColor}
                getSeverityIcon={getSeverityIcon}
              />
            ))}
          </div>
          
          {notifications.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm">No notifications</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationItem({ 
  notification, 
  onRead, 
  onDismiss, 
  getSeverityColor, 
  getSeverityIcon 
}: {
  notification: Notification;
  onRead: () => void;
  onDismiss: () => void;
  getSeverityColor: (severity: string) => string;
  getSeverityIcon: (severity: string) => string;
}) {
  const isUnread = !notification.read_at;
  
  return (
    <div className={`p-4 hover:bg-gray-50 transition-colors ${isUnread ? 'bg-blue-50' : ''}`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${getSeverityColor(notification.severity)}`}>
          {getSeverityIcon(notification.severity)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
              {notification.title}
            </h4>
            <div className="flex items-center space-x-2">
              {isUnread && (
                <button
                  onClick={onRead}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Mark read
                </button>
              )}
              <button
                onClick={onDismiss}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Dismiss
              </button>
            </div>
          </div>
          
          {notification.message && (
            <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
          )}
          
          {notification.action_url && (
            <div className="mt-2">
              <a
                href={notification.action_url}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {notification.action_type === 'button' ? 'Take Action' : 'View Details'} →
              </a>
            </div>
          )}
          
          <p className="mt-1 text-xs text-gray-400">
            {new Date(notification.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
