import { getSupabaseServerClient } from '../../server/db';

export interface Entitlements {
  features: string[];
  allowedTools: string[];
  limits: {
    ocrPages: number | null;
    apiCalls: number | null;
    storageGb: number | null;
    teamSeats: number | null;
  };
  usage: {
    ocrPages: number;
    apiCalls: number;
    storageGb: number;
  };
  isWithinLimits: boolean;
  isInTrial: boolean;
  isInGracePeriod: boolean;
  subscriptionStatus: string;
  planId: string;
}

// Feature to tool mapping
const FEATURE_TOOL_MAP = {
  'ocr_processing': ['ingest_statement_enhanced'],
  'advanced_reports': ['generate_monthly_report_enhanced'],
  'anomaly_detection': ['detect_anomalies'],
  'merchant_enrichment': ['merchant_lookup'],
  'bulk_operations': ['bulk_categorize'],
  'data_export': ['export_my_data'],
  'data_deletion': ['delete_my_data'],
  'team_collaboration': ['team_management'],
  'api_access': ['api_integration'],
  'priority_support': ['support_ticket'],
};

export async function resolveEntitlements(userId: string): Promise<Entitlements> {
  const client = getSupabaseServerClient();
  
  // Get profile with plan
  const { data: profile } = await client
    .from('profiles')
    .select(`
      *,
      plans!inner(*)
    `)
    .eq('id', userId)
    .single();
  
  if (!profile) {
    throw new Error('Profile not found');
  }
  
  // Check subscription status
  const now = new Date();
  const isInTrial = profile.trial_ends_at && new Date(profile.trial_ends_at) > now;
  const isInGracePeriod = profile.grace_period_ends_at && new Date(profile.grace_period_ends_at) > now;
  const isActive = profile.subscription_status === 'active' || isInTrial || isInGracePeriod;
  
  if (!isActive) {
    // Downgrade to free if subscription inactive
    profile.plan_id = 'free';
  }
  
  // Get plan features
  const planFeatures = profile.plans?.features || [];
  
  // Get manual features
  const manualFeatures = profile.features || [];
  
  // Get addon features
  const { data: addons } = await client
    .from('user_addons')
    .select('addons!inner(feature_flag)')
    .eq('user_id', userId)
    .eq('status', 'active');
  
  const addonFeatures = addons?.map(a => a.addons.feature_flag) || [];
  
  // Combine all features
  const allFeatures = new Set([
    ...planFeatures,
    ...manualFeatures,
    ...addonFeatures,
  ]);
  
  // Map to tools
  const allowedTools = new Set(['delete_my_data', 'export_my_data']);
  for (const feature of allFeatures) {
    const tools = FEATURE_TOOL_MAP[feature as keyof typeof FEATURE_TOOL_MAP];
    if (tools) {
      tools.forEach(t => allowedTools.add(t));
    }
  }
  
  // Get limits
  const { data: limits } = await client
    .from('plan_limits')
    .select('*')
    .eq('plan_id', profile.plan_id)
    .single();
  
  // Get current usage
  const period = new Date();
  const periodStart = new Date(period.getFullYear(), period.getMonth(), 1);
  const periodEnd = new Date(period.getFullYear(), period.getMonth() + 1, 0);
  
  const { data: usage } = await client
    .from('usage_records')
    .select('resource_type, quantity')
    .eq('user_id', userId)
    .gte('period_start', periodStart.toISOString())
    .lte('period_end', periodEnd.toISOString());
  
  const usageTotals = {
    ocrPages: 0,
    apiCalls: 0,
    storageGb: 0,
  };
  
  for (const record of usage || []) {
    switch (record.resource_type) {
      case 'ocr':
        usageTotals.ocrPages += Number(record.quantity);
        break;
      case 'api_call':
        usageTotals.apiCalls += Number(record.quantity);
        break;
      case 'storage_gb':
        usageTotals.storageGb += Number(record.quantity);
        break;
    }
  }
  
  // Check if within limits
  const isWithinLimits = 
    (!limits?.ocr_pages_month || usageTotals.ocrPages <= limits.ocr_pages_month) &&
    (!limits?.api_calls_month || usageTotals.apiCalls <= limits.api_calls_month) &&
    (!limits?.storage_gb || usageTotals.storageGb <= limits.storage_gb);
  
  return {
    features: Array.from(allFeatures),
    allowedTools: Array.from(allowedTools),
    limits: {
      ocrPages: limits?.ocr_pages_month || null,
      apiCalls: limits?.api_calls_month || null,
      storageGb: limits?.storage_gb || null,
      teamSeats: limits?.team_seats || null,
    },
    usage: usageTotals,
    isWithinLimits,
    isInTrial,
    isInGracePeriod,
    subscriptionStatus: profile.subscription_status,
    planId: profile.plan_id,
  };
}

export async function checkUsageLimit(
  userId: string,
  resourceType: 'ocr' | 'api_call' | 'storage_gb',
  quantity: number
): Promise<boolean> {
  const client = getSupabaseServerClient();
  
  const { data } = await client
    .rpc('check_usage_limit', {
      p_user_id: userId,
      p_resource_type: resourceType,
      p_quantity: quantity,
    });
  
  return data || false;
}

export async function recordUsage(
  userId: string,
  resourceType: 'ocr' | 'api_call' | 'storage_gb',
  quantity: number
): Promise<void> {
  const client = getSupabaseServerClient();
  
  const period = new Date();
  const periodStart = new Date(period.getFullYear(), period.getMonth(), 1);
  const periodEnd = new Date(period.getFullYear(), period.getMonth() + 1, 0);
  
  await client
    .from('usage_records')
    .insert({
      user_id: userId,
      resource_type: resourceType,
      quantity,
      unit: getUnit(resourceType),
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    });
}

function getUnit(resourceType: string): string {
  const units: Record<string, string> = {
    ocr: 'page',
    api_call: 'call',
    storage_gb: 'gb',
  };
  return units[resourceType] || 'unit';
}

export async function getUsageSummary(userId: string): Promise<{
  current: Record<string, number>;
  limits: Record<string, number | null>;
  percentUsed: Record<string, number>;
}> {
  const entitlements = await resolveEntitlements(userId);
  
  const current = {
    ocrPages: entitlements.usage.ocrPages,
    apiCalls: entitlements.usage.apiCalls,
    storageGb: entitlements.usage.storageGb,
  };
  
  const limits = {
    ocrPages: entitlements.limits.ocrPages,
    apiCalls: entitlements.limits.apiCalls,
    storageGb: entitlements.limits.storageGb,
  };
  
  const percentUsed = {
    ocrPages: limits.ocrPages ? (current.ocrPages / limits.ocrPages) * 100 : 0,
    apiCalls: limits.apiCalls ? (current.apiCalls / limits.apiCalls) * 100 : 0,
    storageGb: limits.storageGb ? (current.storageGb / limits.storageGb) * 100 : 0,
  };
  
  return { current, limits, percentUsed };
}
