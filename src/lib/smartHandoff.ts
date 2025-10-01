// Smart Handoff System - Context-aware routing from Prime Boss to AI Employees
// This system stores user questions and provides context to AI employees

import { supabase } from './supabase';
import { EMPLOYEES, findEmployeeByIntent } from '../data/aiEmployees';

export interface HandoffContext {
  id: string;
  user_id: string;
  original_question: string;
  routed_employee_key: string;
  context_data: Record<string, any>;
  created_at: string;
  expires_at: string;
  used: boolean;
}

export interface SmartHandoffRequest {
  user_id: string;
  original_question: string;
  user_context?: Record<string, any>;
}

export interface SmartHandoffResponse {
  success: boolean;
  employee_key: string;
  employee_name: string;
  employee_emoji: string;
  handoff_id: string;
  welcome_message: string;
  context_summary: string;
}

// Create a smart handoff session
export async function createSmartHandoff(request: SmartHandoffRequest): Promise<SmartHandoffResponse | null> {
  try {
    const { user_id, original_question, user_context = {} } = request;
    
    // Find the best AI employee for this question
    const employee = findEmployeeByIntent(original_question);
    
    if (!employee) {
      console.error('No suitable AI employee found for question:', original_question);
      return null;
    }

    // Generate handoff ID
    const handoff_id = `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create context data
    const context_data = {
      original_question,
      user_context,
      routing_timestamp: new Date().toISOString(),
      question_analysis: analyzeQuestion(original_question)
    };

    // Store handoff context in database
    const { error } = await supabase
      .from('smart_handoffs')
      .insert({
        id: handoff_id,
        user_id,
        original_question,
        routed_employee_key: employee.key,
        context_data,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        used: false});

    if (error) {
      console.error('Error creating smart handoff:', error);
      return null;
    }

    // Generate personalized welcome message
    const welcome_message = generateWelcomeMessage(employee, original_question, context_data);
    const context_summary = generateContextSummary(original_question, context_data);

    return {
      success: true,
      employee_key: employee.key,
      employee_name: employee.name,
      employee_emoji: employee.emoji || '🤖',
      handoff_id,
      welcome_message,
      context_summary
    };

  } catch (error) {
    console.error('Error in createSmartHandoff:', error);
    return null;
  }
}

// Retrieve handoff context for an AI employee
export async function getHandoffContext(handoff_id: string): Promise<HandoffContext | null> {
  try {
    const { data, error } = await supabase
      .from('smart_handoffs')
      .select('*')
      .eq('id', handoff_id)
      .eq('used', false)
      .single();

    if (error) {
      console.error('Error fetching handoff context:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getHandoffContext:', error);
    return null;
  }
}

// Mark handoff as used
export async function markHandoffUsed(handoff_id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('smart_handoffs')
      .update({ used: true })
      .eq('id', handoff_id);

    if (error) {
      console.error('Error marking handoff as used:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markHandoffUsed:', error);
    return false;
  }
}

// Get recent handoffs for a user
export async function getUserRecentHandoffs(user_id: string, limit: number = 5): Promise<HandoffContext[]> {
  try {
    const { data, error } = await supabase
      .from('smart_handoffs')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user handoffs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserRecentHandoffs:', error);
    return [];
  }
}

// Analyze the user's question to extract key information
function analyzeQuestion(question: string): Record<string, any> {
  const analysis: Record<string, any> = {
    keywords: [],
    intent: 'general',
    urgency: 'normal',
    topic: 'financial',
    amount_mentioned: null,
    timeframe_mentioned: null
  };

  const q = question.toLowerCase();

  // Extract amounts
  const amountMatch = q.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (amountMatch) {
    analysis.amount_mentioned = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // Extract timeframes
  const timeframes = ['week', 'month', 'year', 'day', 'daily', 'weekly', 'monthly', 'yearly'];
  for (const timeframe of timeframes) {
    if (q.includes(timeframe)) {
      analysis.timeframe_mentioned = timeframe;
      break;
    }
  }

  // Extract keywords
  const keywords = ['save', 'saving', 'invest', 'budget', 'debt', 'credit', 'goal', 'plan', 'help', 'advice'];
  analysis.keywords = keywords.filter(keyword => q.includes(keyword));

  // Determine intent
  if (q.includes('save') || q.includes('saving')) {
    analysis.intent = 'saving';
  } else if (q.includes('invest') || q.includes('investment')) {
    analysis.intent = 'investment';
  } else if (q.includes('debt') || q.includes('pay off')) {
    analysis.intent = 'debt_management';
  } else if (q.includes('budget') || q.includes('budgeting')) {
    analysis.intent = 'budgeting';
  } else if (q.includes('goal') || q.includes('target')) {
    analysis.intent = 'goal_setting';
  }

  // Determine urgency
  if (q.includes('urgent') || q.includes('asap') || q.includes('immediately')) {
    analysis.urgency = 'high';
  } else if (q.includes('soon') || q.includes('quickly')) {
    analysis.urgency = 'medium';
  }

  return analysis;
}

// Generate personalized welcome message for the AI employee
function generateWelcomeMessage(employee: any, original_question: string, context_data: Record<string, any>): string {
  const analysis = context_data.question_analysis;
  const employee_name = employee.name;
  const emoji = employee.emoji || '🤖';

  // Base welcome message
  let welcome = `Hi! I'm ${employee_name} ${emoji}. Thank you for reaching out!`;

  // Add context about their question
  if (analysis.amount_mentioned) {
    welcome += ` I understand you want to work with $${analysis.amount_mentioned.toLocaleString()}`;
  }

  if (analysis.timeframe_mentioned) {
    welcome += ` over ${analysis.timeframe_mentioned}`;
  }

  if (analysis.intent === 'saving') {
    welcome += ` for your savings goals`;
  } else if (analysis.intent === 'investment') {
    welcome += ` for your investment strategy`;
  } else if (analysis.intent === 'debt_management') {
    welcome += ` for your debt management`;
  } else if (analysis.intent === 'budgeting') {
    welcome += ` for your budgeting needs`;
  } else if (analysis.intent === 'goal_setting') {
    welcome += ` for your financial goals`;
  }

  // Add confirmation
  welcome += `. Do I have that right?`;

  // Add how they can help
  if (employee.key === 'finley') {
    welcome += ` I'm here to help with all your financial planning, budgeting, and investment questions.`;
  } else if (employee.key === 'goalie') {
    welcome += ` I specialize in goal setting and tracking your progress toward financial milestones.`;
  } else if (employee.key === 'crystal') {
    welcome += ` I can help you predict and forecast your financial future based on current trends.`;
  } else if (employee.key === 'luna') {
    welcome += ` I'm here to provide emotional support and help you develop healthy money habits.`;
  } else if (employee.key === 'byte') {
    welcome += ` I can help you import and organize all your financial documents and receipts.`;
  } else if (employee.key === 'ledger') {
    welcome += ` I specialize in tax optimization and helping you maximize your deductions.`;
  } else if (employee.key === 'intelia') {
    welcome += ` I provide business intelligence and insights to help grow your business.`;
  } else if (employee.key === 'automa') {
    welcome += ` I can help you automate repetitive financial tasks and create smart workflows.`;
  }

  return welcome;
}

// Generate context summary for the AI employee
function generateContextSummary(original_question: string, context_data: Record<string, any>): string {
  const analysis = context_data.question_analysis;
  
  let summary = `User's original question: "${original_question}"`;
  
  if (analysis.amount_mentioned) {
    summary += `\nAmount mentioned: $${analysis.amount_mentioned.toLocaleString()}`;
  }
  
  if (analysis.timeframe_mentioned) {
    summary += `\nTimeframe: ${analysis.timeframe_mentioned}`;
  }
  
  if (analysis.keywords.length > 0) {
    summary += `\nKey topics: ${analysis.keywords.join(', ')}`;
  }
  
  summary += `\nIntent: ${analysis.intent}`;
  summary += `\nUrgency: ${analysis.urgency}`;
  
  return summary;
}

// Clean up expired handoffs
export async function cleanupExpiredHandoffs(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('smart_handoffs')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning up expired handoffs:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error in cleanupExpiredHandoffs:', error);
    return 0;
  }
}
