import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { getEmployeeInfo } from '../../utils/employeeUtils';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useChatSessions } from '../../hooks/useChatSessions';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';

type ChatThread = {
  threadId: string;
  employeeSlug: string;
  title?: string;
  summary?: string;
  preview?: string;
  lastMessageAt?: string | null;
  createdAt?: string | null;
  messageCount?: number | null;
  tags?: string[];
};

const DATE_FILTERS = [
  { id: 'all', label: 'All time', days: null },
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
];

const getThreadTimestamp = (thread?: ChatThread | null) => {
  if (!thread) return null;
  return thread.lastMessageAt || thread.createdAt || null;
};

const getThreadDate = (thread: ChatThread) => {
  const timestamp = getThreadTimestamp(thread);
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatRelativeTime = (dateString?: string | null) => {
  if (!dateString) return 'Unknown';
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
};

const formatShortDate = (dateString?: string | null) => {
  if (!dateString) return 'Unknown';
  try {
    return format(new Date(dateString), 'MMM d');
  } catch {
    return 'Unknown';
  }
};

const PIN_LIMIT = 12;
const TODAY_LIMIT = 8;
const WEEK_LIMIT = 10;
const OLDER_LIMIT = 15;

export default function ChatHistoryPage() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { sessions, isLoading, error } = useChatSessions({
    limit: 60,
    perEmployee: 60,
    autoLoad: true,
  });
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [showOlder, setShowOlder] = useState(false);
  const [showMoreToday, setShowMoreToday] = useState(false);
  const [showMoreWeek, setShowMoreWeek] = useState(false);
  const [showAllPinned, setShowAllPinned] = useState(false);
  const [olderLimit, setOlderLimit] = useState(OLDER_LIMIT);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  useEffect(() => {
    const storageKey = userId ? `xai.chatHistory.pins.${userId}` : 'xai.chatHistory.pins.anon';
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPinnedIds(parsed);
        }
      }
    } catch {
      setPinnedIds([]);
    }
  }, [userId]);

  useEffect(() => {
    const storageKey = userId ? `xai.chatHistory.pins.${userId}` : 'xai.chatHistory.pins.anon';
    try {
      localStorage.setItem(storageKey, JSON.stringify(pinnedIds));
    } catch {
      // Ignore storage errors
    }
  }, [pinnedIds, userId]);

  useEffect(() => {
    const normalized: ChatThread[] = sessions.map(session => {
      const employeeSlug = session.employee_slug || 'prime-boss';
      return {
        threadId: session.id,
        employeeSlug,
        title: session.title || 'Untitled chat',
        summary: session.summary || null,
        preview: session.last_message_preview || session.summary || '',
        lastMessageAt: session.last_message_at || null,
        createdAt: session.created_at || null,
        messageCount: session.message_count || null,
        tags: session.tags || [],
      };
    });

    normalized.sort((a, b) => {
      const aTime = new Date(getThreadTimestamp(a) || 0).getTime();
      const bTime = new Date(getThreadTimestamp(b) || 0).getTime();
      return bTime - aTime;
    });
    setThreads(normalized);
  }, [sessions]);

  const employeeOptions = useMemo(() => {
    const unique = new Set(threads.map(t => t.employeeSlug));
    return ['all', ...Array.from(unique)];
  }, [threads]);

  const filteredThreads = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const filterDays = DATE_FILTERS.find(f => f.id === dateFilter)?.days ?? null;
    const cutoff = filterDays ? Date.now() - filterDays * 24 * 60 * 60 * 1000 : null;

    return threads.filter(thread => {
      if (employeeFilter !== 'all' && thread.employeeSlug !== employeeFilter) {
        return false;
      }
      if (cutoff) {
        const ts = new Date(getThreadTimestamp(thread) || 0).getTime();
        if (Number.isNaN(ts) || ts < cutoff) return false;
      }
      if (!search) return true;
      const haystack = `${thread.title || ''} ${thread.summary || ''} ${thread.preview || ''} ${thread.employeeSlug}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [threads, searchTerm, employeeFilter, dateFilter]);

  const groupedThreads = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const pinned = new Set(pinnedIds);
    const today: ChatThread[] = [];
    const last7: ChatThread[] = [];
    const older: ChatThread[] = [];
    const pinnedThreads: ChatThread[] = [];

    filteredThreads.forEach(thread => {
      if (pinned.has(thread.threadId)) {
        pinnedThreads.push(thread);
        return;
      }
      const date = getThreadDate(thread);
      if (!date) {
        older.push(thread);
        return;
      }
      if (date >= startOfToday) {
        today.push(thread);
        return;
      }
      if (date >= startOfWeek) {
        last7.push(thread);
        return;
      }
      older.push(thread);
    });

    return {
      pinned: pinnedThreads,
      today,
      last7,
      older,
    };
  }, [filteredThreads, pinnedIds]);

  useEffect(() => {
    if (!filteredThreads.length) {
      setSelectedThread(null);
      return;
    }
    if (!selectedThread || !filteredThreads.find(t => t.threadId === selectedThread.threadId)) {
      setSelectedThread(filteredThreads[0]);
    }
  }, [filteredThreads, selectedThread]);

  const togglePin = (threadId: string) => {
    setPinnedIds(prev => {
      if (prev.includes(threadId)) {
        return prev.filter(id => id !== threadId);
      }
      return [...prev, threadId];
    });
  };

  const handleOpenThread = (thread: ChatThread) => {
    const params = new URLSearchParams({
      threadId: thread.threadId,
      employeeSlug: thread.employeeSlug,
    });
    navigate(`/dashboard/prime-chat?${params.toString()}`);
  };

  const handleSelectThread = (thread: ChatThread) => {
    setSelectedThread(thread);
  };

  const renderSectionHeader = (label: string, count: number) => (
    <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
      <span>{label}</span>
      <span>{count}</span>
    </div>
  );

  const renderEmptyState = (label: string) => (
    <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4 text-xs text-slate-500">
      {label}
    </div>
  );

  const renderThreadCard = (thread: ChatThread) => {
    const display = getEmployeeInfo(thread.employeeSlug);
    const isSelected = selectedThread?.threadId === thread.threadId;
    const isPinned = pinnedIds.includes(thread.threadId);
    return (
      <div
        key={thread.threadId}
        className={`rounded-2xl border px-4 py-4 transition ${
          isSelected
            ? 'border-sky-500/60 bg-sky-500/10 shadow-[0_0_24px_rgba(56,189,248,0.12)]'
            : 'border-white/10 bg-slate-900/70 hover:-translate-y-0.5 hover:border-white/20 hover:bg-slate-900/90'
        }`}
      >
        <button
          type="button"
          onClick={() => handleSelectThread(thread)}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-white">
                <span className="text-base">{display.emoji}</span>
                <span className="font-medium">{display.name}</span>
              </div>
              <div className="mt-1 text-base font-semibold text-white">
                {thread.title || 'Untitled chat'}
              </div>
            </div>
            <div className="text-xs text-slate-400">
              {formatRelativeTime(getThreadTimestamp(thread))}
            </div>
          </div>
          <div className="mt-2 text-sm text-slate-300/80 line-clamp-2">
            {thread.summary || thread.preview || 'No summary available yet.'}
          </div>
          {thread.tags && thread.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {thread.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs text-white/80 hover:text-white"
            onClick={() => handleOpenThread(thread)}
          >
            Open Chat
          </Button>
          <button
            type="button"
            onClick={() => togglePin(thread.threadId)}
            className={`text-xs ${isPinned ? 'text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {isPinned ? 'Pinned' : 'Pin'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <DashboardPageShell
      right={
        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-5">
          <ActivityFeedSidebar scope="prime" limit={5} variant="embedded" />
        </div>
      }
      center={
        <div className="flex flex-col gap-6 px-6 pb-6">
          <div className="rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-900/70 via-slate-950/80 to-slate-950 p-6 shadow-[0_0_60px_rgba(56,189,248,0.12)] overflow-visible">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Command Center</div>
                <h1 className="text-3xl font-semibold text-white mt-2">Chat History</h1>
                <p className="text-sm text-slate-300/80">
                  Review and reopen conversations across your AI team.
                </p>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-center text-white/90 hover:text-white lg:w-auto"
                onClick={() => setIsNewChatOpen(true)}
              >
                + New Chat
              </Button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {[
                { label: 'Total Chats', value: threads.length },
                { label: 'Active This Week', value: groupedThreads.today.length + groupedThreads.last7.length },
                { label: 'Pinned', value: pinnedIds.length },
                { label: 'Last Activity', value: formatRelativeTime(getThreadTimestamp(threads[0])) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left"
                >
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{stat.label}</div>
                  <div className="mt-2 text-base font-semibold leading-snug text-white md:text-lg">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky top-0 z-30 mt-6 rounded-2xl bg-slate-900/95 px-4 py-4 backdrop-blur overflow-visible">
              <div className="mx-auto grid w-full max-w-4xl gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search chats, topics, or employees"
                  className="h-11 border-white/10 bg-slate-950/60 px-4 text-[13px] leading-5 text-white placeholder:text-slate-500"
                />
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="h-11 w-full rounded-md border border-white/10 bg-slate-950/60 px-4 text-[13px] leading-5 text-white"
                >
                  {employeeOptions.map((slug) => (
                    <option key={slug} value={slug} className="bg-slate-900">
                      {slug === 'all' ? 'All Employees' : getEmployeeInfo(slug).name}
                    </option>
                  ))}
                </select>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-11 w-full rounded-md border border-white/10 bg-slate-950/60 px-4 text-[13px] leading-5 text-white"
                >
                  {DATE_FILTERS.map((filter) => (
                    <option key={filter.id} value={filter.id} className="bg-slate-900">
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-6">
              {isLoading && (
                <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 text-sm text-slate-300">
                  Loading chat history...
                </div>
              )}
              {!isLoading && error && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
                  Unable to load chat history.
                </div>
              )}

              {!isLoading && !error && filteredThreads.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-sm text-slate-300">
                  <div className="text-lg font-semibold text-white">Start your first conversation</div>
                  <p className="mt-2 text-sm text-slate-400">
                    Try asking Prime for a quick financial snapshot, or let Byte organize a recent statement.
                  </p>
                  <Button
                    variant="ghost"
                    className="mt-4 text-white/90 hover:text-white"
                    onClick={() => setIsNewChatOpen(true)}
                  >
                    Start a new chat
                  </Button>
                </div>
              )}

              {!isLoading && !error && (
                <>
                  {groupedThreads.pinned.length > 0 && (
                    <>
                      {renderSectionHeader('Pinned', groupedThreads.pinned.length)}
                      <div className="grid gap-4">
                        {groupedThreads.pinned
                          .slice(0, showAllPinned ? PIN_LIMIT : Math.min(PIN_LIMIT, groupedThreads.pinned.length))
                          .map(renderThreadCard)}
                      </div>
                      {groupedThreads.pinned.length > PIN_LIMIT && !showAllPinned && (
                        <Button
                          variant="ghost"
                          className="w-full text-sm text-white/80 hover:text-white"
                          onClick={() => setShowAllPinned(true)}
                        >
                          View all pinned
                        </Button>
                      )}
                    </>
                  )}

                  {renderSectionHeader('Today', groupedThreads.today.length)}
                  {groupedThreads.today.length === 0 && renderEmptyState('No conversations yet today.')}
                  <div className="grid gap-4">
                    {groupedThreads.today
                      .slice(0, showMoreToday ? groupedThreads.today.length : TODAY_LIMIT)
                      .map(renderThreadCard)}
                  </div>
                  {groupedThreads.today.length > TODAY_LIMIT && !showMoreToday && (
                    <Button
                      variant="ghost"
                      className="w-full text-sm text-white/80 hover:text-white"
                      onClick={() => setShowMoreToday(true)}
                    >
                      View more
                    </Button>
                  )}

                  {renderSectionHeader('Last 7 Days', groupedThreads.last7.length)}
                  {groupedThreads.last7.length === 0 && renderEmptyState('No conversations in the last week.')}
                  <div className="grid gap-4">
                    {groupedThreads.last7
                      .slice(0, showMoreWeek ? groupedThreads.last7.length : WEEK_LIMIT)
                      .map(renderThreadCard)}
                  </div>
                  {groupedThreads.last7.length > WEEK_LIMIT && !showMoreWeek && (
                    <Button
                      variant="ghost"
                      className="w-full text-sm text-white/80 hover:text-white"
                      onClick={() => setShowMoreWeek(true)}
                    >
                      View more
                    </Button>
                  )}

                  {renderSectionHeader('Older', groupedThreads.older.length)}
                  {!showOlder && (
                    <Button
                      variant="ghost"
                      className="w-full text-sm text-white/80 hover:text-white"
                      onClick={() => setShowOlder(true)}
                    >
                      Show older
                    </Button>
                  )}
                  {showOlder && (
                    <>
                      {groupedThreads.older.length === 0 && renderEmptyState('No older conversations yet.')}
                      <div className="grid gap-4">
                        {groupedThreads.older.slice(0, olderLimit).map(renderThreadCard)}
                      </div>
                      {groupedThreads.older.length > olderLimit && (
                        <Button
                          variant="ghost"
                          className="w-full text-sm text-white/80 hover:text-white"
                          onClick={() => setOlderLimit(prev => prev + OLDER_LIMIT)}
                        >
                          Load more
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-5">
              {selectedThread ? (
                <div className="flex h-full flex-col gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Selected conversation
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {selectedThread.title || 'Untitled chat'}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {getEmployeeInfo(selectedThread.employeeSlug).name}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300">
                    <div className="line-clamp-4">
                      {selectedThread.summary || selectedThread.preview || 'No summary available yet.'}
                    </div>
                  </div>
                  {selectedThread.tags && selectedThread.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedThread.tags.map(tag => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Preview</div>
                    <div className="mt-3 text-sm text-slate-300 line-clamp-4">
                      {selectedThread.preview || selectedThread.summary || 'Preview will appear after the next reply.'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{formatRelativeTime(getThreadTimestamp(selectedThread))}</span>
                    <span>{formatShortDate(getThreadTimestamp(selectedThread))}</span>
                  </div>
                  <Button
                    variant="ghost"
                    className="mt-auto w-full text-white/90 hover:text-white"
                    onClick={() => handleOpenThread(selectedThread)}
                  >
                    Open Chat
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-9 w-full text-xs text-white/70 hover:text-white"
                    onClick={() => togglePin(selectedThread.threadId)}
                  >
                    {pinnedIds.includes(selectedThread.threadId) ? 'Unpin conversation' : 'Pin conversation'}
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-slate-900/70 p-6 text-sm text-slate-300">
                  Select a conversation to preview details.
                </div>
              )}
            </div>
          </div>

          {isNewChatOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" onClick={() => setIsNewChatOpen(false)} />
              <div className="relative z-[81] w-full max-w-md rounded-2xl border border-slate-800/70 bg-slate-950 p-6 shadow-2xl">
                <div className="text-lg font-semibold text-white">Start a new chat with</div>
                <div className="mt-4 flex flex-col gap-3">
                  {[
                    { slug: 'prime-boss', label: 'Prime', emoji: '👑' },
                    { slug: 'byte-docs', label: 'Byte', emoji: '📄' },
                    { slug: 'tag-ai', label: 'Tag', emoji: '🏷️' },
                  ].map((item) => (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => {
                        setIsNewChatOpen(false);
                        navigate(`/dashboard/prime-chat?employeeSlug=${item.slug}`);
                      }}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white transition hover:border-white/20 hover:bg-white/10"
                    >
                      <div className="flex items-center gap-3 text-sm font-medium">
                        <span className="text-lg">{item.emoji}</span>
                        {item.label}
                      </div>
                      <span className="text-xs text-slate-400">Open</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
