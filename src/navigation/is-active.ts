/**
 * Utility function to determine if a navigation item should be considered active
 * @param current - The current pathname
 * @param to - The target path to check against
 * @returns true if the item should be highlighted as active
 */
export function isActivePath(current: string, to: string) {
  if (!current) return false;
  return current === to || current.startsWith(to + '/');
}

