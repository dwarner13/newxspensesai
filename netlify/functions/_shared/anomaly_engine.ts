/**
 * Anomaly Detection Engine
 * 
 * Day 16: Supercharged Intelligence Layer
 * 
 * Detects spending anomalies, spikes, and patterns.
 */

export interface AnomalyResult {
  spikes: Array<{ date: string; amount: number; reason: string }>;
  topVendors: Array<{ vendor: string; total: number }>;
  totalsByCategory: Record<string, number>;
}

/**
 * Find anomalies in transaction rows
 * 
 * - Detects spending spikes (amount > 2x average)
 * - Calculates top vendors by total spending
 * - Aggregates totals by category
 */
export function findAnomalies(input: {
  rows: Array<{ date: string; amount: number; category?: string; vendor?: string }>;
}): AnomalyResult {
  // Filter to expenses only (negative amounts)
  const expenses = input.rows
    .filter(r => r.amount < 0)
    .map(r => ({
      ...r,
      amount: Math.abs(r.amount)
    }));
  
  if (expenses.length === 0) {
    return {
      spikes: [],
      topVendors: [],
      totalsByCategory: {}
    };
  }
  
  // Calculate average spending
  const total = expenses.reduce((sum, r) => sum + r.amount, 0);
  const avg = total / expenses.length;
  
  // Detect spikes (> 2x average)
  const spikes = expenses
    .filter(r => r.amount > avg * 2)
    .map(r => ({
      date: r.date,
      amount: r.amount,
      reason: 'spike'
    }));
  
  // Calculate top vendors by total spending
  const vendorTotals = new Map<string, number>();
  expenses.forEach(r => {
    const vendor = r.vendor || 'UNKNOWN';
    vendorTotals.set(vendor, (vendorTotals.get(vendor) || 0) + r.amount);
  });
  
  const topVendors = Array.from(vendorTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([vendor, total]) => ({
      vendor,
      total
    }));
  
  // Aggregate totals by category
  const totalsByCategory: Record<string, number> = {};
  expenses.forEach(r => {
    const category = r.category || 'Other';
    totalsByCategory[category] = (totalsByCategory[category] || 0) + r.amount;
  });
  
  return {
    spikes,
    topVendors,
    totalsByCategory
  };
}







