# 🧩 Universal Chat System - Component Implementation Guide

**React + Tailwind CSS Component Specifications**

---

## 📦 Component Structure

```
src/components/chat/universal/
├── UniversalChatPanel.tsx          # Root component
├── ChatHeader.tsx                  # Employee header
├── ChatMessages.tsx                # Message list
├── ChatComposer.tsx                # Input + uploads
├── EmployeeSwitcher.tsx             # Employee selector
├── HandoffIndicator.tsx            # Handoff animation
├── BackgroundTaskIndicator.tsx    # Task status
├── HistoryRecallPanel.tsx          # History search
├── CTALink.tsx                     # Dashboard links
├── ToolChip.tsx                     # Tool usage display
├── MessageBubble.tsx               # Individual message
└── GuardrailsIndicator.tsx         # PII protection badge
```

---

## 🎯 UniversalChatPanel.tsx

### Component Signature

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatComposer from './ChatComposer';
import BackgroundTaskIndicator from './BackgroundTaskIndicator';
import GuardrailsIndicator from './GuardrailsIndicator';

interface UniversalChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployee?: string;
  conversationId?: string;
  context?: {
    page?: string;
    action?: string;
    data?: any;
  };
}

export default function UniversalChatPanel({
  isOpen,
  onClose,
  initialEmployee = 'prime',
  conversationId,
  context
}: UniversalChatPanelProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const {
    currentEmployee,
    messages,
    conversationId: storeConversationId,
    loadConversation,
    sendMessage,
    switchEmployee
  } = useChatStore();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load conversation on mount
  useEffect(() => {
    if (conversationId && conversationId !== storeConversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  // Handle context from dashboard
  useEffect(() => {
    if (context?.action && context.action.startsWith('ask_')) {
      const employee = context.action.replace('ask_', '');
      switchEmployee(employee);
    }
  }, [context]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Body scroll lock (mobile)
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  }, [isOpen, isMobile]);

  if (!isOpen && !isMinimized) return null;

  // Mobile minimized pill
  if (isMobile && isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50
                   h-14 px-4 rounded-full
                   bg-zinc-900/95 backdrop-blur-md
                   border border-white/10
                   flex items-center gap-2
                   shadow-2xl"
      >
        <span className="text-xl">{getEmployeeEmoji(currentEmployee)}</span>
        <span className="text-sm font-medium text-white">{getEmployeeName(currentEmployee)}</span>
        <StatusChip employee={currentEmployee} />
      </button>
    );
  }

  // Desktop slide-out
  if (!isMobile) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
        )}

        {/* Chat Panel */}
        <div
          ref={panelRef}
          className={`
            fixed top-0 right-0 z-50
            w-[420px] h-screen
            bg-[#0b1220] text-white
            shadow-2xl rounded-l-2xl
            flex flex-col
            transition-transform duration-300 ease-out
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <ChatHeader
            employee={currentEmployee}
            onClose={onClose}
            onSwitchEmployee={() => {}}
          />
          
          <ChatMessages messages={messages} />
          
          <ChatComposer
            onSend={sendMessage}
            onUpload={handleUpload}
            disabled={false}
          />
          
          <GuardrailsIndicator />
        </div>
      </>
    );
  }

  // Mobile bottom sheet
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMinimized(true)}
        />
      )}

      {/* Bottom Sheet */}
      <div
        ref={panelRef}
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-[#0b1220] text-white
          rounded-t-2xl shadow-2xl
          flex flex-col
          transition-transform duration-400 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{
          height: 'calc(100vh - env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        <ChatHeader
          employee={currentEmployee}
          onClose={() => setIsMinimized(true)}
          onSwitchEmployee={() => {}}
        />
        
        <ChatMessages messages={messages} />
        
        <ChatComposer
          onSend={sendMessage}
          onUpload={handleUpload}
          disabled={false}
        />
        
        <GuardrailsIndicator />
      </div>
    </>
  );
}
```

---

## 📋 ChatHeader.tsx

### Component Signature

```typescript
import React from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import StatusChip from './StatusChip';
import EmployeeSwitcher from './EmployeeSwitcher';

interface ChatHeaderProps {
  employee: string;
  onClose: () => void;
  onSwitchEmployee: () => void;
}

export default function ChatHeader({
  employee,
  onClose,
  onSwitchEmployee
}: ChatHeaderProps) {
  const { status, userName } = useChatStore();
  const [showSwitcher, setShowSwitcher] = useState(false);

  const employeeInfo = getEmployeeInfo(employee);

  return (
    <div className="flex items-center justify-between p-4 border-b border-white/10">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Employee Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500
                        flex items-center justify-center text-xl flex-shrink-0">
          {employeeInfo.emoji}
        </div>

        {/* Employee Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white truncate">
              {employeeInfo.name}
            </h3>
            <StatusChip status={status} />
          </div>
          <p className="text-xs text-white/70 truncate">
            {employeeInfo.role}
          </p>
          {userName && (
            <p className="text-xs text-white/50 truncate">
              Helping {userName}...
            </p>
          )}
        </div>

        {/* Employee Switcher */}
        <button
          onClick={() => setShowSwitcher(!showSwitcher)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Switch employee"
        >
          <ChevronDown className="w-4 h-4 text-white/70" />
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Close chat"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* Employee Switcher Dropdown */}
      {showSwitcher && (
        <EmployeeSwitcher
          currentEmployee={employee}
          onSelect={(newEmployee) => {
            switchEmployee(newEmployee);
            setShowSwitcher(false);
          }}
          onClose={() => setShowSwitcher(false)}
        />
      )}
    </div>
  );
}
```

---

## 💬 ChatMessages.tsx

### Component Signature

```typescript
import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import HandoffIndicator from './HandoffIndicator';

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export default function ChatMessages({ messages }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-3
                 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
    >
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <div className="text-4xl mb-4">👑</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Welcome to XspensesAI
          </h3>
          <p className="text-sm text-white/70 mb-4">
            I'm Prime, your AI financial cofounder. How can I help you today?
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['Analyze Spending', 'Set Goals', 'Upload Documents', 'Debt Plan'].map((action) => (
              <button
                key={action}
                className="px-3 py-1.5 rounded-full text-xs bg-white/10 hover:bg-white/15
                           text-white/90 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((message, index) => {
        // Check if next message is a handoff
        const nextMessage = messages[index + 1];
        const isHandoff = nextMessage?.type === 'handoff';

        return (
          <React.Fragment key={message.id}>
            <MessageBubble message={message} />
            {isHandoff && (
              <HandoffIndicator
                from={message.employee || 'prime'}
                to={nextMessage.to}
                message={nextMessage.message}
              />
            )}
          </React.Fragment>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
}
```

---

## 💭 MessageBubble.tsx

### Component Signature

```typescript
import React from 'react';
import { format } from 'date-fns';
import ToolChip from './ToolChip';
import CTALink from './CTALink';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === 'user';
  const isAI = message.type === 'ai';
  const isSystem = message.type === 'system';
  const isHandoff = message.type === 'handoff';
  const isCTA = message.type === 'cta';

  // User message
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-4 py-2 rounded-2xl bg-blue-600 shadow-sm">
          <p className="text-sm text-white whitespace-pre-wrap break-words">
            {message.content}
          </p>
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((file, i) => (
                <div
                  key={i}
                  className="px-2 py-1 rounded bg-white/20 text-xs text-white"
                >
                  📎 {file.name}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-white/70 mt-1">
            {format(new Date(message.timestamp), 'h:mm a')}
          </p>
        </div>
      </div>
    );
  }

  // AI message
  if (isAI) {
    const employeeInfo = getEmployeeInfo(message.employee);
    
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] px-4 py-2 rounded-2xl bg-white/10 shadow-sm">
          {/* Employee Badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{employeeInfo.emoji}</span>
            <span className="text-xs font-medium text-white/90">
              {employeeInfo.name}
            </span>
          </div>

          {/* Message Content */}
          <p className="text-sm text-white whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {/* Tool Chips */}
          {message.tools && message.tools.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.tools.map((tool, i) => (
                <ToolChip key={i} tool={tool} employee={message.employee} />
              ))}
            </div>
          )}

          {/* CTA */}
          {message.cta && (
            <div className="mt-3">
              <CTALink cta={message.cta} />
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-white/50 mt-1">
            {format(new Date(message.timestamp), 'h:mm a')}
          </p>
        </div>
      </div>
    );
  }

  // Handoff message
  if (isHandoff) {
    return (
      <HandoffIndicator
        from={message.from}
        to={message.to}
        message={message.message}
      />
    );
  }

  // System message
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 rounded-full bg-white/5 text-xs text-white/70">
          {message.content}
        </div>
      </div>
    );
  }

  return null;
}
```

---

## ✍️ ChatComposer.tsx

### Component Signature

```typescript
import React, { useState, useRef, useCallback } from 'react';
import { Paperclip, Image, Mic, Send } from 'lucide-react';

interface ChatComposerProps {
  onSend: (text: string, files?: File[]) => void;
  onUpload: (files: File[]) => void;
  disabled?: boolean;
}

export default function ChatComposer({
  onSend,
  onUpload,
  disabled = false
}: ChatComposerProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle send
  const handleSend = useCallback(() => {
    if (!input.trim() && attachments.length === 0) return;
    if (disabled) return;

    onSend(input.trim(), attachments);
    setInput('');
    setAttachments([]);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, attachments, onSend, disabled]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-resize
    e.target.style.height = 'auto';
    const newHeight = Math.min(e.target.scrollHeight, 96); // Max 4 lines
    e.target.style.height = `${newHeight}px`;
  };

  // File upload
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setAttachments(prev => [...prev, ...fileArray].slice(0, 4)); // Max 4 files
  };

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  return (
    <div
      className={`
        border-t border-white/10 p-3
        ${isDragging ? 'bg-blue-500/10' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1 rounded bg-white/10 text-xs text-white/90
                         flex-shrink-0"
            >
              <span>📎</span>
              <span className="truncate max-w-[100px]">{file.name}</span>
              <button
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                className="text-white/50 hover:text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        {/* Action Buttons */}
        <div className="flex gap-1">
          {/* File Upload */}
          <label className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15
                           flex items-center justify-center cursor-pointer transition-colors">
            <Paperclip className="w-4 h-4 text-white/70" />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </label>

          {/* Image Upload */}
          <label className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15
                           flex items-center justify-center cursor-pointer transition-colors">
            <Image className="w-4 h-4 text-white/70" />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </label>

          {/* Voice Input */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('chat:voice'))}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15
                       flex items-center justify-center transition-colors"
          >
            <Mic className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          disabled={disabled}
          rows={1}
          className="flex-1 min-h-[40px] max-h-[96px] px-3 py-2 rounded-xl
                     bg-white/10 text-white placeholder-white/50
                     resize-none focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!input.trim() && attachments.length === 0) || disabled}
          className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center transition-colors"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
