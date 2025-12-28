/**
 * Employee Registry - Single Source of Truth
 * 
 * Reads employee definitions from Supabase `employee_profiles` table
 * Provides type-safe access to employee data, model configs, and slug resolution
 * 
 * Usage:
 *   import { getEmployee, getAllEmployees, resolveSlug } from '@/employees/registry';
 *   
 *   const employee = await getEmployee('crystal-ai');
 *   const allEmployees = await getAllEmployees();
 *   const canonicalSlug = await resolveSlug('crystal'); // Returns 'crystal-ai'
 */

// Import Supabase client dynamically to support both frontend and backend
// Backend: Uses admin() from netlify/functions/_shared/supabase
// Frontend: Uses getSupabase() from @/lib/supabase

let getSupabaseClient: () => any;

// Determine environment and set up appropriate client
if (typeof window === 'undefined') {
  // Backend (Netlify Functions) - use admin client
  // Use dynamic import for ES modules compatibility
  getSupabaseClient = async () => {
    try {
      const supabaseModule = await import('../../netlify/functions/_shared/supabase.js');
      return supabaseModule.admin();
    } catch (error) {
      console.warn('[EmployeeRegistry] Failed to load backend Supabase client:', error);
      return null;
    }
  };
} else {
  // Frontend - use regular client
  // Use dynamic import for ES modules compatibility
  getSupabaseClient = async () => {
    try {
      const { getSupabase } = await import('@/lib/supabase');
      return getSupabase();
    } catch (error) {
      console.warn('[EmployeeRegistry] Failed to load frontend Supabase client:', error);
      return null;
    }
  };
}

// ============================================================================
// TYPES
// ============================================================================

export interface EmployeeProfile {
  id: string;
  slug: string;
  title: string;
  emoji: string | null;
  system_prompt: string;
  capabilities: string[];
  tools_allowed: string[];
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

// ============================================================================
// CACHE (in-memory cache for performance)
// ============================================================================

let employeeCache: Map<string, EmployeeProfile> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Load all employees from database (with caching)
 */
async function loadEmployees(): Promise<Map<string, EmployeeProfile>> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (employeeCache && (now - cacheTimestamp) < CACHE_TTL) {
    return employeeCache;
  }
  
  try {
    const sb = await getSupabaseClient();
    if (!sb) {
      console.error('[EmployeeRegistry] Supabase client not available');
      return new Map();
    }
    
    const { data, error } = await sb
      .from('employee_profiles')
      .select('*')
      .eq('is_active', true)
      .order('slug');
    
    if (error) {
      console.error('[EmployeeRegistry] Failed to load employees:', error);
      // Return empty map if database fails
      return new Map();
    }
    
    // Build cache
    employeeCache = new Map();
    if (data) {
      for (const emp of data) {
        employeeCache.set(emp.slug, emp as EmployeeProfile);
      }
    }
    
    cacheTimestamp = now;
    console.log(`[EmployeeRegistry] Loaded ${employeeCache.size} active employees`);
    
    return employeeCache;
  } catch (error: any) {
    console.error('[EmployeeRegistry] Error loading employees:', error);
    return new Map();
  }
}

/**
 * Resolve a slug (with alias support) to canonical slug
 */
