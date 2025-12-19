/**
 * Command Palette Component
 * 
 * Modal command palette with search and keyboard navigation
 * Opens with Ctrl+K (Cmd+K on Mac)
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, Crown, Upload, Tags, LineChart, FileText, Activity, Sparkles, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DASHBOARD_ROUTES } from '../../navigation/dashboard-routes';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { useJobsSystemStore } from '../../state/jobsSystemStore';

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { openChat } = useUnifiedChatLauncher();
  const { setDrawerOpen } = useJobsSystemStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Define available commands
  const commands: Command[] = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Go to Main Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      action: () => {
        navigate(DASHBOARD_ROUTES.root);
        onClose();
      },
      keywords: ['dashboard', 'main', 'home'],
    },
    {
      id: 'prime-chat',
      label: 'Go to Prime Chat',
      icon: <Crown className="w-4 h-4" />,
      action: () => {
        navigate(DASHBOARD_ROUTES.primeChat);
        onClose();
      },
      keywords: ['prime', 'chat', 'ceo'],
    },
    {
      id: 'smart-import',
      label: 'Go to Smart Import AI',
      icon: <Upload className="w-4 h-4" />,
      action: () => {
        navigate(DASHBOARD_ROUTES.smartImportAI);
        onClose();
      },
      keywords: ['smart', 'import', 'byte', 'upload', 'receipt'],
    },
    {
      id: 'smart-categories',
      label: 'Go to Smart Categories',
      icon: <Tags className="w-4 h-4" />,
      action: () => {
        navigate(DASHBOARD_ROUTES.smartCategories);
        onClose();
      },
      keywords: ['smart', 'categories', 'tag', 'categorize'],
    },
    {
      id: 'analytics',
      label: 'Go to Analytics AI',
      icon: <LineChart className="w-4 h-4" />,
      action: () => {
        navigate(DASHBOARD_ROUTES.analyticsAI);
        onClose();
      },
      keywords: ['analytics', 'crystal', 'insights', 'reports'],
    },
    {
      id: 'transactions',
      label: 'Go to Transactions',
      icon: <FileText className="w-4 h-4" />,
      action: () => {
        navigate(DASHBOARD_ROUTES.transactions);
        onClose();
      },
      keywords: ['transactions', 'transaction', 'list'],
    },
    {
      id: 'open-prime-chat',
      label: 'Open Prime Chat',
      icon: <Crown className="w-4 h-4" />,
      action: () => {
        openChat({
          initialEmployeeSlug: 'prime-boss',
          context: {
            source: 'command-palette',
          },
        });
        onClose();
      },
      keywords: ['open', 'prime', 'chat', 'talk'],
    },
    {
      id: 'open-ai-pulse',
      label: 'Open AI Pulse',
      icon: <Activity className="w-4 h-4" />,
      action: () => {
        setDrawerOpen(true);
        onClose();
      },
      keywords: ['pulse', 'ai', 'jobs', 'notifications'],
    },
  ], [navigate, onClose, openChat, setDrawerOpen]);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return commands;
    }
    const query = searchQuery.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(query) ||
      cmd.keywords.some(kw => kw.toLowerCase().includes(query))
    );
  }, [commands, searchQuery]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55]"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div 
        className="relative z-[60] w-full max-w-2xl h-auto max-h-[80vh] rounded-xl border border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Command
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-800 bg-slate-900/80 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
            />
          </div>

          {/* Commands List */}
          <div 
            ref={listRef}
            className="max-h-[400px] overflow-y-auto space-y-1"
          >
            {filteredCommands.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No commands found
              </div>
            ) : (
              filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition",
                    "hover:bg-slate-800/80 focus:outline-none focus:bg-slate-800/80",
                    index === selectedIndex && "bg-slate-800/80 ring-2 ring-purple-500/50"
                  )}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="text-slate-300 flex-shrink-0">
                    {cmd.icon}
                  </div>
                  <span className="text-sm text-slate-100 font-medium">
                    {cmd.label}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>Navigate with ↑↓ and press Enter to select</span>
            <span>Press Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Portal to document.body to avoid overflow/clipping issues
  return createPortal(modalContent, document.body);
}





