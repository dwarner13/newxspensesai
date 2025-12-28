/**
 * Story & Therapist Modules
 * 
 * Day 16: Supercharged Intelligence Layer
 * 
 * Generates human-readable stories and therapist tips from spending data.
 */

export interface StoryInput {
  totalsByCategory: Record<string, number>;
  topVendors: Array<{ vendor: string; total: number }>;
}

export interface TherapistInput {
  goal?: string;
}

/**
 * Generate a Prime story from spending analysis
 */
export function makePrimeStory(input: StoryInput): string {
  const groceries = input.totalsByCategory['Groceries'] || 0;
  const entertainment = input.totalsByCategory['Entertainment'] || 0;
  const transport = input.totalsByCategory['Transport'] || 0;
  const shopping = input.totalsByCategory['Shopping'] || 0;
  
  const topVendor = input.topVendors?.[0];
  const win = topVendor 
    ? `Consider trimming ${topVendor.vendor} ($${topVendor.total.toFixed(0)}).` 
    : `Spending looks balanced.`;
  
  const parts: string[] = [];
  
  // What happened
  const categoryParts: string[] = [];
  if (groceries > 0) categoryParts.push(`Groceries $${groceries.toFixed(0)}`);
  if (entertainment > 0) categoryParts.push(`Entertainment $${entertainment.toFixed(0)}`);
  if (transport > 0) categoryParts.push(`Transport $${transport.toFixed(0)}`);
  if (shopping > 0) categoryParts.push(`Shopping $${shopping.toFixed(0)}`);
  
  parts.push(`What happened: ${categoryParts.join(', ')}.`);
  
  // Why it matters
  parts.push(`Why it matters: Small recurring costs add up; focus on the biggest vendor.`);
  
  // Quick wins
  parts.push(`2 quick wins: 1) ${win} 2) Set a weekly cap and check in on Fridays.`);
  
  return parts.join(' ');
}

/**
 * Generate therapist tips for financial wellness
 */
export function makeTherapistTips(input: TherapistInput = {}): string {
  const tips = [
    `• Pick one small habit to change this week (e.g., $10/day snack cap).`,
    `• Set a reminder for Friday to review wins.`,
    `• One tiny action: cancel 1 unused subscription today.`
  ];
  
  if (input.goal) {
    tips.unshift(`• Remember your goal: ${input.goal}. Take one step today.`);
  }
  
  return tips.join('\n');
}







