import { supabase } from '../lib/supabase';

interface EmailNotificationData {
  type: 'badge_earned' | 'streak_milestone' | 'weekly_progress' | 'goal_completed' | 'xp_milestone';
  user_email: string;
  user_name: string;
  data: {
    badge_name?: string;
    xp_earned?: number;
    streak_days?: number;
    goal_name?: string;
    progress_percent?: number;
    level_reached?: number;
  };
}

export const sendAchievementEmail = async (notificationData: EmailNotificationData) => {
  try {
    // Check if user has email notifications enabled
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_notifications')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    // Default to true if not set
    if (profile?.email_notifications === false) {
      console.log('User has disabled email notifications');
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-achievement-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData),
    });

    if (!response.ok) {
      throw new Error('Failed to send email notification');
    }

    const result = await response.json();
    console.log('Email notification sent:', result);
    
    return result;
  } catch (error) {
    console.error('Error sending email notification:', error);
    // Don't throw error - email failures shouldn't break the app
  }
};

// Helper functions for specific notification types
export const sendBadgeEarnedEmail = async (badgeName: string, xpEarned: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  await sendAchievementEmail({
    type: 'badge_earned',
    user_email: user.email,
    user_name: profile?.display_name || user.email.split('@')[0],
    data: {
      badge_name: badgeName,
      xp_earned: xpEarned
    }
  });
};

export const sendStreakMilestoneEmail = async (streakDays: number, xpEarned: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  await sendAchievementEmail({
    type: 'streak_milestone',
    user_email: user.email,
    user_name: profile?.display_name || user.email.split('@')[0],
    data: {
      streak_days: streakDays,
      xp_earned: xpEarned
    }
  });
};

export const sendWeeklyProgressEmail = async (goalName: string, progressPercent: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  await sendAchievementEmail({
    type: 'weekly_progress',
    user_email: user.email,
    user_name: profile?.display_name || user.email.split('@')[0],
    data: {
      goal_name: goalName,
      progress_percent: progressPercent
    }
  });
};

export const sendGoalCompletedEmail = async (goalName: string, xpEarned: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  await sendAchievementEmail({
    type: 'goal_completed',
    user_email: user.email,
    user_name: profile?.display_name || user.email.split('@')[0],
    data: {
      goal_name: goalName,
      xp_earned: xpEarned
    }
  });
};

export const sendLevelUpEmail = async (levelReached: number, totalXP: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  await sendAchievementEmail({
    type: 'xp_milestone',
    user_email: user.email,
    user_name: profile?.display_name || user.email.split('@')[0],
    data: {
      level_reached: levelReached,
      xp_earned: totalXP
    }
  });
};