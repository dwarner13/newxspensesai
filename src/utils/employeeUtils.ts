/**
 * Employee Utilities
 * Helper functions to get employee information from slugs
 */

import { EMPLOYEES, type Employee } from '../data/aiEmployees';

// Map canonical slugs to employee keys
const SLUG_TO_KEY: Record<string, string> = {
  'prime-boss': 'prime',
  'prime-ai': 'prime',
  'byte-doc': 'byte',
  'byte-docs': 'byte',
  'byte-ai': 'byte',
  'tag-ai': 'tag',
  'crystal-analytics': 'crystal',
  'crystal-ai': 'crystal',
  'blitz-debt': 'blitz',
  'blitz-ai': 'blitz',
  'liberty-freedom': 'liberty',
  'liberty-ai': 'liberty',
  'goalie-goals': 'goalie',
  'goalie-ai': 'goalie',
  'finley-financial': 'finley',
  'finley-forecasts': 'finley',
  'finley-ai': 'finley', // Legacy, kept for backward compatibility
  'ledger-tax': 'ledger',
  'chime-reminders': 'chime',
  'chime-ai': 'chime',
};

export interface EmployeeInfo {
  key: string;
  name: string;
  emoji: string;
  role: string;
  slug: string;
}

/**
 * Get employee info from slug
 */
export function getEmployeeInfo(slug: string | null | undefined): EmployeeInfo {
  if (!slug) {
    return getEmployeeInfo('prime-boss'); // Default to Prime
  }

  // Normalize slug
  const normalizedSlug = slug.toLowerCase().trim();
  
  // Map slug to key
  const key = SLUG_TO_KEY[normalizedSlug] || normalizedSlug.split('-')[0];
  
  // Find employee
  const employee = EMPLOYEES.find(e => e.key === key);
  
  if (employee) {
    return {
      key: employee.key,
      name: employee.name,
      emoji: employee.emoji || '🤖',
      role: employee.short || 'AI Assistant',
      slug: normalizedSlug,
    };
  }

  // Fallback to Prime
  const prime = EMPLOYEES.find(e => e.key === 'prime')!;
  return {
    key: prime.key,
    name: prime.name,
    emoji: prime.emoji || '👑',
    role: prime.short,
    slug: 'prime-boss',
  };
}

/**
 * Get employee emoji from slug
 */
export function getEmployeeEmoji(slug: string | null | undefined): string {
  return getEmployeeInfo(slug).emoji;
}

/**
 * Get employee name from slug
 */
export function getEmployeeName(slug: string | null | undefined): string {
  return getEmployeeInfo(slug).name;
}

/**
 * Get employee role from slug
 */
export function getEmployeeRole(slug: string | null | undefined): string {
  return getEmployeeInfo(slug).role;
}

/**
 * Get employee display info for side tab (emoji + short name)
 */
export function getEmployeeDisplayForSlug(slug: string | null | undefined): {
  emoji: string;
  shortName: string;
} {
  const info = getEmployeeInfo(slug);
  return {
    emoji: info.emoji,
    shortName: info.name,
  };
}

/**
 * Get employee display info (emoji + short name)
 */
export function getEmployeeDisplay(slug?: string): {
  emoji: string;
  shortName: string;
} {
  const normalizedSlug = slug?.toLowerCase().trim() || 'prime-boss';
  
  // Check if it's Prime
  const isPrime = !slug || 
                  normalizedSlug === 'prime-boss' || 
                  normalizedSlug === 'prime-ai' ||
                  normalizedSlug.startsWith('prime');
  
  if (isPrime) {
    return { emoji: '👑', shortName: 'Prime' };
  }
  
  // Map other employees
  switch (normalizedSlug) {
    case 'byte-ai':
    case 'byte-doc':
    case 'byte-docs':
      return { emoji: '📥', shortName: 'Byte' };
    case 'tag-ai':
      return { emoji: '🏷️', shortName: 'Tag' };
    case 'crystal-ai':
    case 'crystal-analytics':
      return { emoji: '📊', shortName: 'Crystal' };
    case 'blitz-ai':
    case 'blitz-debt':
    case 'debt-payoff-planner':
      return { emoji: '🔥', shortName: 'Spark' };
    case 'liberty-ai':
    case 'liberty-freedom':
      return { emoji: '🗽', shortName: 'Liberty' };
    case 'goalie-ai':
    case 'goalie-goals':
      return { emoji: '🎯', shortName: 'Goalie' };
    case 'finley-ai':
    case 'finley-financial':
      return { emoji: '🧮', shortName: 'Finley' };
    case 'chime-ai':
    case 'chime-reminders':
      return { emoji: '🔔', shortName: 'Chime' };
    case 'ledger-tax':
      return { emoji: '📋', shortName: 'Ledger' };
    default:
      // Fallback: get from employee info
      const info = getEmployeeInfo(slug);
      return { emoji: info.emoji, shortName: info.name };
  }
}

/**
 * Get chat tab display info (emoji + label) for the side tab
 * Returns "Chat with Prime" for Prime, "Work with [Employee]" for others
 */
export function getChatTabDisplay(slug?: string): {
  emoji: string;
  label: string;
} {
  const normalizedSlug = slug?.toLowerCase().trim() || 'prime-boss';
  
  // Check if it's Prime
  const isPrime = !slug || 
                  normalizedSlug === 'prime-boss' || 
                  normalizedSlug === 'prime-ai' ||
                  normalizedSlug.startsWith('prime');
  
  if (isPrime) {
    return { emoji: '👑', label: 'Chat with Prime' };
  }
  
  // Map other employees
  switch (normalizedSlug) {
    case 'byte-ai':
    case 'byte-doc':
    case 'byte-docs':
      return { emoji: '📄', label: 'Work with Byte' };
    case 'tag-ai':
      return { emoji: '🏷️', label: 'Work with Tag' };
    case 'crystal-ai':
    case 'crystal-analytics':
      return { emoji: '📊', label: 'Work with Crystal' };
    case 'blitz-ai':
    case 'blitz-debt':
    case 'debt-payoff-planner':
      return { emoji: '🔥', label: 'Work with Spark' };
    case 'liberty-ai':
    case 'liberty-freedom':
      return { emoji: '🗽', label: 'Work with Liberty' };
    case 'goalie-ai':
    case 'goalie-goals':
      return { emoji: '🥅', label: 'Work with Goalie' };
    case 'finley-ai':
    case 'finley-financial':
      return { emoji: '📈', label: 'Work with Finley' };
    case 'chime-ai':
    case 'chime-reminders':
      return { emoji: '🔔', label: 'Work with Chime' };
    case 'ledger-tax':
      return { emoji: '📋', label: 'Work with Ledger' };
    default:
      // Fallback: get from employee info
      const info = getEmployeeInfo(slug);
      return { emoji: info.emoji, label: `Work with ${info.name}` };
  }
}

/**
 * Get chat button display info (emoji + label) for the side tab
 * This is an alias for getChatTabDisplay for consistency
 */
export function getChatButtonDisplay(slug?: string): {
  emoji: string;
  label: string;
} {
  return getChatTabDisplay(slug);
}

