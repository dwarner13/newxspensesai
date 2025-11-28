/**
 * System Status Panel
 * 
 * Day 16: Supercharged Intelligence Layer
 * 
 * Shows real-time system telemetry from response headers.
 * Dev-only component for debugging and monitoring.
 */

import React from 'react';

interface SystemStatusProps {
  headers?: Record<string, string | undefined>;
}

const ORDER = [
  'X-Employee',
  'X-Route-Confidence',
  'X-Memory-Hit',
  'X-Memory-Count',
  'X-Memory-Verified',
  'X-OCR-Provider',
  'X-OCR-Parse',
  'X-Row-Count',
  'X-Unique-Rows',
  'X-Analysis',
  'X-Transactions-Saved',
  'X-Categorizer',
  'X-Stream-Chunk-Count',
  'X-Guardrails',
  'X-PII-Mask'
];

export default function SystemStatus({ headers }: SystemStatusProps) {
  // Only show in dev mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  if (!headers) return null;
  
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
      <div className="text-xs font-semibold text-gray-600 mb-2">System Status (Dev)</div>
      <div className="flex flex-wrap gap-2">
        {ORDER.map((key) => {
          const value = headers[key];
          if (!value) return null;
          
          return (
            <span
              key={key}
              className="px-2 py-1 rounded-full bg-white border border-gray-300 text-xs"
              title={`${key}: ${value}`}
            >
              <strong className="text-gray-700">{key.replace('X-', '').replace(/-/g, ' ')}:</strong>{' '}
              <span className="text-gray-900">{value}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

















