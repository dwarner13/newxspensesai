/**
 * SmartImportChatPage Component
 * 
 * Complete workspace layout for Byte (Smart Import AI)
 * 
 * Layout:
 * - Left column (33%): Byte Workspace Panel with 6 status cards
 * - Center column (42%): Byte Unified Card (single card with header, messages, input)
 * - Right column (25%): Activity Feed
 * 
 * ⚠️ CHAT ARCHITECTURE SAFEGUARD:
 * - This page MUST NOT render any legacy/inline chat components
 * - All chat for Byte should go through UnifiedAssistantChat via useUnifiedChatLauncher()
 * - ByteUnifiedCard only triggers chat opening - it does NOT render inline chat
 * - The unified slide-out chat is rendered globally by DashboardLayout
 */

import { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { ByteWorkspacePanel } from '../../components/smart-import/ByteWorkspacePanel';
import { ByteUnifiedCard } from '../../components/smart-import/ByteUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useSmartImport } from '../../hooks/useSmartImport';
import { useAuth } from '../../contexts/AuthContext';
import { useDocumentStats } from '../../hooks/useDocumentStats';
// P0 FIX: Removed duplicate useByteQueueStats import - ByteWorkspacePanel already uses it
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { EMPLOYEE_SLUGS } from '@/lib/ai/employeeSlugs';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { PageCinematicFade } from '../../components/ui/PageCinematicFade';
import { SmartImportUploadStatusPanel } from '../../components/smart-import/SmartImportUploadStatusPanel';

// Error Boundary component to catch hook errors and render fallback UI
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ByteWorkspaceErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SmartImportChatPage] Byte workspace error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-0 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">
              Byte stats temporarily unavailable
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              There was an issue loading Byte workspace statistics. The rest of the page is working normally.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onRetry();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-sm font-medium text-slate-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function SmartImportChatPage() {
  // Scroll to top when page loads
  useScrollToTop();
  useEffect(() => {
    console.log("[route-mount]", "/dashboard/smart-import-ai", "SmartImportChatPage");
  }, []);
  const { openChat } = useUnifiedChatLauncher();
  const { userId } = useAuth();
  const safeUserId = userId || undefined;
  const { data: stats, isLoading: statsLoading, isError: statsError } = useDocumentStats();
  
  const [retryKey, setRetryKey] = useState(0);
  
  // Single shared Smart Import hook instance for this page
  const smartImport = useSmartImport(safeUserId, 'upload');

  // Destructure what we need from the shared hook instance
  const {
    uploading: isUploading,
    progress: uploadProgress,
    uploadFileCount,
    lastUploadSummary,
    uploadFiles,
  } = smartImport;

  // P0 FIX: Removed duplicate useByteQueueStats hook
  // ByteWorkspacePanel already calls useByteQueueStats and manages the poller
  // Having two instances creates 2+ pollers that all run simultaneously
  // This reduces noise from 6+ pollers down to 1

  // Removed UI-only labels that are no longer rendered

  // NOTE: Removed auto-open on upload completion.
  // Chat should only open via explicit user actions.

  return (
    <PageCinematicFade>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        left={
          <ByteWorkspaceErrorBoundary
            key={retryKey}
            onRetry={() => {
              setRetryKey((prev: number) => prev + 1);
            }}
          >
            <ByteWorkspacePanel
              stats={stats}
              statsLoading={statsLoading}
              statsError={statsError}
            />
          </ByteWorkspaceErrorBoundary>
        }
        center={
          <ByteUnifiedCard
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: EMPLOYEE_SLUGS.BYTE,
                force: true,
                context: {
                  page: 'smart-import',
                  data: {
                    source: 'smart-import-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: EMPLOYEE_SLUGS.BYTE,
                force: true,
                context: {
                  page: 'smart-import',
                  data: {
                    source: 'smart-import-page',
                  },
                },
              });
            }}
            onUploadStart={() => {
              // P0 FIX: DISABLE automatic chat opening on upload
              // Simple flow: Upload → OCR → Display results (NO chat involvement)
              // User can manually open chat if needed via Expand or Chat Input buttons
            }}
            onUploadFiles={uploadFiles}
            uploadFileCount={uploadFileCount}
            uploadProgress={uploadProgress}
            isUploading={isUploading}
          />
        }
        between={
          <SmartImportUploadStatusPanel
            stats={stats}
            statsLoading={statsLoading}
            statsError={statsError}
            userId={safeUserId}
            lastUploadSummary={lastUploadSummary}
            debugItems={smartImport.lastDebugPayload}
            uploadQueue={smartImport.uploadQueue}
          />
        }
        right={
          <ActivityFeedSidebar 
            scope="smart-import"
            lastUploadSummary={lastUploadSummary}
            limit={30}
            maxHeight={240}
            scrollable
            hideScrollbar
          />
        }
      />
    </PageCinematicFade>
  );
}