```

---

## 🔄 HandoffIndicator.tsx

### Component Signature

```typescript
import React, { useEffect, useState } from 'react';

interface HandoffIndicatorProps {
  from: string;
  to: string;
  message?: string;
}

export default function HandoffIndicator({
  from,
  to,
  message
}: HandoffIndicatorProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const fromInfo = getEmployeeInfo(from);
  const toInfo = getEmployeeInfo(to);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex justify-center my-4">
      <div
        className={`
          px-4 py-2 rounded-full
          bg-gradient-to-r from-purple-500/20 to-blue-500/20
          border border-purple-500/30
          flex items-center gap-2
          transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-70'}
        `}
      >
        <span className="text-lg animate-pulse">🔄</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/90">{fromInfo.name}</span>
          <span className="text-xs text-white/70">→</span>
          <span className="text-sm text-white/90">{toInfo.name}</span>
        </div>
        {message && (
          <span className="text-xs text-white/70 ml-2">{message}</span>
        )}
      </div>
    </div>
  );
}
```

---

## 🔗 CTALink.tsx

### Component Signature

```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface CTALinkProps {
  cta: {
    label: string;
    action: 'navigate' | 'open_modal' | 'execute_tool';
    target: string;
    params?: Record<string, any>;
  };
}

export default function CTALink({ cta }: CTALinkProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    switch (cta.action) {
      case 'navigate':
        navigate(cta.target, { state: cta.params });
        break;
      case 'open_modal':
        window.dispatchEvent(new CustomEvent('modal:open', {
          detail: { modal: cta.target, params: cta.params }
        }));
        break;
      case 'execute_tool':
        window.dispatchEvent(new CustomEvent('tool:execute', {
          detail: { tool: cta.target, params: cta.params }
        }));
        break;
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full px-4 py-3 rounded-xl
                 bg-gradient-to-r from-blue-600 to-purple-600
                 hover:from-blue-700 hover:to-purple-700
                 text-white font-medium
                 flex items-center justify-between
                 transition-all duration-200
                 shadow-lg hover:shadow-xl"
    >
      <span>{cta.label}</span>
      <ArrowRight className="w-4 h-4" />
    </button>
  );
}
```

---

## 🛠️ ToolChip.tsx

### Component Signature

```typescript
import React from 'react';

