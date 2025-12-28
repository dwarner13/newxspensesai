/**
 * Byte Activity Item Component
 * 
 * Displays Byte import completion events in Prime's activity feed.
 * Shows integrity verification status and allows navigation to Smart Import.
 */

import React from 'react';
import { CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import type { ActivityEvent } from '../../hooks/useActivityFeed';

interface ByteActivityItemProps {
  event: ActivityEvent;
  onViewResults?: () => void;
}

export function ByteActivityItem({ event, onViewResults }: ByteActivityItemProps) {
  const navigate = useNavigate();
  const { openChat } = useUnifiedChatLauncher();

  // Extract metadata from event
  const metadata = event.metadata || {};
  const docCount = (metadata.doc_count as number) || 0;
  const txnCount = (metadata.txn_count as number) || 0;
  const pages = (metadata.pages as number) || 0;
  const warnings = (metadata.warnings as string[]) || [];
  const integrityVerified = metadata.integrity_verified as boolean | undefined;
  const integrityReason = metadata.integrity_reason as string | undefined;
  const docIds = (metadata.doc_ids as string[]) || [];

  const handleClick = () => {
    if (onViewResults) {
      onViewResults();
    } else {
      // Default: Navigate to Smart Import page
      navigate('/dashboard/smart-import-ai');
    }
  };

  const handleChatWithByte = (e: React.MouseEvent) => {
    e.stopPropagation();
    openChat({
      initialEmployeeSlug: 'byte-docs',
      context: {
        page: 'prime-activity',
        data: {
          source: 'byte-activity-item',
          docIds,
          importRunId,
        },
      },
      initialQuestion: `Tell me about the ${docCount} document${docCount > 1 ? 's' : ''} I just imported.`,
    });
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-start gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-slate-800/60 transition-colors cursor-pointer group"
    >
      {/* Byte icon */}
      <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 text-base">
        📄
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="text-xs font-medium text-slate-200 leading-snug break-words">
            {event.title}
          </p>
          {/* Integrity badge */}
          {integrityVerified !== undefined && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                integrityVerified
                  ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40'
                  : 'bg-amber-500/15 text-amber-200 border border-amber-500/40'
              }`}
              title={integrityReason || (integrityVerified ? 'Verified' : 'Warning')}
            >
              {integrityVerified ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Warning
                </>
              )}
            </span>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-[11px] text-slate-400 leading-snug mb-0.5 break-words">
            {event.description}
          </p>
        )}

        {/* Details */}
        <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-1">
          {docCount > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {docCount} doc{docCount > 1 ? 's' : ''}
            </span>
          )}
          {txnCount > 0 && (
            <span>
              {txnCount} transaction{txnCount > 1 ? 's' : ''}
            </span>
          )}
          {pages > 0 && (
            <span>
              {pages} page{pages > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="text-[10px] text-amber-400 mb-1">
            {warnings.join(', ')}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={handleClick}
            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            View results
          </button>
          <span className="text-slate-600">•</span>
          <button
            onClick={handleChatWithByte}
            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            Chat with Byte
          </button>
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-slate-600 mt-0.5">
          {new Date(event.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

