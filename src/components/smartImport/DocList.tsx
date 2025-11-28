import React, { useState } from 'react';
import { FileText, Calendar, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Code } from 'lucide-react';
import type { ProcessedDocument } from '../../types/smartImport';

interface DocListProps {
  documents: ProcessedDocument[];
  emptyMessage?: string;
}

export const DocList: React.FC<DocListProps> = ({ documents, emptyMessage = 'No documents processed yet' }) => {
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const isExpanded = expandedDocId === doc.id;
        
        return (
          <div
            key={doc.id}
            className={`bg-white/5 hover:bg-white/10 rounded-xl p-4 border transition-all duration-200 ${
              doc.isDuplicate 
                ? 'border-yellow-500/30 bg-yellow-500/5' 
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <h4 className="text-sm font-semibold text-white truncate">{doc.fileName}</h4>
                  {doc.isDuplicate && (
                    <span 
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-xs"
                      title={doc.existingDocumentId ? `Duplicate of document ${doc.existingDocumentId}` : 'Duplicate document'}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Duplicate
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 mb-2">{doc.summary}</p>
                {doc.isDuplicate && (
                  <p className="text-xs text-yellow-300/80 mb-2">
                    This appears to be the same as a document you already uploaded, so we didn't re-import it.
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  {doc.transactionCount > 0 && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">{doc.transactionCount} transaction{doc.transactionCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
                
                {/* Debug View Toggle */}
                {doc.redactedText && (
                  <div className="mt-3">
                    <button
                      onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                      className="flex items-center gap-1 text-xs text-white/60 hover:text-white/80 transition-colors"
                    >
                      <Code className="w-3 h-3" />
                      <span>Raw OCR / Parse Debug</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="mt-2 bg-black/30 rounded-lg p-3 border border-white/10">
                        <div className="text-xs text-white/40 mb-1 font-mono">Raw OCR/Parse Content:</div>
                        <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                          {doc.redactedText}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};





