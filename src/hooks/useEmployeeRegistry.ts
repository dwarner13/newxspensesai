/**
 * useEmployeeRegistry Hook
 * 
 * React hook for accessing the employee registry.
 * Loads registry on app start (or first chat open) and exposes employee data.
 * 
 * Features:
 * - Handles live updates (optional): refetch on focus or every N minutes in DEV only
 * - SSR-safe (localStorage guarded)
 * - Loading and error states
 * 
 * Usage:
 *   const { employees, getBySlug, isLoading, error } = useEmployeeRegistry();
 *   
 *   const prime = getBySlug('prime-boss');
 *   const allEmployees = employees;
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getEmployeeBySlug,
  getEmployeeByKey,
  listEmployees,
  resolveEmployee,
  type EmployeeResolved,
  type EmployeeSlug,
  type EmployeeKey,
} from '@/agents/employees/employeeRegistry';

export interface UseEmployeeRegistryReturn {
  /** All employees (resolved, merged configs) */
  employees: EmployeeResolved[];
  
  /** Get employee by slug */
  getBySlug: (slug: EmployeeSlug) => EmployeeResolved | null;
  
  /** Get employee by key */
  getByKey: (key: EmployeeKey) => EmployeeResolved | null;
  
  /** Resolve employee (slug with optional override) */
  resolve: (slug: EmployeeSlug, overrideKey?: EmployeeKey) => EmployeeResolved | null;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Refresh registry (reload from database) */
  refresh: () => Promise<void>;
}

const REFETCH_INTERVAL_DEV = 5 * 60 * 1000; // 5 minutes in DEV only

export function useEmployeeRegistry(): UseEmployeeRegistryReturn {
  const [employees, setEmployees] = useState<EmployeeResolved[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadRegistry = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const allEmployees = await listEmployees();
      setEmployees(allEmployees);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useEmployeeRegistry] Failed to load registry:', error);
      setError(error);
      // Don't clear employees on error - keep cached data
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadRegistry();
  }, [loadRegistry]);

  // DEV: Refetch on window focus (optional)
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const handleFocus = () => {
        // Refetch when window regains focus (user might have updated DB)
        loadRegistry();
      };
      
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [loadRegistry]);

  // DEV: Periodic refetch (optional)
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const interval = setInterval(() => {
        loadRegistry();
      }, REFETCH_INTERVAL_DEV);
      
      return () => clearInterval(interval);
    }
  }, [loadRegistry]);

  // Memoized getters
  const getBySlug = useCallback((slug: EmployeeSlug): EmployeeResolved | null => {
    return employees.find(emp => emp.slug === slug) || null;
  }, [employees]);

  const getByKey = useCallback((key: EmployeeKey): EmployeeResolved | null => {
    return employees.find(emp => emp.employee_key === key) || null;
  }, [employees]);

  const resolve = useCallback(async (
    slug: EmployeeSlug,
    overrideKey?: EmployeeKey
  ): Promise<EmployeeResolved | null> => {
    // Try sync lookup first
    if (!overrideKey) {
      const found = getBySlug(slug);
      if (found) return found;
    } else {
      const found = getByKey(overrideKey);
      if (found) return found;
    }
    
    // Fallback to async resolution (handles aliases)
    try {
      return await resolveEmployee(slug, overrideKey);
    } catch (err) {
      console.warn('[useEmployeeRegistry] Failed to resolve employee:', err);
      return null;
    }
  }, [getBySlug, getByKey]);

  return {
    employees,
    getBySlug,
    getByKey,
    resolve,
    isLoading,
    error,
    refresh: loadRegistry,
  };
}


