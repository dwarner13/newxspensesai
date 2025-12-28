/**
 * 🔧 Tool Execution UI Component
 * 
 * Phase 3.1: Displays tool execution status and results in chat
 * 
 * Shows:
 * - Tool name
 * - Loading state during execution
 * - Tool results (formatted, collapsible)
 * - Errors if tool fails
 */

import React, { useState } from 'react';
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Wrench } from 'lucide-react';

export interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'executing' | 'completed' | 'error';
  result?: any;
  error?: string;
}

interface ToolExecutionProps {
  toolCall: ToolCall;
  className?: string;
}

/**
 * Format tool result for display
 */
function formatToolResult(result: any): string {
  if (result === null || result === undefined) {
    return 'No result';
  }
  
  if (typeof result === 'string') {
    return result;
  }
  
  if (typeof result === 'object') {
    try {
      // Pretty print JSON with indentation
      return JSON.stringify(result, null, 2);
    } catch (e) {
      return String(result);
    }
  }
  
  return String(result);
}

/**
 * Get human-readable tool name
 */
function getToolDisplayName(toolName: string): string {
  // Convert snake_case to Title Case
  return toolName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ToolExecution({ toolCall, className = '' }: ToolExecutionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { name, status, result, error } = toolCall;
  
  const displayName = getToolDisplayName(name);
  const hasResult = result !== undefined && result !== null;
  const hasError = error !== undefined && error !== null;
  const canExpand = hasResult || hasError;
  
  return (
    <div className={`mt-2 rounded-lg border ${className}`}>
      {/* Tool Header */}
      <div
        className={`flex items-center justify-between px-3 py-2 ${
          status === 'error'
            ? 'bg-red-50 border-red-200'
            : status === 'completed'
            ? 'bg-green-50 border-green-200'
            : status === 'executing'
            ? 'bg-blue-50 border-blue-200'
            : 'bg-gray-50 border-gray-200'
        } ${canExpand ? 'cursor-pointer' : ''}`}
        onClick={() => canExpand && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Status Icon */}
          {status === 'error' ? (
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          ) : status === 'completed' ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          ) : status === 'executing' ? (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
          ) : (
            <Wrench className="w-4 h-4 text-gray-500 flex-shrink-0" />
          )}
          
          {/* Tool Name */}
          <span className={`text-sm font-medium truncate ${
            status === 'error'
              ? 'text-red-900'
              : status === 'completed'
              ? 'text-green-900'
              : status === 'executing'
              ? 'text-blue-900'
              : 'text-gray-700'
          }`}>
            {displayName}
          </span>
          
          {/* Status Badge */}
          <span className={`text-xs px-2 py-0.5 rounded ${
            status === 'error'
              ? 'bg-red-100 text-red-700'
              : status === 'completed'
              ? 'bg-green-100 text-green-700'
              : status === 'executing'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {status === 'executing' ? 'Running...' : status === 'completed' ? 'Done' : status === 'error' ? 'Error' : 'Pending'}
          </span>
        </div>
        
        {/* Expand/Collapse Icon */}
        {canExpand && (
          <button
            className="ml-2 p-1 hover:bg-white/50 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            )}
          </button>
        )}
      </div>
      
      {/* Tool Result/Error (Expandable) */}
      {isExpanded && (
        <div className={`px-3 py-2 border-t ${
          hasError
            ? 'bg-red-50'
            : 'bg-white'
        }`}>
          {hasError ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-900">Error:</p>
              <pre className="text-xs text-red-700 whitespace-pre-wrap break-words font-mono">
                {error}
              </pre>
            </div>
          ) : hasResult ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">Result:</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words font-mono max-h-96 overflow-auto">
                {formatToolResult(result)}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Tool Execution List Component
 * Displays multiple tool executions
 */
interface ToolExecutionListProps {
  toolCalls: ToolCall[];
  className?: string;
}

export function ToolExecutionList({ toolCalls, className = '' }: ToolExecutionListProps) {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      {toolCalls.map((toolCall) => (
        <ToolExecution key={toolCall.id} toolCall={toolCall} />
      ))}
    </div>
  );
}



