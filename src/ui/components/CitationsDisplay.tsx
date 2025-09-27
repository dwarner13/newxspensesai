import React from 'react';

interface Citation {
  title: string;
  source: string;
  url?: string;
  date?: string;
  confidence: number;
}

export function CitationsDisplay({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) return null;
  
  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Sources</h4>
      <div className="space-y-2">
        {citations.map((cite, i) => (
          <div key={i} className="text-xs">
            <div className="flex items-center gap-2">
              {cite.url ? (
                <a
                  href={cite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {cite.title}
                </a>
              ) : (
                <span className="font-medium">{cite.title}</span>
              )}
              <span className="text-gray-500">({cite.source})</span>
              {cite.confidence < 0.9 && (
                <span className="text-orange-500">
                  {Math.round(cite.confidence * 100)}% confident
                </span>
              )}
            </div>
            {cite.date && (
              <div className="text-gray-400 ml-2">
                Last verified: {new Date(cite.date).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
