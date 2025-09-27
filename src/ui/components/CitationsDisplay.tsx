import React from 'react';

interface CitationsDisplayProps {
  citations: Array<{
    id: string;
    title: string;
    source: string;
    url?: string;
    date?: string;
    confidence: number;
  }>;
}

export function CitationsDisplay({ citations }: CitationsDisplayProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Sources:</h4>
      <div className="space-y-2">
        {citations.map((citation) => (
          <div key={citation.id} className="text-xs text-gray-600">
            <div className="font-medium">{citation.title}</div>
            <div className="text-gray-500">
              {citation.source}
              {citation.url && (
                <a 
                  href={citation.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline ml-1"
                >
                  [View]
                </a>
              )}
            </div>
            {citation.date && (
              <div className="text-gray-400">{citation.date}</div>
            )}
            <div className="text-gray-400">
              Confidence: {Math.round(citation.confidence * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}