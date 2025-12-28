/**
 * Employee Registry v1 - Single Source of Truth
 * 
 * Merges:
 * 1) Frontend display config (name, avatar, theme, default greeting, UI hints)
 * 2) Backend employee_profiles (stored in Supabase)
 * 3) Capability model (what tools/actions each employee is allowed)
 * 4) Routing rules (slug -> employee_key -> override + model routing later)
 * 
 * Features:
 * - Safe offline: Falls back to local config if Supabase fails
 * - Caching: In-memory + optional localStorage cache (SSR-safe)
 * - Versioning: registry_version, updated_at for invalidation
 * 
 * Usage:
 *   import { getEmployeeBySlug, getEmployeeByKey, listEmployees, resolveEmployee } from '@/agents/employees/employeeRegistry';
 *   
 *   const employee = await getEmployeeBySlug('prime-boss');
 *   const allEmployees = await listEmployees();
 *   const resolved = await resolveEmployee('prime', 'prime-boss');
 */

import type {
  EmployeeKey,
  EmployeeSlug,
  EmployeeProfile,
  EmployeeCapability,
  EmployeeTool,
  EmployeeResolved,
  EmployeeStaticDefaults,
  CapabilityKey,
  ToolKey,
} from '@/types/employee';

// Import Supabase client dynamically to support both frontend and backend
let getSupabaseClient: () => Promise<any>;

