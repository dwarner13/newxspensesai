/**
 * LEGACY: Deprecated chat UI. Dashboard now uses UnifiedAssistantChat + useUnifiedChatLauncher.
 * Kept only for reference and should not be used in new code.
 * 
 * AIWorkspaceOverlay Component
 * 
 * ⚠️ LEGACY - DEPRECATED - DO NOT USE
 * 
 * This component is being phased out in favor of UnifiedAssistantChat.
 * All new chat implementations should use:
 * - useUnifiedChatLauncher().openChat()
 * - UnifiedAssistantChat (rendered globally by DashboardLayout)
 * 
 * Universal floating workspace overlay for any AI employee
 * Combines backdrop, header, chat body, guardrails status, and input composer
 * 
 * @deprecated Use UnifiedAssistantChat instead
 */

import React, { useState, useCallback } from 'react';
import { EmployeeChatWorkspace } from '../chat/EmployeeChatWorkspace';
import { AIWorkspaceContainer } from './AIWorkspaceContainer';
import { AIWorkspaceHeader } from './AIWorkspaceHeader';
import { AIWorkspaceGuardrailsChip } from './AIWorkspaceGuardrailsChip';
import { AIWorkspaceInput } from './AIWorkspaceInput';
import { PrimeStatusBar } from '../chat/PrimeStatusBar';

export interface AIWorkspaceOverlayProps {
  open: boolean;
  onClose: () => void;
  minimized?: boolean; // When true, overlay is hidden but chat state is preserved

  employeeSlug: string;

  title: string;
  subtitle: string;
  workspaceLabel?: string;

  avatarEmoji: string;
  avatarColorClass?: string;
  avatarShadowColorClass?: string;

  // Layout sizing
  maxWidthClass?: string; // default: 'max-w-5xl'
  heightClass?: string;   // default: 'h-[72vh]'

  // Input / chat
  inputPlaceholder?: string;

  // Style classes
  sendButtonColorClass?: string;
  workspacePillColorClass?: string;

  // Optional label overrides for guardrails text
  guardrailsText?: {
    active: string;
    unknown: string;
  };

  // Optional: for custom left-side actions in composer
  actionIconsLeft?: React.ReactNode;

  // Optional: conversation ID and initial question
  conversationId?: string;
  initialQuestion?: string;

  // Optional: minimize button
  showMinimize?: boolean;
  onMinimize?: () => void;
  
  // Optional: allowed employees for handoffs
  allowedEmployees?: string[];
}

export function AIWorkspaceOverlay({
  open,
  onClose,
  minimized = false,
  employeeSlug,
  title,
  subtitle,
  workspaceLabel,
  avatarEmoji,
  avatarColorClass,
  avatarShadowColorClass,
  maxWidthClass = 'max-w-5xl',
  heightClass = 'h-[72vh]',
  inputPlaceholder,
  sendButtonColorClass,
  workspacePillColorClass,
  guardrailsText,
  actionIconsLeft,
  conversationId,
  initialQuestion,
  showMinimize = false,
  onMinimize,
  allowedEmployees,
}: AIWorkspaceOverlayProps) {
  const [inputValue, setInputValue] = useState('');
  const [sendFunction, setSendFunction] = useState<((message: string) => Promise<void>) | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  // IMPORTANT: Default guardrails to active (true) to show "Active" status immediately
  // The actual status will be updated from EmployeeChatWorkspace when headers are received
  const [guardrailsActive, setGuardrailsActive] = useState<boolean | null>(true);
  const [piiProtectionActive, setPiiProtectionActive] = useState<boolean | null>(true);

  const isLoading = isStreaming || !sendFunction;

  // Stabilize the callback to prevent infinite re-renders
  const handleSendFunctionReady = useCallback((fn: (message: string) => Promise<void>) => {
    setSendFunction(() => fn);
  }, []);

  // Handle send from composer
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !sendFunction || isLoading) return;
    
    const messageToSend = inputValue.trim();
    setInputValue(''); // Clear input immediately for better UX
    await sendFunction(messageToSend);
  }, [inputValue, sendFunction, isLoading]);

  // Generate placeholder text if not provided
  const placeholder = inputPlaceholder || `Message ${title.split('—')[0].trim()}...`;

  // Generate title ID for aria-labelledby
  const titleId = `ai-workspace-title-${employeeSlug}`;

  return (
    <AIWorkspaceContainer
      open={open}
      onClose={onClose}
      minimized={minimized}
      maxWidthClass={maxWidthClass}
      heightClass={heightClass}
      ariaLabelledBy={titleId}
    >
      {/* Header */}
      <AIWorkspaceHeader
        title={title}
        subtitle={subtitle}
        workspaceLabel={workspaceLabel}
        avatarEmoji={avatarEmoji}
        avatarColorClass={avatarColorClass}
        avatarShadowColorClass={avatarShadowColorClass}
        workspacePillColorClass={workspacePillColorClass}
        guardrailsActive={guardrailsActive}
        piiProtectionActive={piiProtectionActive}
        guardrailsText={guardrailsText}
        onClose={onClose}
        onMinimize={onMinimize}
        showMinimize={showMinimize}
        titleId={titleId}
      />

      {/* Prime Status Bar - Only show for Prime */}
      {(employeeSlug === 'prime-boss' || employeeSlug === 'prime-ai') && (
        <PrimeStatusBar />
      )}

      {/* Body Layout - Responsive height calculation */}
      <div className="flex flex-col min-h-0 h-[calc(92vh-4rem)] md:h-[calc(72vh-4rem)]">
        {/* Chat scroll area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <EmployeeChatWorkspace
            employeeSlug={employeeSlug}
            className="h-full"
            showHeader={false}
            showComposer={false}
            conversationId={conversationId}
            initialQuestion={initialQuestion}
            allowedEmployees={allowedEmployees ?? [
              "prime-boss",
              "byte-docs",
              "tag-ai",
              "crystal-analytics",
              "finley-forecasts",
            ]}
            onSendFunctionReady={handleSendFunctionReady}
            onStreamingStateChange={setIsStreaming}
            onGuardrailsStateChange={(guardrails, pii) => {
              setGuardrailsActive(guardrails);
              setPiiProtectionActive(pii);
            }}
          />
        </div>

        {/* Guardrails status + composer */}
        <div className="border-t border-slate-800/60 bg-slate-950/95 flex-shrink-0">
          {/* Guardrails strip */}
          <div className="px-3 py-1.5 md:px-6 md:py-2 flex items-center justify-center">
            <AIWorkspaceGuardrailsChip
              guardrailsActive={guardrailsActive}
              piiProtectionActive={piiProtectionActive}
              variant="strip"
              textActive={guardrailsText?.active}
              textUnknown={guardrailsText?.unknown}
            />
          </div>

          {/* Message composer */}
          <AIWorkspaceInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            placeholder={placeholder}
            isStreaming={isStreaming}
            disabled={isLoading}
            actionIconsLeft={actionIconsLeft}
            sendButtonColorClass={sendButtonColorClass}
            autoFocus={open}
          />
        </div>
      </div>
    </AIWorkspaceContainer>
  );
}