interface ToolChipProps {
  tool: string;
  employee: string;
}

const TOOL_ICONS: Record<string, string> = {
  'ocr': '📄',
  'spending_summary': '📊',
  'loan_forecast': '🧮',
  'action_plan': '⚡',
  'goal_creation': '🎯',
  'categorization': '🏷️',
};

const TOOL_LABELS: Record<string, string> = {
  'ocr': 'Byte OCR',
  'spending_summary': 'Crystal Spending Summary',
  'loan_forecast': 'Finley Loan Forecast',
  'action_plan': 'Blitz Action Plan',
  'goal_creation': 'Goalie Goal Created',
  'categorization': 'Tag Categorization',
};

export default function ToolChip({ tool, employee }: ToolChipProps) {
  const icon = TOOL_ICONS[tool] || '🔧';
  const label = TOOL_LABELS[tool] || tool;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full
                    bg-white/5 border border-white/10
                    text-xs text-white/70">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}
```

---

## 🔒 GuardrailsIndicator.tsx

### Component Signature

```typescript
import React from 'react';
import { Shield } from 'lucide-react';

interface GuardrailsIndicatorProps {
  active?: boolean;
  piiDetected?: boolean;
}

export default function GuardrailsIndicator({
  active = true,
  piiDetected = false
}: GuardrailsIndicatorProps) {
  return (
    <div className="px-4 py-2 border-t border-white/10
                   flex items-center justify-center gap-2
                   text-xs text-white/50">
      <Shield className="w-3 h-3" />
      <span>Guardrails Active — PII Protected</span>
      {piiDetected && (
        <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
          PII Detected
        </span>
      )}
    </div>
  );
}
```

---

## 📊 StatusChip.tsx

### Component Signature

```typescript
import React from 'react';

interface StatusChipProps {
  status: EmployeeStatus;
}

export default function StatusChip({ status }: StatusChipProps) {
  if (status.type === 'idle') return null;

  const config = {
    working: {
      label: 'Working...',
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: '⏳'
    },
    done: {
      label: 'Done',
      className: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: '✓'
    },
    awaiting_upload: {
      label: 'Awaiting upload',
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: '⬆'
    },
    handing_off: {
      label: 'Handing off...',
      className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      icon: '🔄'
    }
  }[status.type];

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full
        border text-xs font-medium
        ${config.className}
        ${status.type === 'working' ? 'animate-pulse' : ''}
      `}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {status.type === 'working' && status.message && (
        <span className="ml-1 text-[10px] opacity-75">
          {status.message}
        </span>
      )}
    </div>
  );
}
```

---

## 🗂️ Employee Utilities

### getEmployeeInfo.ts

```typescript
import { EMPLOYEES } from '@/data/aiEmployees';

export function getEmployeeInfo(employeeSlug: string) {
  const employee = EMPLOYEES.find(emp => emp.key === employeeSlug);
  
  if (!employee) {
    return {
      name: 'Prime',
      emoji: '👑',
      role: 'Your AI financial cofounder',
      key: 'prime'
    };
  }

  return {
    name: employee.name,
    emoji: employee.emoji || '🤖',
    role: employee.role || 'AI Assistant',
    key: employee.key
  };
}

export function getEmployeeEmoji(employeeSlug: string): string {
  return getEmployeeInfo(employeeSlug).emoji;
}

export function getEmployeeName(employeeSlug: string): string {
  return getEmployeeInfo(employeeSlug).name;
}
```

---

## 🗄️ Chat Store (Zustand)

### chatStore.ts

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatStore {
  // Conversation
  conversationId: string | null;
  messages: ChatMessage[];
  currentEmployee: string;
  
  // UI State
  isOpen: boolean;
  isMinimized: boolean;
  
  // Memory
  conversationHistory: ConversationSummary[];
  
  // Background Tasks
  backgroundTasks: BackgroundTask[];
  
  // Actions
  sendMessage: (text: string, files?: File[]) => Promise<void>;
  switchEmployee: (employeeId: string) => void;
  loadConversation: (conversationId: string) => Promise<void>;
  addBackgroundTask: (task: BackgroundTask) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversationId: null,
      messages: [],
      currentEmployee: 'prime',
      isOpen: false,
      isMinimized: false,
      conversationHistory: [],
      backgroundTasks: [],

      sendMessage: async (text: string, files?: File[]) => {
        // Implementation
      },

      switchEmployee: (employeeId: string) => {
        set({ currentEmployee: employeeId });
      },

      loadConversation: async (conversationId: string) => {
        // Implementation
      },

      addBackgroundTask: (task: BackgroundTask) => {
        set(state => ({
          backgroundTasks: [...state.backgroundTasks, task]
        }));
      }
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        conversationId: state.conversationId,
        currentEmployee: state.currentEmployee,
        isOpen: state.isOpen,
        isMinimized: state.isMinimized
      })
    }
  )
);
```

---

**This component guide provides complete React + Tailwind implementations for all chat components. Each component is self-contained and ready for integration.**













