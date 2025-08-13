import { atom } from 'jotai';

// Global UI state atoms
export const isMobileMenuOpenAtom = atom(false);
export const isNotificationsOpenAtom = atom(false);
export const isDarkModeAtom = atom(false);
export const isUserMenuOpenAtom = atom(false);

// AI Financial Therapist Notification System
export interface TherapistTrigger {
  active: boolean;
  reason: string;
  context: {
    type: 'category_repeated_edit' | 'spending_spike' | 'time_based' | 'mood_based' | 'guilt_pattern';
    category?: string;
    edits?: number;
    amount?: number;
    daysSinceLastVisit?: number;
    tone?: 'guilt' | 'anxiety' | 'uncertainty' | 'avoidance';
    message?: string;
  };
}

export const therapistTriggerAtom = atom<TherapistTrigger>({
  active: false,
  reason: '',
  context: {
    type: 'category_repeated_edit',
    category: '',
    edits: 0,
    tone: 'uncertainty'
  }
});

export const isTherapistModalOpenAtom = atom(false);