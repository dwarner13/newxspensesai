export type ChatHandoffPayload = {
  fromEmployeeSlug: string;
  fromEmployeeName?: string;
  note: string; // REQUIRED, empty string treated as NOT a handoff
};

export function isValidHandoff(h?: any): h is ChatHandoffPayload {
  return !!h
    && typeof h.note === 'string'
    && h.note.trim().length > 0
    && typeof h.fromEmployeeSlug === 'string'
    && h.fromEmployeeSlug.trim().length > 0;
}
