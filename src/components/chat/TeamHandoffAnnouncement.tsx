/**
 * TeamHandoffAnnouncement
 *
 * Renders a compact lifecycle message when Prime delegates to a specialist
 * or when a specialist completes and returns to Prime.
 *
 * Resolves employee identity from employeeDisplayConfig — fully generic,
 * not hardcoded to any specific employee slug.
 */
import { getEmployeeDisplayConfig } from '@/config/employeeDisplayConfig';

export interface HandoffAnnouncementData {
  type: 'employee_handoff';
  from_employee: string;
  to_employee: string;
  reason?: string;
}

export interface SpecialistCompleteData {
  type: 'specialist_complete';
  from_employee: string;  // specialist that just finished
  to_employee: string;    // origin employee returning to (usually Prime)
  outcome: 'success' | 'cancelled' | 'failed';
}

export type LifecycleMessageData = HandoffAnnouncementData | SpecialistCompleteData;

/**
 * Parse structured lifecycle metadata from a chat message's metadata.
 * Returns null if the metadata doesn't contain a recognized lifecycle type.
 */
export function parseLifecycleMessage(meta: Record<string, unknown> | undefined | null): LifecycleMessageData | null {
  if (!meta) return null;
  const lifecycle = (meta as any)?.lifecycle as Record<string, unknown> | undefined;
  if (!lifecycle) return null;

  if (lifecycle.type === 'employee_handoff' &&
      typeof lifecycle.from_employee === 'string' &&
      typeof lifecycle.to_employee === 'string') {
    return {
      type: 'employee_handoff',
      from_employee: lifecycle.from_employee,
      to_employee: lifecycle.to_employee,
      reason: typeof lifecycle.reason === 'string' ? lifecycle.reason : undefined,
    };
  }

  if (lifecycle.type === 'specialist_complete' &&
      typeof lifecycle.from_employee === 'string' &&
      typeof lifecycle.to_employee === 'string') {
    const outcome = lifecycle.outcome;
    const validOutcomes = ['success', 'cancelled', 'failed'] as const;
    return {
      type: 'specialist_complete',
      from_employee: lifecycle.from_employee,
      to_employee: lifecycle.to_employee,
      outcome: validOutcomes.includes(outcome as any) ? (outcome as 'success' | 'cancelled' | 'failed') : 'success',
    };
  }

  return null;
}

interface TeamHandoffAnnouncementProps {
  data: HandoffAnnouncementData;
}

export function TeamHandoffAnnouncement({ data }: TeamHandoffAnnouncementProps) {
  const toConfig = getEmployeeDisplayConfig(data.to_employee);

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm text-purple-300">
      <span className="text-base">{toConfig.emoji}</span>
      <span>
        <span className="font-medium text-purple-200">{toConfig.displayName}</span>
        <span className="text-purple-400 ml-1">{toConfig.role}</span>
        {data.reason && (
          <span className="text-purple-400/70 ml-1">— {data.reason}</span>
        )}
      </span>
    </div>
  );
}

interface SpecialistCompleteMessageProps {
  data: SpecialistCompleteData;
}

export function SpecialistCompleteMessage({ data }: SpecialistCompleteMessageProps) {
  const fromConfig = getEmployeeDisplayConfig(data.from_employee);
  const toConfig = getEmployeeDisplayConfig(data.to_employee);

  const outcomeLabel: Record<string, string> = {
    success: 'finished',
    cancelled: 'cancelled',
    failed: 'encountered an issue',
  };

  const outcomeColor: Record<string, string> = {
    success: 'text-emerald-400',
    cancelled: 'text-amber-400',
    failed: 'text-red-400',
  };

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
      <span className={outcomeColor[data.outcome] || 'text-emerald-400'}>
        {data.outcome === 'success' ? '\u2713' : data.outcome === 'cancelled' ? '\u2717' : '!'}
      </span>
      <span>
        <span className="font-medium">{fromConfig.displayName}</span>
        <span className="text-emerald-400/70 ml-1">{outcomeLabel[data.outcome] || 'finished'}</span>
        <span className="mx-1">&middot;</span>
        <span className="font-medium">{toConfig.displayName}</span>
        <span className="text-emerald-400/70 ml-1">is back</span>
      </span>
    </div>
  );
}
