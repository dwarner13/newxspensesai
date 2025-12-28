/**
 * Employee Access Control Helper
 * 
 * Backend helper for checking employee tool/capability access.
 * Queries Supabase with service role and caches in-memory per lambda instance.
 * 
 * Usage:
 *   import { canEmployeeUseTool, getEmployeeCapabilities } from './_lib/employeeAccess';
 *   
 *   if (await canEmployeeUseTool('prime', 'request_employee_handoff')) {
 *     // Allow tool execution
 *   }
 */

import { admin } from '../_shared/supabase.js';
// Import types - handle both relative and absolute paths
type CapabilityKey = string;
type ToolKey = string;
type EmployeeKey = string;

// ============================================================================
// CACHE (per lambda instance)
// ============================================================================

interface AccessCache {
  capabilities: Map<EmployeeKey, Set<CapabilityKey>>;
  tools: Map<EmployeeKey, Set<ToolKey>>;
  timestamp: number;
}

let accessCache: AccessCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Load access control data from database
 */
async function loadAccessControl(): Promise<AccessCache> {
  const now = Date.now();
  
  // Return cached if valid
  if (accessCache && (now - accessCache.timestamp) < CACHE_TTL) {
    return accessCache;
  }
  
  const sb = admin();
  const capabilitiesMap = new Map<EmployeeKey, Set<CapabilityKey>>();
  const toolsMap = new Map<EmployeeKey, Set<ToolKey>>();
  
  try {
    // Load capabilities (table may not exist yet - graceful fallback)
    try {
      const { data: capabilities, error: capabilitiesError } = await sb
        .from('employee_capabilities')
        .select('employee_key, capability_key')
        .eq('enabled', true);
      
      if (!capabilitiesError && capabilities) {
        capabilities.forEach((cap: { employee_key: string; capability_key: string }) => {
          if (!capabilitiesMap.has(cap.employee_key)) {
            capabilitiesMap.set(cap.employee_key, new Set());
          }
          capabilitiesMap.get(cap.employee_key)!.add(cap.capability_key as CapabilityKey);
        });
      }
    } catch (err) {
      console.warn('[employeeAccess] employee_capabilities table not found, skipping capabilities');
    }
    
    // Load tools (table may not exist yet - graceful fallback)
    try {
      const { data: tools, error: toolsError } = await sb
        .from('employee_tools')
        .select('employee_key, tool_key')
        .eq('enabled', true);
      
      if (!toolsError && tools) {
        tools.forEach((tool: { employee_key: string; tool_key: string }) => {
          if (!toolsMap.has(tool.employee_key)) {
            toolsMap.set(tool.employee_key, new Set());
          }
          toolsMap.get(tool.employee_key)!.add(tool.tool_key);
        });
      }
    } catch (err) {
      console.warn('[employeeAccess] employee_tools table not found, skipping tools');
    }
    
    accessCache = {
      capabilities: capabilitiesMap,
      tools: toolsMap,
      timestamp: now,
    };
    
    return accessCache;
  } catch (error) {
    console.error('[employeeAccess] Failed to load access control:', error);
    // Return empty cache on error
    return {
      capabilities: new Map(),
      tools: new Map(),
      timestamp: now,
    };
  }
}

/**
 * Check if employee can use a specific tool
 */
export async function canEmployeeUseTool(
  employeeKey: EmployeeKey,
  toolKey: ToolKey
): Promise<boolean> {
  const cache = await loadAccessControl();
  const employeeTools = cache.tools.get(employeeKey);
  
  if (!employeeTools) {
    return false;
  }
  
  return employeeTools.has(toolKey);
}

/**
 * Get all capabilities for an employee
 */
export async function getEmployeeCapabilities(
  employeeKey: EmployeeKey
): Promise<CapabilityKey[]> {
  const cache = await loadAccessControl();
  const employeeCapabilities = cache.capabilities.get(employeeKey);
  
  if (!employeeCapabilities) {
    return [];
  }
  
  return Array.from(employeeCapabilities);
}

/**
 * Get all tools for an employee
 */
export async function getEmployeeTools(
  employeeKey: EmployeeKey
): Promise<ToolKey[]> {
  const cache = await loadAccessControl();
  const employeeTools = cache.tools.get(employeeKey);
  
  if (!employeeTools) {
    return [];
  }
  
  return Array.from(employeeTools);
}

/**
 * Check if employee has a specific capability
 */
export async function hasEmployeeCapability(
  employeeKey: EmployeeKey,
  capabilityKey: CapabilityKey
): Promise<boolean> {
  const cache = await loadAccessControl();
  const employeeCapabilities = cache.capabilities.get(employeeKey);
  
  if (!employeeCapabilities) {
    return false;
  }
  
  return employeeCapabilities.has(capabilityKey);
}

/**
 * Invalidate cache (call after employee updates)
 */
export function invalidateAccessCache(): void {
  accessCache = null;
}

