/**
 * Seed Activity Events - Helper function to create test events
 * 
 * POST /.netlify/functions/seed-activity-events
 * Body: { userId, count?: number }
 * 
 * Creates sample activity events for testing the Activity Feed.
 * This is a development/testing helper - should be disabled in production.
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase';

const SAMPLE_EVENTS = [
  {
    actor_slug: 'prime-boss',
    actor_label: 'Prime',
    title: 'Prime routed a question to Tag — Categories updated',
    description: 'Tag analyzed and updated transaction categories',
    category: 'categories',
    severity: 'success' as const,
    metadata: { routed_to: 'tag-ai', transaction_count: 18 },
  },
  {
    actor_slug: 'byte-ai',
    actor_label: 'Byte',
    title: 'Byte processed 24 new transactions',
    description: 'Successfully extracted and parsed transaction data',
    category: 'import',
    severity: 'success' as const,
    metadata: { transaction_count: 24, source: 'csv_upload' },
  },
  {
    actor_slug: 'liberty-ai',
    actor_label: 'Liberty',
    title: 'Liberty updated your debt payoff plan',
    description: 'Optimized payment schedule based on recent activity',
    category: 'debt',
    severity: 'success' as const,
    metadata: { plan_updated: true, savings_estimate: 1250 },
  },
  {
    actor_slug: 'crystal-ai',
    actor_label: 'Crystal',
    title: 'Crystal detected a spending pattern',
    description: 'Unusual increase in dining expenses this month',
    category: 'analytics',
    severity: 'info' as const,
    metadata: { pattern_type: 'spending_increase', category: 'dining' },
  },
  {
    actor_slug: 'tag-ai',
    actor_label: 'Tag',
    title: 'Tag auto-categorized 18 transactions',
    description: 'Applied learned rules to categorize transactions',
    category: 'categories',
    severity: 'success' as const,
    metadata: { categorized_count: 18, confidence_avg: 0.92 },
  },
  {
    actor_slug: 'goalie',
    actor_label: 'Goalie',
    title: 'Goalie reviewed your budget goals',
    description: 'Checked progress on monthly savings target',
    category: 'goals',
    severity: 'info' as const,
    metadata: { goal_id: 'monthly_savings', progress: 0.75 },
  },
  {
    actor_slug: 'ledger',
    actor_label: 'Ledger',
    title: 'Ledger identified 3 tax deductions',
    description: 'Found potential business expense deductions',
    category: 'tax',
    severity: 'success' as const,
    metadata: { deduction_count: 3, estimated_savings: 450 },
  },
  {
    actor_slug: 'byte-ai',
    actor_label: 'Byte',
    title: 'Byte extracted data from receipt_2024.pdf',
    description: 'OCR processing completed successfully',
    category: 'import',
    severity: 'success' as const,
    metadata: { file_name: 'receipt_2024.pdf', items_extracted: 5 },
  },
];

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { userId, count = 5 } = body;

    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing userId' }),
      };
    }

    const sb = admin();

    // Select random events up to count
    const eventsToCreate = SAMPLE_EVENTS.slice(0, Math.min(count, SAMPLE_EVENTS.length));

    // Create events with staggered timestamps (most recent first)
    const now = new Date();
    const events = eventsToCreate.map((event, index) => ({
      user_id: userId,
      ...event,
      created_at: new Date(now.getTime() - index * 5 * 60 * 1000).toISOString(), // 5 minutes apart
      metadata: event.metadata || {},
    }));

    const { data, error } = await sb
      .from('activity_events')
      .insert(events)
      .select('id');

    if (error) {
      console.error('[seed-activity-events] Supabase error:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to seed events', details: error.message }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        created: data?.length || 0,
        message: `Created ${data?.length || 0} test activity events`,
      }),
    };
  } catch (error: any) {
    console.error('[seed-activity-events] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};








