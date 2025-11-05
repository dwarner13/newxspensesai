import { routeToEmployee } from './router';

/**
 * Pick agent based on message and preferred agent
 * @param message - User message text
 * @param preferredAgent - Optional preferred agent name
 * @returns Agent identifier string
 */
export function pickAgent(message: string, preferredAgent?: string | null): string {
  const result = routeToEmployee({
    userText: message,
    requestedEmployee: preferredAgent || null,
    mode: 'balanced'
  });
  
  return result.employee;
}


