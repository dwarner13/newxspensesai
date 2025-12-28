/**
 * Tool Router
 * 
 * Day 16: Supercharged Intelligence Layer
 * 
 * Routes tool calls to appropriate implementations based on employee capabilities.
 */

import { CAPABILITIES } from './capabilities';
import { parseBank } from './bank_parsers';
import { normalizeVendor } from './vendor_normalize';
import { autoCategorize } from './tx_pipeline';
import { findAnomalies } from './anomaly_engine';
import { makePrimeStory, makeTherapistTips } from './story_therapist';
import * as toolStubs from './tool_stubs';

/**
 * Run a tool for a specific employee
 * 
 * @throws Error if employee doesn't have access to the tool
 */
export async function runTool(employee: string, tool: string, input: any, userId?: string): Promise<any> {
  // Check capability
  if (!CAPABILITIES[employee]?.includes(tool)) {
    throw new Error(`Employee ${employee} cannot run tool ${tool}`);
  }
  
  // Extract userId from input if not provided (for backward compatibility)
  const effectiveUserId = userId || input?.userId || input?.user_id;
  
  // Route to appropriate implementation
  switch (tool) {
    case 'bank_parse':
      return parseBank(input);
    
    case 'vendor_normalize':
      return normalizeVendor(input);
    
    case 'categorize':
      // Pass userId to autoCategorize for Tag learning
      return await autoCategorize(input, effectiveUserId);
    
    case 'anomaly_detect':
      return findAnomalies(input);
    
    case 'story':
      return makePrimeStory(input);
    
    case 'therapist':
      return makeTherapistTips(input);
    
    // Tool stubs (from tool_stubs.ts)
    case 'create_goal':
      return await toolStubs.create_goal(input);
    
    case 'update_goal':
      return await toolStubs.update_goal(input);
    
    case 'set_reminder':
      return await toolStubs.set_reminder(input);
    
    case 'calculate_debt_payoff':
      return await toolStubs.calculate_debt_payoff(input);
    
    case 'optimize_payment_order':
      return await toolStubs.optimize_payment_order(input);
    
    case 'lookup_tax_deduction':
      return await toolStubs.lookup_tax_deduction(input);
    
    case 'calculate_tax':
      return await toolStubs.calculate_tax(input);
    
    case 'create_rule':
      return await toolStubs.create_rule(input);
    
    case 'enable_automation':
      return await toolStubs.enable_automation(input);
    
    case 'create_bill':
      return await toolStubs.create_bill(input);
    
    case 'pay_bill':
      return await toolStubs.pay_bill(input);
    
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}











