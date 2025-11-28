/**
 * Employee Model Configuration
 * 
 * Now uses the unified employee registry to load model configs from database.
 * Model/temperature/max_tokens are stored in employee_profiles table.
 * 
 * This provides a single source of truth and allows updates via database migrations.
 */

import { resolveSlug, getEmployeeModelConfig as getRegistryModelConfig } from '../../../src/employees/registry';

export interface EmployeeModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Default model configuration (fallback if registry fails)
 * Uses environment variable OPENAI_CHAT_MODEL or falls back to gpt-4o-mini
 */
const DEFAULT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 2000;

/**
 * Get model configuration for an employee
 * 
 * Resolves slug (with alias support) and loads config from registry/database.
 * Falls back to defaults if employee not found or registry fails.
 * 
 * @param employeeSlug - Employee slug (e.g., 'finley-ai', 'prime-boss', 'crystal-analytics')
 * @returns Model configuration from database or defaults
 */
export async function getEmployeeModelConfig(employeeSlug: string): Promise<EmployeeModelConfig> {
  try {
    // Resolve slug (handles aliases like 'crystal-analytics' → 'crystal-ai')
    const canonicalSlug = await resolveSlug(employeeSlug);
    
    // Load from registry (which reads from database)
    const config = await getRegistryModelConfig(canonicalSlug);
    
    // Verify config is valid
    if (config && config.model && typeof config.temperature === 'number' && typeof config.maxTokens === 'number') {
      return config;
    }
  } catch (error: any) {
    console.warn(`[EmployeeModelConfig] Failed to load config for ${employeeSlug}:`, error.message);
  }
  
  // Fallback to defaults
  return {
    model: DEFAULT_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
  };
}


