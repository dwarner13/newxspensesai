/**
 * Employee Capability Map
 * 
 * Day 16: Supercharged Intelligence Layer
 * 
 * Maps each employee to the tools they can execute via ToolRouter.
 * Used to enforce capability-based access control.
 */

export const CAPABILITIES: Record<string, string[]> = {
  prime: ['bank_parse', 'vendor_normalize', 'categorize', 'anomaly_detect', 'story', 'therapist'],
  byte: ['bank_parse', 'vendor_normalize'],
  tag: ['categorize'],
  crystal: ['anomaly_detect', 'bank_parse', 'categorize'], // Allow CSV parsing for anomaly analysis
  goalie: ['create_goal', 'update_goal', 'set_reminder'],
  blitz: ['calculate_debt_payoff', 'optimize_payment_order'],
  ledger: ['lookup_tax_deduction', 'calculate_tax'],
  automa: ['create_rule', 'enable_automation'],
  chime: ['create_bill', 'pay_bill'],
  liberty: [],
  serenity: ['therapist'],
  harmony: ['therapist'],
  wave: [],
  intelia: ['anomaly_detect'],
  dash: ['anomaly_detect'],
  custodian: [],
  roundtable: ['story']
};

