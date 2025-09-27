import { z } from 'zod';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'set_reminder';

export const inputSchema = z.object({
  type: z.enum(['monthly_report', 'filing_deadline', 'anomaly_check', 'custom']),
  cron: z.string(),
  timezone: z.string().default('UTC'),
  payload: z.any().optional(),
  enabled: z.boolean().default(true),
  confirm: z.boolean().optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  reminder_id: z.string().optional(),
  next_run: z.string().optional(),
  message: z.string(),
});

export async function execute(input: any, ctx: any) {
  const client = getSupabaseServerClient();
  
  // Parse and validate cron expression
  const parsed = parseCronExpression(input.cron);
  const nextRun = parsed.next().toDate();
  
  const { data: reminder } = await client
    .from('reminder_schedules')
    .upsert({
      user_id: ctx.userId,
      org_id: ctx.orgId,
      type: input.type,
      cron_expression: input.cron,
      timezone: input.timezone,
      payload: input.payload || {},
      enabled: input.enabled,
      next_run_at: nextRun,
    })
    .select()
    .single();
  
  return {
    ok: true,
    reminder_id: reminder.id,
    next_run: nextRun.toISOString(),
    message: `Reminder scheduled for ${nextRun.toLocaleString()}`,
  };
}

function parseCronExpression(cron: string): any {
  // Simple cron parser - in production, use a proper library like 'cron-parser'
  const parts = cron.split(' ');
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression');
  }
  
  // Mock implementation
  return {
    next: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Next day
  };
}

export const metadata = {
  name: 'Set Reminder',
  description: 'Schedule automated reminders and notifications',
  category: 'proactive',
  requiresConfirmation: true,
  mutates: true,
  costly: false,
  timeout: 10000,
};
