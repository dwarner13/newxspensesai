/**
 * deriveEmployeeStops — derives ordered employee stops from chat messages.
 *
 * A "stop" is a contiguous period where one employee was the active responder.
 * Boundaries are detected via lifecycle system messages:
 *   metadata.lifecycle.type === 'employee_handoff'
 *   metadata.lifecycle.type === 'specialist_complete'
 */

import { getEmployeeDisplayConfig } from '@/config/employeeDisplayConfig';

export interface EmployeeStop {
  employeeSlug: string;
  displayName: string;
  emoji: string;
  role: string;
  label: string;
  startMessageId: string | null;
  startMessageIndex: number;
  endMessageIndex: number;
  timestamp: string | null;
  isCurrent: boolean;
}

interface MinimalMessage {
  id: string;
  role: string;
  createdAt?: string;
  timestamp?: Date | string;
  meta?: Record<string, any>;
}

function getStopLabel(slug: string, reason?: string, isFirst?: boolean, isReturn?: boolean): string {
  if (isFirst) return 'Conversation started';
  if (isReturn) return 'Conversation resumed';
  if (reason && reason.length > 0 && reason.length <= 60) return reason;

  const s = (slug || '').toLowerCase();
  if (s.includes('tag')) return 'Categorization help';
  if (s.includes('byte')) return 'Document help';
  if (s.includes('crystal')) return 'Insights help';
  if (s.includes('goalie')) return 'Goals & debt help';
  if (s.includes('custodian')) return 'Settings & security help';
  if (s.includes('finley')) return 'Financial planning help';

  const cfg = getEmployeeDisplayConfig(slug);
  return cfg.role || 'Conversation';
}

function getTimestamp(msg: MinimalMessage): string | null {
  if (msg.createdAt) return msg.createdAt;
  if (msg.timestamp) return typeof msg.timestamp === 'string' ? msg.timestamp : msg.timestamp.toISOString();
  return null;
}

export function deriveEmployeeStops(
  messages: MinimalMessage[],
  initialEmployeeSlug: string,
): EmployeeStop[] {
  if (!messages || messages.length === 0) {
    const cfg = getEmployeeDisplayConfig(initialEmployeeSlug);
    return [{
      employeeSlug: initialEmployeeSlug,
      displayName: cfg.displayName,
      emoji: cfg.emoji,
      role: cfg.role,
      label: 'Conversation started',
      startMessageId: null,
      startMessageIndex: 0,
      endMessageIndex: 0,
      timestamp: null,
      isCurrent: true,
    }];
  }

  const stops: EmployeeStop[] = [];
  let currentSlug = initialEmployeeSlug;

  // First stop
  const firstCfg = getEmployeeDisplayConfig(currentSlug);
  stops.push({
    employeeSlug: currentSlug,
    displayName: firstCfg.displayName,
    emoji: firstCfg.emoji,
    role: firstCfg.role,
    label: getStopLabel(currentSlug, undefined, true),
    startMessageId: messages[0].id,
    startMessageIndex: 0,
    endMessageIndex: messages.length - 1,
    timestamp: getTimestamp(messages[0]),
    isCurrent: false,
  });

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role !== 'system') continue;
    const lifecycle = msg.meta?.lifecycle;
    if (!lifecycle || typeof lifecycle !== 'object') continue;

    if (lifecycle.type === 'employee_handoff' &&
        typeof lifecycle.to_employee === 'string') {
      // Close previous stop
      stops[stops.length - 1].endMessageIndex = i;

      const newSlug = lifecycle.to_employee;
      const cfg = getEmployeeDisplayConfig(newSlug);
      const reason = typeof lifecycle.reason === 'string' ? lifecycle.reason : undefined;
      currentSlug = newSlug;
      stops.push({
        employeeSlug: newSlug,
        displayName: cfg.displayName,
        emoji: cfg.emoji,
        role: cfg.role,
        label: getStopLabel(newSlug, reason),
        startMessageId: messages[Math.min(i + 1, messages.length - 1)]?.id ?? msg.id,
        startMessageIndex: Math.min(i + 1, messages.length - 1),
        endMessageIndex: messages.length - 1,
        timestamp: getTimestamp(msg),
        isCurrent: false,
      });
    }

    if (lifecycle.type === 'specialist_complete' &&
        typeof lifecycle.to_employee === 'string') {
      // Close previous stop
      stops[stops.length - 1].endMessageIndex = i;

      const newSlug = lifecycle.to_employee;
      const cfg = getEmployeeDisplayConfig(newSlug);
      currentSlug = newSlug;
      stops.push({
        employeeSlug: newSlug,
        displayName: cfg.displayName,
        emoji: cfg.emoji,
        role: cfg.role,
        label: getStopLabel(newSlug, undefined, false, true),
        startMessageId: messages[Math.min(i + 1, messages.length - 1)]?.id ?? msg.id,
        startMessageIndex: Math.min(i + 1, messages.length - 1),
        endMessageIndex: messages.length - 1,
        timestamp: getTimestamp(msg),
        isCurrent: false,
      });
    }
  }

  // Mark last stop as current
  if (stops.length > 0) {
    stops[stops.length - 1].isCurrent = true;
  }

  return stops;
}