if (typeof window === 'undefined') {
  // Backend (Netlify Functions) - use admin client
  // Use dynamic import for ES modules compatibility
  getSupabaseClient = async () => {
    try {
      const supabaseModule = await import('../../../netlify/functions/_shared/supabase.js');
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
// STATIC DEFAULTS (fallback when DB unavailable)
// ============================================================================

const STATIC_DEFAULTS: Map<EmployeeKey, EmployeeStaticDefaults> = new Map([
  ['prime', {
    employee_key: 'prime',
    slug: 'prime-boss',
    display_name: 'Prime',
    title: 'CEO & Orchestrator',
    description: 'The strategic mastermind and CEO of the XSpensesAI ecosystem.',
    emoji: '👑',
    theme: {},
    default_greeting: 'Hello! I\'m Prime, your CEO assistant. How can I help you today?',
    ui_hints: {
      chat_label: 'Chat with Prime',
      tab_label: 'Chat with Prime',
    },
  }],
  ['byte', {
    employee_key: 'byte',
    slug: 'byte-docs',
    display_name: 'Byte',
    title: 'Document Processing Specialist',
    description: 'Enthusiastic document processing specialist who loves organizing data.',
    emoji: '📄',
    theme: {},
    default_greeting: 'Hi! I\'m Byte, your document wizard. What would you like me to process?',
    ui_hints: {
      chat_label: 'Work with Byte',
      tab_label: 'Work with Byte',
    },
  }],
  ['tag', {
    employee_key: 'tag',
    slug: 'tag-ai',
    display_name: 'Tag',
    title: 'Categorization Expert',
    description: 'Meticulous categorization specialist who sees patterns everywhere.',
    emoji: '🏷️',
    theme: {},
    default_greeting: 'Hello! I\'m Tag, your categorization expert. Let\'s organize your transactions!',
    ui_hints: {
      chat_label: 'Work with Tag',
      tab_label: 'Work with Tag',
    },
  }],
  ['crystal', {
    employee_key: 'crystal',
    slug: 'crystal-ai',
    display_name: 'Crystal',
    title: 'Financial Insights Analyst',
    description: 'Data-driven analytics and forecasting specialist.',
    emoji: '🔮',
    theme: {},
    default_greeting: 'Hi! I\'m Crystal, your financial insights analyst. What would you like to analyze?',
    ui_hints: {
      chat_label: 'Work with Crystal',
      tab_label: 'Work with Crystal',
    },
  }],
]);

// ============================================================================
// CACHE (in-memory + localStorage for SSR-safe caching)
// ============================================================================

interface CacheEntry {
  employees: Map<EmployeeSlug, EmployeeResolved>;
  capabilities: Map<EmployeeKey, CapabilityKey[]>;
  tools: Map<EmployeeKey, ToolKey[]>;
  version: string;
  timestamp: number;
}

let memoryCache: CacheEntry | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REGISTRY_VERSION = '1.0.0';

const STORAGE_KEY = 'employee_registry_cache';

function getLocalStorageCache(): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    
    // Check TTL
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    // Check version
    if (entry.version !== REGISTRY_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    // Reconstruct Maps from arrays
    const employees = new Map<EmployeeSlug, EmployeeResolved>();
    if (Array.isArray(entry.employees)) {
      entry.employees.forEach(([slug, emp]: [string, EmployeeResolved]) => {
        employees.set(slug, emp);
      });
    }
    
    const capabilities = new Map<EmployeeKey, CapabilityKey[]>();
    if (entry.capabilities) {
      Object.entries(entry.capabilities).forEach(([key, caps]) => {
        capabilities.set(key, caps as CapabilityKey[]);
      });
    }
    
    const tools = new Map<EmployeeKey, ToolKey[]>();
    if (entry.tools) {
      Object.entries(entry.tools).forEach(([key, toolList]) => {
        tools.set(key, toolList as ToolKey[]);
      });
    }
    
    return {
      employees,
      capabilities,
      tools,
      version: entry.version,
      timestamp: entry.timestamp,
    };
  } catch (error) {
    console.warn('[EmployeeRegistry] Failed to load localStorage cache:', error);
    return null;
  }
}

function setLocalStorageCache(entry: CacheEntry): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Convert Maps to arrays for JSON serialization
    const serializable: any = {
      employees: Array.from(entry.employees.entries()),
      capabilities: Object.fromEntries(entry.capabilities),
      tools: Object.fromEntries(entry.tools),
      version: entry.version,
      timestamp: entry.timestamp,
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.warn('[EmployeeRegistry] Failed to save localStorage cache:', error);
  }
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Load employees from database and merge with static defaults
 */
async function loadEmployees(): Promise<Map<EmployeeSlug, EmployeeResolved>> {
  const now = Date.now();
  
  // Check memory cache
  if (memoryCache && (now - memoryCache.timestamp) < CACHE_TTL) {
    return memoryCache.employees;
  }
  
  // Check localStorage cache (SSR-safe)
  const localStorageCache = getLocalStorageCache();
  if (localStorageCache && (now - localStorageCache.timestamp) < CACHE_TTL) {
    memoryCache = localStorageCache;
    return memoryCache.employees;
  }
  
  // Load from database
  const employees = new Map<EmployeeSlug, EmployeeResolved>();
  const capabilitiesMap = new Map<EmployeeKey, CapabilityKey[]>();
  const toolsMap = new Map<EmployeeKey, ToolKey[]>();
  
  try {
    const sb = await getSupabaseClient();
    if (!sb) {
      console.warn('[EmployeeRegistry] Supabase client not available, using static defaults');
      return buildFromStaticDefaults();
    }
    
    // Load profiles (handle both is_enabled and is_active for migration compatibility)
    const { data: profiles, error: profilesError } = await sb
      .from('employee_profiles')
      .select('*')
      .or('is_enabled.eq.true,is_active.eq.true')
      .order('slug');
    
    if (profilesError) {
      console.error('[EmployeeRegistry] Failed to load profiles:', profilesError);
      return buildFromStaticDefaults();
    }
    
    // Load capabilities (table may not exist yet - graceful fallback)
    try {
      const { data: capabilities, error: capabilitiesError } = await sb
        .from('employee_capabilities')
        .select('*')
        .eq('enabled', true);
      
      if (!capabilitiesError && capabilities) {
        capabilities.forEach((cap: EmployeeCapability) => {
          const existing = capabilitiesMap.get(cap.employee_key) || [];
          if (!existing.includes(cap.capability_key as CapabilityKey)) {
            existing.push(cap.capability_key as CapabilityKey);
          }
          capabilitiesMap.set(cap.employee_key, existing);
        });
      }
    } catch (err) {
      console.warn('[EmployeeRegistry] employee_capabilities table not found, skipping capabilities');
    }
    
    // Load tools (table may not exist yet - graceful fallback)
    try {
      const { data: tools, error: toolsError } = await sb
        .from('employee_tools')
        .select('*')
        .eq('enabled', true);
      
      if (!toolsError && tools) {
        tools.forEach((tool: EmployeeTool) => {
          const existing = toolsMap.get(tool.employee_key) || [];
          if (!existing.includes(tool.tool_key)) {
            existing.push(tool.tool_key);
          }
          toolsMap.set(tool.employee_key, existing);
        });
      }
    } catch (err) {
      console.warn('[EmployeeRegistry] employee_tools table not found, skipping tools');
    }
    
    // Merge profiles with static defaults
    if (profiles) {
      for (const profile of profiles) {
        // Handle both is_active and is_enabled (migration compatibility)
        const isEnabled = (profile as any).is_enabled ?? (profile as any).is_active ?? true;
        
        // Extract employee_key (may not exist in old schema)
        const employeeKey = (profile as any).employee_key || profile.slug.split('-')[0];
        
        const staticDefault = STATIC_DEFAULTS.get(employeeKey);
        
        const resolved: EmployeeResolved = {
          // Identity
          employee_key: employeeKey,
          slug: profile.slug,
          
          // Display (DB overrides static, but static provides fallbacks)
          display_name: (profile as any).display_name || staticDefault?.display_name || profile.title || 'Unknown',
          title: profile.title || staticDefault?.title || '',
          description: (profile as any).description || staticDefault?.description || '',
          emoji: profile.emoji || staticDefault?.emoji || '🤖', // Emoji from DB or static
          avatar_url: (profile as any).avatar_url || null,
          theme: (profile as any).theme || staticDefault?.theme || {},
          
          // Behavior
          system_prompt: profile.system_prompt,
          prompt_version: (profile as any).prompt_version || null,
          is_enabled: isEnabled,
          
          // Capabilities (from DB, fallback to empty array)
          capabilities: capabilitiesMap.get(employeeKey) || [],
          
          // Tools (from DB, fallback to empty array)
          tools: toolsMap.get(employeeKey) || [],
          
          // UI hints (from static defaults)
          default_greeting: staticDefault?.default_greeting,
          ui_hints: staticDefault?.ui_hints,
          
          // Metadata
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          registry_version: REGISTRY_VERSION,
        };
        
        employees.set(profile.slug, resolved);
      }
    }
    
    // Build cache entry
    const cacheEntry: CacheEntry = {
      employees,
      capabilities: capabilitiesMap,
      tools: toolsMap,
      version: REGISTRY_VERSION,
      timestamp: now,
    };
    
    memoryCache = cacheEntry;
    setLocalStorageCache(cacheEntry);
    
    console.log(`[EmployeeRegistry] Loaded ${employees.size} employees from database`);
    return employees;
  } catch (error: any) {
    console.error('[EmployeeRegistry] Error loading employees:', error);
    return buildFromStaticDefaults();
  }
}

/**
 * Build registry from static defaults only (offline fallback)
 */
function buildFromStaticDefaults(): Map<EmployeeSlug, EmployeeResolved> {
  const employees = new Map<EmployeeSlug, EmployeeResolved>();
  
  STATIC_DEFAULTS.forEach((staticDefault) => {
    const resolved: EmployeeResolved = {
      employee_key: staticDefault.employee_key,
      slug: staticDefault.slug,
      display_name: staticDefault.display_name,
      title: staticDefault.title,
      description: staticDefault.description,
      emoji: staticDefault.emoji,
      avatar_url: null,
      theme: staticDefault.theme,
      system_prompt: null,
      prompt_version: null,
      is_enabled: true,
      capabilities: [],
      tools: [],
      default_greeting: staticDefault.default_greeting,
      ui_hints: staticDefault.ui_hints,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      registry_version: REGISTRY_VERSION,
    };
    
    employees.set(staticDefault.slug, resolved);
  });
  
  console.log(`[EmployeeRegistry] Built ${employees.size} employees from static defaults`);
  return employees;
}

/**
 * Resolve slug (with alias support) to canonical slug
 */
export async function resolveSlug(inputSlug: string): Promise<EmployeeSlug> {
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
    if (sb) {
      const { data, error } = await sb.rpc('resolve_employee_slug', {
        input_slug: inputSlug
      });
      
      if (!error && data) {
        return data as EmployeeSlug;
      }
    }
  } catch (error) {
    console.warn('[EmployeeRegistry] Failed to resolve slug alias:', error);
  }
  
  // Fallback: try common aliases manually
  const aliasMap: Record<string, EmployeeSlug> = {
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
    'blitz': 'blitz-ai',
    'blitz-debt': 'blitz-ai',
    'finley': 'finley-ai',
    'liberty': 'liberty-ai',
    'liberty-freedom': 'liberty-ai',
    'chime': 'chime-ai',
    'custodian': 'custodian',
  };
  
  return aliasMap[inputSlug] || 'prime-boss';
}

/**
 * Get employee by slug
 */
export async function getEmployeeBySlug(slug: EmployeeSlug): Promise<EmployeeResolved | null> {
  const canonicalSlug = await resolveSlug(slug);
  const employees = await loadEmployees();
  return employees.get(canonicalSlug) || null;
}

/**
 * Get employee by key
 */
export async function getEmployeeByKey(key: EmployeeKey): Promise<EmployeeResolved | null> {
  const employees = await loadEmployees();
  
  for (const employee of employees.values()) {
    if (employee.employee_key === key) {
      return employee;
    }
  }
  
  return null;
}

/**
 * List all employees
 */
export async function listEmployees(): Promise<EmployeeResolved[]> {
  const employees = await loadEmployees();
  return Array.from(employees.values());
}

/**
 * Resolve employee (slug with optional override key)
 * Used for routing: resolves slug, then applies override if provided
 */
export async function resolveEmployee(
  slug: EmployeeSlug,
  optionalOverrideKey?: EmployeeKey
): Promise<EmployeeResolved | null> {
  // If override key provided, use it
  if (optionalOverrideKey) {
    return await getEmployeeByKey(optionalOverrideKey);
  }
  
  // Otherwise resolve by slug
  return await getEmployeeBySlug(slug);
}

/**
 * Invalidate cache (call after employee updates)
 */
export function invalidateCache(): void {
  memoryCache = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getEmployeeBySlug,
  getEmployeeByKey,
  listEmployees,
  resolveEmployee,
  resolveSlug,
  invalidateCache,
};

