/**
 * Chat History Sidebar Component
 * 
 * Displays recent chat sessions grouped by employee, similar to Cursor's chat history.
 * Shows last message date/time and preview.
 * Clickable to open that chat session.
 */

import React, { useState } from 'react';
import { MessageSquare, Clock, X, ChevronRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatSessions } from '../../hooks/useChatSessions';
import { getEmployeeInfo } from '../../utils/employeeUtils';
import { format, formatDistanceToNow } from 'date-fns';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { cn } from '../../lib/utils';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatHistorySidebar({ isOpen, onClose }: ChatHistorySidebarProps) {
  const { sessions, isLoading, loadSessions } = useChatSessions({
    limit: 50, // Show last 50 sessions total
    perEmployee: 10, // Up to 10 sessions per employee (keeps history manageable)
    autoLoad: true,
  });
  
  const { openChat } = useUnifiedChatLauncher();
  // Track which employee section is expanded (null = all expanded by default)
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  // Group sessions by employee
  const groupedSessions = React.useMemo(() => {
    const groups = new Map<string, typeof sessions>();
    sessions.forEach(session => {
      const employee = session.employee_slug;
      if (!groups.has(employee)) {
        groups.set(employee, []);
      }
      groups.get(employee)!.push(session);
    });
    return groups;
  }, [sessions]);

  // Get sorted employee list (by most recent session)
  const employeeList = React.useMemo(() => {
    return Array.from(groupedSessions.entries())
      .map(([employeeSlug, employeeSessions]) => ({
        employeeSlug,
        sessions: employeeSessions,
        lastMessageAt: employeeSessions[0]?.last_message_at || employeeSessions[0]?.created_at,
      }))
      .sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || '').getTime();
        const timeB = new Date(b.lastMessageAt || '').getTime();
        return timeB - timeA;
      });
  }, [groupedSessions]);

  const handleSessionClick = (session: typeof sessions[0]) => {
    openChat({
      initialEmployeeSlug: session.employee_slug,
      conversationId: session.id,
      context: {
        source: 'chat-history-sidebar',
        sessionId: session.id,
      },
    });
    onClose();
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays < 1) {
        // Today - show time
        return format(date, 'h:mm a');
      } else if (diffDays < 7) {
        // This week - show day and time
        return format(date, 'EEE h:mm a');
      } else if (diffDays < 365) {
        // This year - show month and day
        return format(date, 'MMM d');
      } else {
        // Older - show full date
        return format(date, 'MMM d, yyyy');
      }
    } catch (e) {
      return 'Unknown';
    }
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999]"
            onClick={onClose}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-[1000] flex">
            <motion.section
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="
                flex h-full w-full max-w-[420px] flex-col
                rounded-l-3xl border border-slate-800/70
                bg-slate-950/95 backdrop-blur-xl
                shadow-[0_32px_120px_rgba(15,23,42,0.95)]
              "
              aria-label="Chat history sidebar"
            >
              {/* Header */}
              <header className="flex items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/70 px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
                    Prime — History
                  </span>
                  <span className="text-sm text-slate-300">
                    Recent conversations with your AI team.
                  </span>
                </div>

                <button
                  onClick={onClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 text-slate-400 hover:border-slate-500 hover:text-slate-100 transition"
                  aria-label="Close chat history"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </header>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-sm text-slate-400">Loading chat history...</div>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 px-4">
                    <MessageSquare className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-sm text-slate-400 text-center">
                      No chat history yet
                    </p>
                    <p className="text-xs text-slate-500 text-center mt-1">
                      Start a conversation to see it here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employeeList.map(({ employeeSlug, sessions: employeeSessions }) => {
                      const employeeInfo = getEmployeeInfo(employeeSlug);
                      // Show expanded if this employee is selected, or if none selected (show all expanded by default)
                      const isExpanded = selectedEmployee === null || selectedEmployee === employeeSlug;

                      return (
                        <div key={employeeSlug} className="space-y-2">
                          {/* Employee Header */}
                          <button
                            onClick={() => {
                              // Toggle: if clicking the same employee, collapse it (set to null to show all)
                              // If clicking different employee, expand that one
                              setSelectedEmployee(
                                selectedEmployee === employeeSlug ? null : employeeSlug
                              );
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-800/40 bg-slate-900/40 hover:border-slate-700/60 hover:bg-slate-900/60 transition-colors group"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-lg flex-shrink-0">{employeeInfo.emoji}</span>
                              <span className="text-sm font-medium text-slate-200 truncate">
                                {employeeInfo.name}
                              </span>
                              <span className="text-xs text-slate-500">
                                ({employeeSessions.length})
                              </span>
                            </div>
                            <ChevronRight
                              className={cn(
                                "w-4 h-4 text-slate-500 transition-transform flex-shrink-0",
                                isExpanded && "rotate-90"
                              )}
                            />
                          </button>

                          {/* Sessions List */}
                          {isExpanded && (
                            <div className="ml-4 space-y-2">
                              {employeeSessions.map((session) => (
                                <button
                                  key={session.id}
                                  type="button"
                                  onClick={() => handleSessionClick(session)}
                                  className={cn(
                                    "w-full rounded-xl border border-slate-800/40 bg-slate-900/40",
                                    "px-3.5 py-3 text-left",
                                    "hover:border-amber-400/70 hover:bg-slate-900/70 hover:shadow-[0_12px_40px_rgba(15,23,42,0.85)]",
                                    "transition-all"
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <span className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-400">
                                        New Chat
                                      </span>
                                      <span className="text-sm text-slate-100 line-clamp-1 mt-0.5">
                                        {session.last_message_preview || session.title || "Conversation with Prime"}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-slate-500 flex-shrink-0">
                                      {formatRelativeTime(session.last_message_at || session.created_at) || formatTime(session.last_message_at || session.created_at)}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <footer className="border-t border-slate-800/80 bg-slate-950/90 px-6 py-3 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
                <span>Showing last {sessions.length} conversations</span>
                <button
                  type="button"
                  onClick={loadSessions}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 px-3 py-1 hover:border-amber-400/80 hover:text-amber-200 transition"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Refresh</span>
                </button>
              </footer>
            </motion.section>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

