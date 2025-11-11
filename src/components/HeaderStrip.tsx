/**
 * HeaderStrip Component
 * 
 * Shows HTTP headers from chat responses in a visual strip.
 * Grade 4 explanation: This component takes the headers (like X-Employee, X-Memory-Hit)
 * from the server response and shows them in little colored boxes so you can see
 * what the server is telling us.
 */

import React from "react";

type HeaderStripProps = { 
  /** Headers from the API response */
  headers?: Record<string, string | undefined> 
};

// Order to show headers (most important first)
// Day 16: Added new headers for CSV orchestration and memory verification
const ORDER = [
  "X-Employee",
  "X-Route-Confidence",
  "X-Memory-Hit",
  "X-Memory-Count",
  "X-Memory-Verified",
  "X-Stream-Chunk-Count",
  "X-OCR-Provider",
  "X-OCR-Parse",
  "X-Transactions-Saved",
  "X-Row-Count",
  "X-Unique-Rows",
  "X-Analysis",
  "X-Categorizer",
  "X-Session-Summary",
  "X-Guardrails",
  "X-PII-Mask"
];

/**
 * Shows headers as colored badges
 * Grade 4 explanation: We loop through each header name in ORDER,
 * check if it exists in headers, and if yes, show it as a little badge.
 */
export default function HeaderStrip({ headers }: HeaderStripProps) {
  // If no headers, don't show anything
  if (!headers) return null;

  return (
    <div className="flex flex-wrap gap-2 my-2 text-xs">
      {ORDER.map((key) => {
        // Get the value for this header key
        const value = headers?.[key];
        
        // If no value, skip this header
        if (!value) return null;

        // Show header as a badge
        // Grade 4 explanation: Each badge has the header name (without "X-")
        // and its value. The badge has a gray background and border.
        return (
          <span 
            key={key} 
            className="px-2 py-1 rounded-full bg-gray-100 border border-gray-200" 
            title={key}
          >
            <strong>{key.replace("X-", "")}:</strong> {value}
          </span>
        );
      })}
    </div>
  );
}

