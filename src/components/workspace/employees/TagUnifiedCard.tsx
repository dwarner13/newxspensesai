/**
 * TagUnifiedCard Component
 * 
 * Unified card for Tag (Smart Categories AI) workspace
 * Matches ByteUnifiedCard structure exactly - uses EmployeeChatWorkspace for universal chat
 */

import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, CheckCircle, Plus, MessageSquare } from 'lucide-react';
import { Button } from '../../ui/button';
import { EmployeeChatWorkspace } from '../../chat/EmployeeChatWorkspace';
import { AIWorkspaceGuardrailsChip } from '../AIWorkspaceGuardrailsChip';
import { useChatHistory } from '../../../hooks/useChatHistory';

interface TagUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function TagUnifiedCard({ onExpandClick, onChatInputClick }: TagUnifiedCardProps) {
  // Load chat history for Tag
  const { messages: historyMessages, isLoading: historyLoading } = useChatHistory({
    employeeSlug: 'tag-ai',
    limit: 50,
    autoLoad: true,
  });
  
  // IMPORTANT: Use ref to store send function - avoids state updates that cause re-renders
  // This breaks the infinite loop because ref updates don't trigger re-renders
  const sendFunctionRef = useRef<((message: string) => Promise<void>) | null>(null);
  
  // Guardrails state from EmployeeChatWorkspace (updated via callback)
  // Default to true (active) - guardrails are always enabled by default
  const [guardrailsActive, setGuardrailsActive] = useState<boolean | null>(true);
  const [piiProtectionActive, setPiiProtectionActive] = useState<boolean | null>(true);
  
  // IMPORTANT: Memoize callback to prevent infinite loop - stable reference prevents EmployeeChatWorkspace from re-running effects
  // Callback only assigns to ref (no state updates), so it's safe
  const handleSendFunctionReady = useCallback((fn: (message: string) => Promise<void>) => {
    sendFunctionRef.current = fn;
  }, []); // Empty deps - callback never changes

  // Handle guardrails state updates from EmployeeChatWorkspace
  const handleGuardrailsStateChange = useCallback((guardrails: boolean, pii: boolean) => {
    setGuardrailsActive(guardrails);
    setPiiProtectionActive(pii);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-full">
      <div className="bg-gradient-to-br from-teal-900/40 to-slate-900/10 border-b border-slate-800 pb-6 flex-shrink-0 -mx-6 -mt-6 px-6 pt-6">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/50 flex-shrink-0">
            <span className="text-3xl">🏷️</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight truncate">
              Tag — Smart Categories AI
            </h2>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
              Intelligent categorization · Auto-organize your transactions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-cyan-400">1,247</div>
            <div className="text-xs text-slate-500">Items Tagged</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-green-400">98.5%</div>
            <div className="text-xs text-slate-500">Accuracy</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-purple-400">45</div>
            <div className="text-xs text-slate-500">Categories</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 min-w-0 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500/30 text-white text-xs sm:text-sm"
          >
            <Sparkles className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Auto-Tag</span>
          </Button>
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 min-w-0 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500/30 text-white text-xs sm:text-sm"
          >
            <CheckCircle className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Review</span>
          </Button>
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 min-w-0 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500/30 text-white text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">New</span>
          </Button>
        </div>
        
        {/* Chat History Indicator */}
        {historyMessages.length > 0 && (
          <div className="text-xs text-slate-400 mt-3 px-3 py-1.5 rounded-lg bg-slate-800/30 border border-slate-700/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              <span>
                {historyMessages.length} previous message{historyMessages.length !== 1 ? 's' : ''}
                {historyMessages.length > 0 && (
                  <span className="text-slate-500 ml-1">
                    • Last: {new Date(historyMessages[historyMessages.length - 1].createdAt).toLocaleDateString()}
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chat Workspace */}
      {/* Tag canonical chat: uses universal chat endpoint with employeeSlug="tag-ai" */}
      {/* EmployeeChatWorkspace includes built-in file upload, voice, and drag-and-drop support */}
      <div className="flex-1 min-h-0 overflow-hidden -mx-6">
        <EmployeeChatWorkspace
          employeeSlug="tag-ai"
          className="h-full px-6"
          showHeader={false}
          showComposer={true}
          onSendFunctionReady={handleSendFunctionReady}
          onGuardrailsStateChange={handleGuardrailsStateChange}
        />
      </div>

      <div className="pt-3 pb-0 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300/80 border-t border-slate-800/50 flex-shrink-0 -mx-6 px-6">
        <div className="inline-flex items-center gap-2">
          <AIWorkspaceGuardrailsChip
            guardrailsActive={guardrailsActive}
            piiProtectionActive={piiProtectionActive}
            variant="strip"
            textActive="Guardrails + PII Protection Active"
            textUnknown="Guardrails Status Unknown"
          />
        </div>
        <div className="text-[11px] text-slate-400">
          Secure • Learning Continuously
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// VERIFICATION GUIDE
// ============================================================================
// 
// How to test Tag's universal chat integration with file/voice uploads:
// 
// 1. Navigate to /dashboard/smart-categories
//    - Confirm Tag's unified card shows a chat box with file upload, image, and voice buttons
//    - Verify drag-and-drop zone is active (entire chat area accepts files)
// 
// 2. Test file upload:
//    - Click the paperclip (📎) icon → select a PDF/CSV/image
//    - OR drag and drop a file into the chat area
//    - Expected: File preview appears, upload completes, message sent with file
//    - Verify: Network request to /.netlify/functions/chat includes file data
//    - Verify: employeeSlug="tag-ai" in request
// 
// 3. Test image upload:
//    - Click the image (🖼️) icon → select an image
//    - Expected: Image preview appears, upload completes
//    - Verify: Image is sent to Tag for processing
// 
// 4. Test voice message:
//    - Click the microphone (🎤) icon
//    - Expected: Voice recording interface appears (if implemented)
//    - Note: Voice uses custom event 'chat:voice' - may need global handler
// 
// 5. Test text chat:
//    - Send: "Hi Tag, what do you do?"
//    - Expect: Tag explains categorizing transactions and learning from corrections
//    - Verify: Response comes from universal chat endpoint (/.netlify/functions/chat)
// 
// 6. Test categorization tools:
//    - Ask: "Show me my uncategorized transactions"
//    - Expect: Tag calls transactions_query tool with category: "Uncategorized" filter
//    - Verify: Tool is executed and results are displayed
// 
// 7. Test learning:
//    - Correct a category: "That gas purchase from Shell is actually Groceries"
//    - Expect: Tag calls tag_update_transaction_category tool
//    - Verify: Transaction category is updated and learning rule is saved
// 
// 8. Check browser console:
//    - No "Maximum update depth exceeded" errors
//    - No missing tool errors
//    - Chat messages appear in EmployeeChatWorkspace component
//    - File uploads complete without errors
// 
// ============================================================================