export async function resolveSlug(inputSlug: string): Promise<string> {
  if (!inputSlug) {
    return 'prime-boss'; // Default
  }
  
  const employees = await loadEmployees();
  
  // Check if it's already a canonical slug
  if (employees.has(inputSlug)) {
    return inputSlug;
  }
  
  // Check aliases via database function
  try {
    const sb = await getSupabaseClient();
    if (!sb) {
      // Fallback to manual alias map (same as main fallback)
      const aliasMap: Record<string, string> = {
        'prime': 'prime-boss',
        'prime-ai': 'prime-boss',
        'byte': 'byte-docs',
        'byte-doc': 'byte-docs',
        'tag': 'tag-ai',
        'tag-categorize': 'tag-ai',
        'crystal': 'crystal-ai',
        'crystal-analytics': 'crystal-ai',
        'ledger': 'ledger-tax',
        'goalie': 'goalie-ai',
        'goalie-coach': 'goalie-ai',
        'goalie-goals': 'goalie-ai',
        'goalie-security': 'goalie-ai',
        'blitz': 'blitz-ai',
        'blitz-debt': 'blitz-ai',
        'blitz-actions': 'blitz-ai',
        'finley': 'finley-ai',
        'liberty': 'liberty-ai',
        'liberty-freedom': 'liberty-ai',
        'chime': 'chime-ai',
        'custodian': 'custodian',
      };
      return aliasMap[inputSlug] || 'prime-boss';
    }
    
    const { data, error } = await sb.rpc('resolve_employee_slug', {
      input_slug: inputSlug
    });
    
    if (!error && data) {
      return data as string;
    }
  } catch (error) {
    console.warn('[EmployeeRegistry] Failed to resolve slug alias:', error);
  }
  
  // Fallback: try common aliases manually
  // This is the canonical alias map - all old slugs resolve to canonical slugs
  const aliasMap: Record<string, string> = {
    // Prime aliases
    'prime': 'prime-boss',
    'prime-ai': 'prime-boss',
    
    // Byte aliases
    'byte': 'byte-docs',
    'byte-doc': 'byte-docs',
    
    // Tag aliases
    'tag': 'tag-ai',
    'tag-categorize': 'tag-ai',
    
    // Crystal aliases
    'crystal': 'crystal-ai',
    'crystal-analytics': 'crystal-ai',
    
    // Finley aliases
    'finley': 'finley-ai',
    
    // Goalie aliases (consolidate all variants to goalie-ai)
    'goalie': 'goalie-ai',
    'goalie-coach': 'goalie-ai',
    'goalie-goals': 'goalie-ai',
    'goalie-security': 'goalie-ai',
    
    // Liberty aliases
    'liberty': 'liberty-ai',
    'liberty-freedom': 'liberty-ai',
    
    // Blitz aliases (consolidate all variants to blitz-ai)
    'blitz': 'blitz-ai',
    'blitz-debt': 'blitz-ai',
    'blitz-actions': 'blitz-ai',
    
    // Chime aliases
    'chime': 'chime-ai',
    
    // Ledger aliases
    'ledger': 'ledger-tax',
    
    // Custodian aliases
    'custodian': 'custodian',
  };
  
  return aliasMap[inputSlug] || 'prime-boss';
}

/**
 * Get employee by slug (with alias resolution)
 */
export async function getEmployee(slug: string): Promise<EmployeeProfile | null> {
  const canonicalSlug = await resolveSlug(slug);
  const employees = await loadEmployees();
  return employees.get(canonicalSlug) || null;
}

/**
 * Get all active employees
 */
export async function getAllEmployees(): Promise<EmployeeProfile[]> {
  const employees = await loadEmployees();
  return Array.from(employees.values());
}

/**
 * Get employee model configuration
 */
export async function getEmployeeModelConfig(slug: string): Promise<EmployeeModelConfig> {
  const employee = await getEmployee(slug);
  
  if (!employee) {
    // Default config
    return {
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 2000,
    };
  }
  
  return {
    model: employee.model,
    temperature: employee.temperature,
    maxTokens: employee.max_tokens,
  };
}

/**
 * Get employee system prompt
 */
export async function getEmployeeSystemPrompt(slug: string): Promise<string | null> {
  const employee = await getEmployee(slug);
  return employee?.system_prompt || null;
}

/**
 * Get employee tools allowed
 */
export async function getEmployeeTools(slug: string): Promise<string[]> {
  const employee = await getEmployee(slug);
  return employee?.tools_allowed || [];
}

/**
 * Check if employee exists and is active
 */
export async function isEmployeeActive(slug: string): Promise<boolean> {
  const employee = await getEmployee(slug);
  return employee?.is_active === true;
}

/**
 * Invalidate cache (call after employee updates)
 */
export function invalidateCache(): void {
  employeeCache = null;
  cacheTimestamp = 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  resolveSlug,
  getEmployee,
  getAllEmployees,
  getEmployeeModelConfig,
  getEmployeeSystemPrompt,
  getEmployeeTools,
  isEmployeeActive,
  invalidateCache,
};

