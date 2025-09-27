import { getSupabaseServerClient } from '../db';

export interface NotificationPayload {
  userId: string;
  orgId?: string;
  type: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message?: string;
  data?: any;
  actionType?: string;
  actionUrl?: string;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  email_address?: string;
  sms_enabled: boolean;
  sms_number?: string;
  webhook_enabled: boolean;
  webhook_url?: string;
  webhook_secret?: string;
  batching_enabled: boolean;
  batch_schedule: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
  channel_rules?: Record<string, string[]>;
}

export interface Notification {
  id: string;
  user_id: string;
  org_id?: string;
  type: string;
  severity: string;
  title: string;
  message?: string;
  data?: any;
  action_type?: string;
  action_url?: string;
  channels: string[];
  delivered_at?: string;
  read_at?: string;
  dismissed_at?: string;
  created_at: string;
}

export class NotificationService {
  private emailQueue: any[] = [];
  private smsQueue: any[] = [];
  private webhookQueue: any[] = [];
  
  async send(notification: NotificationPayload): Promise<void> {
    const client = getSupabaseServerClient();
    
    // Get user preferences
    const { data: prefs } = await client
      .from('notification_preferences')
      .select('*')
      .eq('user_id', notification.userId)
      .single();
    
    // Determine channels based on severity and preferences
    const channels = this.determineChannels(notification, prefs);
    
    // Check quiet hours
    if (this.isQuietHours(prefs)) {
      if (notification.severity !== 'critical') {
        channels.delete('sms');
        channels.delete('webhook');
      }
    }
    
    // Store notification
    const { data: stored } = await client
      .from('notifications')
      .insert({
        ...notification,
        channels: Array.from(channels),
      })
      .select()
      .single();
    
    // Send to each channel
    await Promise.allSettled([
      channels.has('email') && this.sendEmail(stored, prefs),
      channels.has('sms') && this.sendSMS(stored, prefs),
      channels.has('webhook') && this.sendWebhook(stored, prefs),
      channels.has('in_app') && this.sendInApp(stored),
    ]);
    
    // Update delivery status
    await client
      .from('notifications')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', stored.id);
  }
  
  private determineChannels(
    notification: NotificationPayload,
    prefs: NotificationPreferences
  ): Set<string> {
    const channels = new Set(['in_app']);
    
    // Check channel rules
    const rules = prefs?.channel_rules?.[notification.type];
    if (rules) {
      rules.forEach(channel => channels.add(channel));
    } else {
      // Default rules based on severity
      switch (notification.severity) {
        case 'critical':
          prefs?.email_enabled && channels.add('email');
          prefs?.sms_enabled && channels.add('sms');
          prefs?.webhook_enabled && channels.add('webhook');
          break;
        case 'warning':
          prefs?.email_enabled && channels.add('email');
          prefs?.webhook_enabled && channels.add('webhook');
          break;
        case 'info':
        case 'success':
          prefs?.email_enabled && prefs?.batching_enabled
            ? channels.add('batch')
            : prefs?.email_enabled && channels.add('email');
          break;
      }
    }
    
    return channels;
  }
  
  private async sendEmail(
    notification: Notification,
    prefs: NotificationPreferences
  ): Promise<void> {
    await this.emailQueue.push({
      to: prefs.email_address || notification.user_id,
      subject: notification.title,
      template: this.getEmailTemplate(notification.type),
      data: {
        title: notification.title,
        message: notification.message,
        actionUrl: notification.action_url,
        actionText: this.getActionText(notification.action_type),
        severity: notification.severity,
      },
    });
  }
  
  private async sendSMS(
    notification: Notification,
    prefs: NotificationPreferences
  ): Promise<void> {
    if (!prefs.sms_number) return;
    
    const message = this.formatSMSMessage(notification);
    
    await this.smsQueue.push({
      to: prefs.sms_number,
      message,
    });
  }
  
  private async sendWebhook(
    notification: Notification,
    prefs: NotificationPreferences
  ): Promise<void> {
    if (!prefs.webhook_url) return;
    
    await this.webhookQueue.push({
      url: prefs.webhook_url,
      payload: {
        id: notification.id,
        type: notification.type,
        severity: notification.severity,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: notification.created_at,
      },
      secret: prefs.webhook_secret,
    });
  }
  
  private async sendInApp(notification: Notification): Promise<void> {
    // Broadcast via WebSocket to connected clients
    await this.broadcastToUser(notification.user_id, {
      type: 'notification',
      payload: notification,
    });
  }
  
  private isQuietHours(prefs: NotificationPreferences): boolean {
    if (!prefs?.quiet_hours_start || !prefs?.quiet_hours_end) {
      return false;
    }
    
    const now = new Date();
    const timezone = prefs.timezone || 'UTC';
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const currentTime = localTime.getHours() * 60 + localTime.getMinutes();
    
    const start = this.parseTime(prefs.quiet_hours_start);
    const end = this.parseTime(prefs.quiet_hours_end);
    
    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Crosses midnight
      return currentTime >= start || currentTime <= end;
    }
  }
  
  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  private formatSMSMessage(notification: Notification): string {
    let message = `${notification.title}\n${notification.message}`;
    
    if (notification.action_url) {
      message += `\n${notification.action_url}`;
    }
    
    // Limit to 160 characters
    if (message.length > 160) {
      message = message.substring(0, 157) + '...';
    }
    
    return message;
  }
  
  private getEmailTemplate(type: string): string {
    const templates: Record<string, string> = {
      'anomaly_detected': 'anomaly-alert',
      'team_invitation': 'team-invitation',
      'payment_failed': 'payment-failed',
      'usage_alert': 'usage-alert',
      'monthly_report': 'monthly-report',
    };
    
    return templates[type] || 'default';
  }
  
  private getActionText(actionType?: string): string {
    const actions: Record<string, string> = {
      'link': 'View Details',
      'button': 'Take Action',
      'dismiss': 'Dismiss',
    };
    
    return actions[actionType || 'link'] || 'View Details';
  }
  
  private async broadcastToUser(userId: string, message: any): Promise<void> {
    // This would integrate with WebSocket service
    console.log(`Broadcasting to user ${userId}:`, message);
  }
  
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const client = getSupabaseServerClient();
    
    await client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);
  }
  
  async dismissNotification(notificationId: string, userId: string): Promise<void> {
    const client = getSupabaseServerClient();
    
    await client
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);
  }
  
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    const client = getSupabaseServerClient();
    
    let query = client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (unreadOnly) {
      query = query.is('read_at', null);
    }
    
    const { data } = await query;
    
    return data || [];
  }
  
  async getUnreadCount(userId: string): Promise<number> {
    const client = getSupabaseServerClient();
    
    const { count } = await client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    
    return count || 0;
  }
  
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const client = getSupabaseServerClient();
    
    await client
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      });
  }
}
