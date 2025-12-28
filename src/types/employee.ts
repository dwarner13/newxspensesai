/**
 * Employee Registry Types
 * 
 * Type definitions for the unified employee registry system.
 * Supports 30+ employees with database-backed profiles and capability model.
 */

/**
 * Employee key (short identifier, e.g., 'prime', 'byte', 'tag')
 */
export type EmployeeKey = string;

/**
 * Employee slug (canonical identifier, e.g., 'prime-boss', 'byte-docs', 'tag-ai')
 */
export type EmployeeSlug = string;

/**
 * Capability key (e.g., 'chat', 'smart_import', 'ocr_parse', 'categorize')
 */
export type CapabilityKey = 
  | 'chat'
  | 'smart_import'
  | 'ocr_parse'
  | 'categorize'
  | 'analytics'
  | 'tasks'
  | 'notifications'
  | 'integrations.gmail'
  | 'integrations.stripe'
  | 'integrations.spotify'
  | 'admin'
  | string; // Allow custom capabilities

/**
 * Tool key (e.g., 'tag_update_transaction_category', 'crystal_summarize_income')
 */
export type ToolKey = string;

/**
 * Employee profile from database
 */
export interface EmployeeProfile {
  id: string;
  employee_key: string; // Short key: 'prime', 'byte', 'tag'
  slug: string; // Canonical slug: 'prime-boss', 'byte-docs', 'tag-ai'
  display_name: string;
  title: string | null;
  description: string | null;
  avatar_url: string | null;
  theme: Record<string, any>; // JSONB theme config
  is_enabled: boolean;
  system_prompt: string | null;
  prompt_version: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Employee capability from database
 */
export interface EmployeeCapability {
  employee_key: string;
  capability_key: string;
  enabled: boolean;
  config: Record<string, any>; // JSONB config
}

/**
 * Employee tool permission from database
 */
export interface EmployeeTool {
  employee_key: string;
  tool_key: string;
  enabled: boolean;
  config: Record<string, any>; // JSONB config
}

/**
 * Static default configuration (fallback when DB unavailable)
 */
export interface EmployeeStaticDefaults {
  employee_key: EmployeeKey;
  slug: EmployeeSlug;
  display_name: string;
  title: string;
  description: string;
  emoji: string;
  theme: Record<string, any>;
  default_greeting?: string;
  ui_hints?: {
    chat_label?: string;
    tab_label?: string;
  };
}

/**
 * Resolved employee (merged: static defaults + DB profile + capabilities)
 */
export interface EmployeeResolved {
  // Identity
  employee_key: EmployeeKey;
  slug: EmployeeSlug;
  
  // Display
  display_name: string;
  title: string;
  description: string;
  emoji: string;
  avatar_url: string | null;
  theme: Record<string, any>;
  
  // Behavior
  system_prompt: string | null;
  prompt_version: string | null;
  is_enabled: boolean;
  
  // Capabilities
  capabilities: CapabilityKey[];
  
  // Tools
  tools: ToolKey[];
  
  // UI
  default_greeting?: string;
  ui_hints?: {
    chat_label?: string;
    tab_label?: string;
  };
  
  // Metadata
  created_at: string;
  updated_at: string;
  registry_version: string;
}

/**
 * Registry configuration
 */
export interface EmployeeRegistryConfig {
  cache_ttl_ms: number;
  enable_localStorage_cache: boolean;
  static_defaults: Map<EmployeeKey, EmployeeStaticDefaults>;
}


