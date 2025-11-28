/**
 * ByteWorkspaceOverlay Component
 * 
 * Thin wrapper around AIWorkspaceOverlay with Byte-specific configuration
 * Maintains backward compatibility with existing imports
 */

import React from 'react';
import { Paperclip, Upload, FileText } from 'lucide-react';
import { AIWorkspaceOverlay } from '../workspace';
import { getEmployeeTheme } from '../../config/employeeThemes';

interface ByteWorkspaceOverlayProps {
  open: boolean;
  onClose: () => void;
  minimized?: boolean;
  onMinimize?: () => void;
}

export function ByteWorkspaceOverlay({ open, onClose, minimized = false, onMinimize }: ByteWorkspaceOverlayProps) {
  const theme = getEmployeeTheme('byte');
  
  // Default minimize handler: hide overlay but preserve chat state
  const handleMinimize = onMinimize || onClose;

  return (
    <AIWorkspaceOverlay
      open={open}
      onClose={onClose}
      minimized={minimized}
      employeeSlug="byte-docs"
      title="Byte — Smart Import AI"
      subtitle="Data Processing Specialist · Handles document imports, queue health, and Smart Import troubleshooting."
      workspaceLabel="Smart Import Workspace"
      avatarEmoji={theme.emoji}
      avatarColorClass={`${theme.avatarBg} shadow-lg ${theme.avatarShadow}`}
      avatarShadowColorClass={theme.avatarShadow}
      inputPlaceholder={theme.placeholder}
      sendButtonColorClass={`bg-gradient-to-br ${theme.sendGradient} ${theme.sendShadow}`}
      workspacePillColorClass={theme.pill}
      guardrailsText={{
        active: 'Guardrails Active · PII protection on',
        unknown: 'Guardrails Status Unknown',
      }}
      showMinimize={true}
      onMinimize={handleMinimize}
      actionIconsLeft={
        <>
          <button 
            className="p-1.5 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-blue-400 transition-all duration-200"
            aria-label="Attach file"
          >
            <Paperclip className="w-[18px] h-[18px]" />
          </button>
          <button 
            className="p-1.5 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-blue-400 transition-all duration-200"
            aria-label="Upload document"
          >
            <Upload className="w-[18px] h-[18px]" />
          </button>
          <button 
            className="hidden sm:block p-1.5 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-blue-400 transition-all duration-200"
            aria-label="Add document"
          >
            <FileText className="w-[18px] h-[18px]" />
          </button>
        </>
      }
    />
  );
}
