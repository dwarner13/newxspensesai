/**
 * useJobsRealtime Hook
 * 
 * Subscribes to Supabase Realtime for jobs and notifications
 * Updates jobsSystemStore automatically when changes occur
 */

import { useEffect } from 'react';
import * as React from 'react';
import { getSupabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useJobsSystemStore, type Job, type Notification } from '../../state/jobsSystemStore';
import toast from 'react-hot-toast';

export function useJobsRealtime() {
  const { userId, isDemoUser } = useAuth();
  const { upsertJob, upsertNotification, setJobs, setNotifications } = useJobsSystemStore();
  
  // Use demo user ID if in demo mode
  const effectiveUserId = userId || (isDemoUser ? '00000000-0000-4000-8000-000000000001' : null);
  
  // Track if jobs table exists to prevent retrying
  const [jobsTableExists, setJobsTableExists] = React.useState<boolean | null>(null);
  const [notificationsTableExists, setNotificationsTableExists] = React.useState<boolean | null>(null);
  
  useEffect(() => {
    if (!effectiveUserId) return;
    
    const supabase = getSupabase();
    if (!supabase) {
      console.warn('[useJobsRealtime] Supabase not available');
      return;
    }
    
    // If we already know the table doesn't exist, skip loading
    if (jobsTableExists === false) {
      setJobs([]);
      return;
    }
    
    // Load initial jobs (fail gracefully if table doesn't exist)
    supabase
      .from('jobs')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) {
          // Silently handle 404 (table doesn't exist) - this is expected if migration hasn't run
          // PGRST116 = relation does not exist, 42P01 = undefined table (PostgreSQL error codes)
          if (error.code === 'PGRST116' || 
              error.code === '42P01' ||
              error.message?.includes('does not exist') ||
              (error.message?.includes('relation') && error.message?.includes('does not exist'))) {
            // Table doesn't exist yet - fail gracefully, return empty array, mark as non-existent
            if (jobsTableExists === null) {
              console.warn('[useJobsRealtime] Jobs table does not exist - feature disabled. Run migration to enable.');
            }
            setJobsTableExists(false);
            setJobs([]);
            return;
          }
          // Log other errors for debugging (only once)
          if (jobsTableExists === null) {
            console.warn('[useJobsRealtime] Error loading jobs:', error.message);
          }
          setJobs([]);
          return;
        }
        // Table exists and query succeeded
        setJobsTableExists(true);
        if (data) {
          setJobs(data as Job[]);
        } else {
          setJobs([]);
        }
      })
      .catch((err) => {
        // Catch any unexpected errors (network, etc.) and fail gracefully
        if (jobsTableExists === null) {
          console.debug('[useJobsRealtime] Jobs table query failed (may not exist):', err.message);
        }
        setJobs([]);
      });
    
    // If we already know the table doesn't exist, skip loading
    if (notificationsTableExists === false) {
      setNotifications([]);
      return;
    }
    
    // Load initial notifications (fail gracefully if table doesn't exist)
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          // Silently handle 404 (table doesn't exist) - this is expected if migration hasn't run
          // PGRST116 = relation does not exist, 42P01 = undefined table (PostgreSQL error codes)
          if (error.code === 'PGRST116' || 
              error.code === '42P01' ||
              error.message?.includes('does not exist') ||
              (error.message?.includes('relation') && error.message?.includes('does not exist'))) {
            // Table doesn't exist yet - fail gracefully, return empty array, mark as non-existent
            if (notificationsTableExists === null) {
              console.warn('[useJobsRealtime] Notifications table does not exist - feature disabled. Run migration to enable.');
            }
            setNotificationsTableExists(false);
            setNotifications([]);
            return;
          }
          // Log other errors for debugging (only once)
          if (notificationsTableExists === null) {
            console.warn('[useJobsRealtime] Error loading notifications:', error.message);
          }
          setNotifications([]);
          return;
        }
        // Table exists and query succeeded
        setNotificationsTableExists(true);
        if (data) {
          setNotifications(data as Notification[]);
        } else {
          setNotifications([]);
        }
      })
      .catch((err) => {
        // Catch any unexpected errors (network, etc.) and fail gracefully
        if (notificationsTableExists === null) {
          console.debug('[useJobsRealtime] Notifications table query failed (may not exist):', err.message);
        }
        setNotifications([]);
      });
    
    // Subscribe to jobs changes (fail gracefully if table doesn't exist)
    // Only subscribe if table exists
    let jobsChannel: ReturnType<typeof supabase.channel> | null = null;
    if (jobsTableExists !== false) {
      jobsChannel = supabase
        .channel('jobs-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'jobs',
            filter: `user_id=eq.${effectiveUserId}`,
          },
          (payload) => {
            console.log('[useJobsRealtime] Job update:', payload.eventType, payload.new);
            
            if (payload.new) {
              const job = payload.new as Job;
              upsertJob(job);
              
              // Show toast for meaningful status changes
              if (payload.eventType === 'UPDATE') {
                const oldStatus = payload.old?.status;
                const newStatus = job.status;
                
                if (oldStatus !== newStatus) {
                  if (newStatus === 'completed') {
                    toast.success(`Job completed: ${job.title}`, {
                      duration: 4000,
                      icon: '✅',
                    });
                  } else if (newStatus === 'needs_user') {
                    toast(`Action needed: ${job.title}`, {
                      duration: 5000,
                      icon: '⚠️',
                      style: {
                        background: '#f59e0b',
                        color: '#fff',
                      },
                    });
                  } else if (newStatus === 'failed') {
                    toast.error(`Job failed: ${job.title}`, {
                      duration: 5000,
                    });
                  }
                }
              }
            }
          }
        )
        .subscribe((status) => {
          // Handle subscription errors gracefully
          if (status === 'SUBSCRIBED') {
            // Successfully subscribed
          } else if (status === 'CHANNEL_ERROR') {
            // Table might not exist - mark as non-existent and fail silently
            setJobsTableExists(false);
            console.debug('[useJobsRealtime] Jobs channel subscription failed (table may not exist)');
          }
        });
    }
    
    // Subscribe to notifications changes (fail gracefully if table doesn't exist)
    // Only subscribe if table exists
    let notificationsChannel: ReturnType<typeof supabase.channel> | null = null;
    if (notificationsTableExists !== false) {
      notificationsChannel = supabase
        .channel('notifications-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${effectiveUserId}`,
          },
          (payload) => {
            console.log('[useJobsRealtime] Notification update:', payload.eventType, payload.new);
            
            if (payload.new) {
              const notification = payload.new as Notification;
              upsertNotification(notification);
              
              // Show toast for new notifications (only meaningful types, only on INSERT)
              if (payload.eventType === 'INSERT') {
                if (notification.type === 'job_completed') {
                  toast.success(notification.title, {
                    duration: 4000,
                    icon: '✅',
                  });
                } else if (notification.type === 'job_needs_user') {
                  toast(`Action needed: ${notification.title}`, {
                    duration: 5000,
                    icon: '⚠️',
                    style: {
                      background: '#f59e0b',
                      color: '#fff',
                    },
                  });
                } else if (notification.type === 'job_failed') {
                  toast.error(notification.title, {
                    duration: 5000,
                  });
                }
              }
            }
          }
        )
        .subscribe((status) => {
          // Handle subscription errors gracefully
          if (status === 'SUBSCRIBED') {
            // Successfully subscribed
          } else if (status === 'CHANNEL_ERROR') {
            // Table might not exist - mark as non-existent and fail silently
            setNotificationsTableExists(false);
            console.debug('[useJobsRealtime] Notifications channel subscription failed (table may not exist)');
          }
        });
    }
    
    return () => {
      if (jobsChannel) {
        supabase.removeChannel(jobsChannel);
      }
      if (notificationsChannel) {
        supabase.removeChannel(notificationsChannel);
      }
    };
  }, [effectiveUserId, upsertJob, upsertNotification, setJobs, setNotifications, jobsTableExists, notificationsTableExists]);
}



