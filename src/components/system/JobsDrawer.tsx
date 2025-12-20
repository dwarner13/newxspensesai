/**
 * JobsDrawer Component
 * 
 * Slide-out drawer for viewing and managing jobs
 * Shows tabs: Active / Needs You / Completed
 * Includes job cards with progress, status, and actions
 */

import React, { useState } from 'react';
import { X, ChevronRight, CheckCircle, AlertCircle, Clock, Play, Eye, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobsSystemStore, type Job, type JobsDrawerTab } from '../../state/jobsSystemStore';
import { getEmployeeDisplay } from '../../utils/employeeUtils';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface JobCardProps {
  job: Job;
  onFocus: () => void;
  onResume?: () => void;
  onViewResults?: () => void;
  onRetry?: () => void;
}

function JobCard({ job, onFocus, onResume, onViewResults, onRetry }: JobCardProps) {
  const employeeDisplay = getEmployeeDisplay(job.assigned_to_employee);
  const isNeedsUser = job.status === 'needs_user';
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const isRunning = job.status === 'running';
  
  const statusConfig = {
    queued: { label: 'Queued', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-800/50', border: 'border-slate-700' },
    running: { label: 'Running', icon: Clock, color: 'text-sky-400', bg: 'bg-sky-900/30', border: 'border-sky-500/50' },
    needs_user: { label: 'Needs You', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-500/50' },
    completed: { label: 'Completed', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-500/50' },
    failed: { label: 'Failed', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500/50' },
  };
  
  const config = statusConfig[job.status] || statusConfig.queued;
  const StatusIcon = config.icon;
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };
  
  return (
    <div
      className={cn(
        "group relative rounded-xl border p-4 transition-all duration-200",
        "bg-slate-800/50 backdrop-blur-sm",
        "hover:bg-slate-800/70 hover:border-white/20",
        "cursor-pointer",
        isNeedsUser && "border-l-4 border-l-amber-500",
        isCompleted && "border-l-4 border-l-emerald-500"
      )}
      style={{
        // Flash effect for newly completed jobs (one-time, within 5 seconds of completion)
        ...(isCompleted && job.completed_at && new Date(job.completed_at).getTime() > Date.now() - 5000
          ? {
              animation: 'flash-green 0.5s ease-out',
            }
          : {})
      }}
      onClick={onFocus}
    >
      {/* Employee chip */}
      <div className="flex items-center gap-2 mb-2">
        <div className="text-lg">{employeeDisplay.emoji}</div>
        <span className="text-xs font-medium text-slate-300">{employeeDisplay.shortName}</span>
        <span className="text-xs text-slate-500">•</span>
        <span className="text-xs text-slate-500">{formatTime(job.created_at)}</span>
      </div>
      
      {/* Title */}
      <h4 className="text-sm font-semibold text-white mb-2">{job.title}</h4>
      
      {/* Status pill */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border",
          config.bg,
          config.border,
          config.color
        )}>
          <StatusIcon className="w-3 h-3" />
          <span>{config.label}</span>
        </div>
      </div>
      
      {/* Progress bar (only for running/queued) */}
      {(isRunning || job.status === 'queued') && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Progress</span>
            <span>{job.progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full bg-gradient-to-r transition-all duration-300",
                "from-sky-400 via-blue-500 to-indigo-500",
                isRunning && "animate-pulse"
              )}
              style={{ width: `${job.progress}%` }}
            >
              {/* Moving sheen effect when running */}
              {isRunning && (
                <div 
                  className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  style={{
                    animation: 'shimmer 2s infinite',
                    backgroundSize: '200% 100%',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Error message (for failed jobs) */}
      {isFailed && job.error_message && (
        <div className="mb-3 p-2 rounded-lg bg-red-900/20 border border-red-500/30">
          <p className="text-xs text-red-300">{job.error_message}</p>
        </div>
      )}
      
      {/* Result summary (for completed jobs) */}
      {isCompleted && job.result_summary && (
        <div className="mb-3 p-2 rounded-lg bg-emerald-900/20 border border-emerald-500/30">
          <p className="text-xs text-emerald-300">{job.result_summary}</p>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3">
        {isNeedsUser && onResume && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResume();
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3 h-3" />
            Resume
          </button>
        )}
        
        {isCompleted && onViewResults && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewResults();
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3 h-3" />
            View Results
          </button>
        )}
        
        {isFailed && onRetry && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <RotateCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

interface JobDetailPanelProps {
  job: Job | null;
  onClose: () => void;
}

function JobDetailPanel({ job, onClose }: JobDetailPanelProps) {
  if (!job) return null;
  
  const [isPayloadExpanded, setIsPayloadExpanded] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
      className="absolute inset-0 bg-slate-950/95 backdrop-blur-lg border-l border-white/10 flex flex-col transform-gpu"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">Job Details</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-400 mb-1">Title</h4>
          <p className="text-sm text-white">{job.title}</p>
        </div>
        
        <div>
          <h4 className="text-xs font-semibold text-slate-400 mb-1">Status</h4>
          <p className="text-sm text-white capitalize">{job.status}</p>
        </div>
        
        <div>
          <h4 className="text-xs font-semibold text-slate-400 mb-1">Progress</h4>
          <p className="text-sm text-white">{job.progress}%</p>
        </div>
        
        {job.result_summary && (
          <div>
            <h4 className="text-xs font-semibold text-slate-400 mb-1">Result Summary</h4>
            <p className="text-sm text-white">{job.result_summary}</p>
          </div>
        )}
        
        {job.error_message && (
          <div>
            <h4 className="text-xs font-semibold text-red-400 mb-1">Error</h4>
            <p className="text-sm text-red-300">{job.error_message}</p>
          </div>
        )}
        
        {job.result_payload && (
          <div>
            <button
              onClick={() => setIsPayloadExpanded(!isPayloadExpanded)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors mb-1"
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform", isPayloadExpanded && "rotate-90")} />
              <span>Result Payload (JSON)</span>
            </button>
            {isPayloadExpanded && (
              <pre className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded-lg overflow-x-auto border border-white/10">
                {JSON.stringify(job.result_payload, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function JobsDrawer() {
  const {
    isDrawerOpen,
    setDrawerOpen,
    activeTab,
    setActiveTab,
    focusedJobId,
    focusJob,
    getJobsByTab,
    runningCount,
    needsUserCount,
  } = useJobsSystemStore();
  
  const jobs = getJobsByTab(activeTab);
  const focusedJob = focusedJobId ? jobs.find(j => j.id === focusedJobId) : null;
  
  const tabs: { id: JobsDrawerTab; label: string; count?: number }[] = [
    { id: 'active', label: 'Active', count: runningCount },
    { id: 'needs_you', label: 'Needs You', count: needsUserCount },
    { id: 'completed', label: 'Completed' },
  ];
  
  const handleResume = (job: Job) => {
    // TODO: Implement resume logic
    toast.success(`Resuming: ${job.title}`);
    focusJob(null);
  };
  
  const handleViewResults = (job: Job) => {
    focusJob(job.id);
  };
  
  const handleRetry = (job: Job) => {
    // Placeholder - no backend retry yet
    toast('Retry coming soon', {
      icon: '⏳',
      duration: 2000,
    });
  };
  
  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'ease-out' }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-slate-950/95 backdrop-blur-lg border-l border-white/10 shadow-2xl z-[80] flex flex-col transform-gpu"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-white">Jobs & Updates</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-400">Track your AI team's progress</p>
                  <span className="text-xs text-slate-500">•</span>
                  <p className="text-xs text-emerald-400">
                    AI Team: Active{runningCount > 0 && ` • ${runningCount} running`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 border-b border-white/10 shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    focusJob(null);
                  }}
                  className={cn(
                    "relative px-4 py-3 text-sm font-medium transition-colors",
                    "border-b-2 -mb-px",
                    activeTab === tab.id
                      ? "text-white border-white/40"
                      : "text-slate-400 border-transparent hover:text-slate-300"
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-700 text-xs text-slate-300">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-h-0 relative">
              {focusedJob ? (
                <JobDetailPanel job={focusedJob} onClose={() => focusJob(null)} />
              ) : (
                <div className="h-full overflow-y-auto p-4">
                  {jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                        <Clock className="w-8 h-8 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-400">
                        {activeTab === 'active' && 'No active jobs'}
                        {activeTab === 'needs_you' && 'No jobs need your attention'}
                        {activeTab === 'completed' && 'No completed jobs'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          onFocus={() => focusJob(job.id)}
                          onResume={() => handleResume(job)}
                          onViewResults={() => handleViewResults(job)}
                          onRetry={() => handleRetry(job)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}








