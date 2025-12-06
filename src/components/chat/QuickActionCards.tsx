/**
 * Quick Action Cards Component
 * 
 * Displays employee-specific quick action buttons
 */

import React from 'react';
import { EMPLOYEE_CHAT_CONFIG } from '../../config/employeeChatConfig';

export interface QuickAction {
  id: string;
  label: string;
  action: string;
  employeeSlug: string;
  icon?: string;
}

interface QuickActionCardsProps {
  employeeSlug: string;
  onActionClick: (action: QuickAction) => void;
}

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  'prime-boss': [
    { id: 'upload', label: 'Upload a document', action: 'I want to upload my bank statement', employeeSlug: 'byte-docs', icon: '📄' },
    { id: 'insights', label: 'Show latest insights', action: 'Show me my spending insights', employeeSlug: 'crystal-analytics', icon: '📊' },
    { id: 'uncategorized', label: 'Review uncategorized', action: 'Show me uncategorized transactions', employeeSlug: 'tag-ai', icon: '🏷️' },
    { id: 'goal', label: 'Help me plan a goal', action: 'I want to set a financial goal', employeeSlug: 'goalie-goals', icon: '🎯' },
  ],
  'byte-docs': [
    { id: 'upload-another', label: 'Upload another document', action: 'I want to upload another file', employeeSlug: 'byte-docs', icon: '📄' },
    { id: 'formats', label: 'What formats do you support?', action: 'What file formats can I upload?', employeeSlug: 'byte-docs', icon: '❓' },
    { id: 'history', label: 'Show my import history', action: 'Show me my recent imports', employeeSlug: 'byte-docs', icon: '📋' },
  ],
  'tag-ai': [
    { id: 'uncategorized', label: 'See uncategorized expenses', action: 'Show me uncategorized transactions', employeeSlug: 'tag-ai', icon: '🏷️' },
    { id: 'create-rule', label: 'Create a new rule', action: 'I want to create a categorization rule', employeeSlug: 'tag-ai', icon: '➕' },
    { id: 'fix-category', label: 'Fix a category', action: 'Help me fix a wrong category', employeeSlug: 'tag-ai', icon: '🔧' },
  ],
  'crystal-analytics': [
    { id: 'monthly', label: 'Show monthly insights', action: 'Show me my monthly spending insights', employeeSlug: 'crystal-analytics', icon: '📊' },
    { id: 'anomalies', label: 'Detect anomalies', action: 'Find unusual spending patterns', employeeSlug: 'crystal-analytics', icon: '🔍' },
    { id: 'forecast', label: 'Forecast next month', action: 'Predict my spending for next month', employeeSlug: 'crystal-analytics', icon: '🔮' },
  ],
};

export function QuickActionCards({ employeeSlug, onActionClick }: QuickActionCardsProps) {
  const actions = QUICK_ACTIONS[employeeSlug] || [];
  const config = EMPLOYEE_CHAT_CONFIG[employeeSlug as keyof typeof EMPLOYEE_CHAT_CONFIG];

  if (actions.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-slate-400 font-medium">Quick Actions</p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onActionClick(action)}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-white/5 hover:border-white/10 hover:bg-slate-800/80 transition-all text-left group"
          >
            {action.icon && <span className="text-lg">{action.icon}</span>}
            <span className="text-xs text-slate-300 group-hover:text-white transition-colors">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}




