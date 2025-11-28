/**
 * AI Employee Configuration System
 * 
 * ⚠️ DEPRECATED: Employee definitions have been moved to database (employee_profiles table)
 * 
 * This file is kept for backward compatibility with helper functions only.
 * All employee data should be loaded from the database via src/employees/registry.ts
 * 
 * Phase 1.1: Consolidated November 20, 2025
 * 
 * Migration Guide:
 * - Replace `AI_EMPLOYEES[id]` with `await getEmployee(id)` from '@/employees/registry'
 * - Replace `getActiveEmployees()` with `await getAllEmployees()` from '@/employees/registry'
 * - Replace `getEmployeeById(id)` with `await getEmployee(id)` from '@/employees/registry'
 */

import { getAllEmployees, getEmployee } from '../employees/registry';

// Legacy export - kept empty to prevent breaking imports
// Use registry instead: import { getEmployee, getAllEmployees } from '@/employees/registry'
export const AI_EMPLOYEES = {};

// Helper functions - Updated to use registry
// These functions now delegate to src/employees/registry.ts

export const getActiveEmployees = async () => {
  const employees = await getAllEmployees();
  return employees.map(emp => ({
    id: emp.slug,
    name: emp.title.split('—')[0].trim(),
    emoji: emp.emoji,
    active: emp.is_active,
    department: emp.capabilities[0] || 'General',
    capabilities: emp.capabilities
  }));
};

export const getEmployeeById = async (id) => {
  const employee = await getEmployee(id);
  if (!employee) return null;
  
  return {
    id: employee.slug,
    name: employee.title.split('—')[0].trim(),
    emoji: employee.emoji,
    active: employee.is_active,
    department: employee.capabilities[0] || 'General',
    capabilities: employee.capabilities,
    prompt: employee.system_prompt
  };
};

export const getEmployeesByDepartment = async (department) => {
  const employees = await getAllEmployees();
  return employees
    .filter(emp => emp.capabilities.some(cap => cap.toLowerCase().includes(department.toLowerCase())))
    .map(emp => ({
      id: emp.slug,
      name: emp.title.split('—')[0].trim(),
      emoji: emp.emoji,
      active: emp.is_active,
      department: emp.capabilities[0] || 'General',
      capabilities: emp.capabilities
    }));
};

export const getComingSoonEmployees = async () => {
  // All employees in database are active, so this returns empty array
  // Placeholder employees are no longer tracked here
  return [];
};

export default AI_EMPLOYEES;
