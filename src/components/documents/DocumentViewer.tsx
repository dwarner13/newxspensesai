import React, { useState, useEffect } from 'react';
import { X, Download, Eye, FileText, Image, BarChart3, CheckCircle, AlertTriangle } from 'lucide-react';

interface DocumentData {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'csv';
  url: string;
  extractedData?: {
    transactions: Transaction[];
    categories: Category[];
    totalAmount: number;
    confidence: number;
  };
  processingStatus: 'processing' | 'completed' | 'error';
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  confidence: number;
}

interface Category {
  name: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

interface DocumentViewerProps {
  document: DocumentData | null;
  isOpen: boolean;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'data'>('preview');
  const [imageError, setImageError] = useState(false);

  if (!document) return null;

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-6 h-6" />;
      case 'image': return <Image className="w-6 h-6" />;
      case 'csv': return <BarChart3 className="w-6 h-6" />;
      default: return <FileText className="w-6 h-6" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-400';
    if (confidence >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const renderDocumentPreview = () => {
    if (document.type === 'image') {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          {!imageError ? (
            <img
              src={document.url}
              alt={document.name}
              className="max-w-full max-h-full object-contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="text-center text-gray-500">
              <Image className="w-16 h-16 mx-auto mb-2" />
              <p>Image preview unavailable</p>
            </div>
          )}
        </div>
      );
    }

    if (document.type === 'pdf') {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          <div className="text-center text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-2" />
            <p>PDF Preview</p>
            <p className="text-sm">Click download to view full document</p>
          </div>
        </div>
      );
    }

    if (document.type === 'csv') {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          <div className="text-center text-gray-500">
            <BarChart3 className="w-16 h-16 mx-auto mb-2" />
            <p>CSV Data Preview</p>
            <p className="text-sm">View extracted data below</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderExtractedData = () => {
    if (!document.extractedData) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white/60">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
            <p>No extracted data available</p>
            <p className="text-sm">Document is still processing or failed to extract data</p>
          </div>
        </div>
      );
    }

    const { transactions, categories, totalAmount, confidence } = document.extractedData;

    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">Document Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">${totalAmount.toLocaleString()}</p>
              <p className="text-white/60 text-sm">Total Amount</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{transactions.length}</p>
              <p className="text-white/60 text-sm">Transactions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{categories.length}</p>
              <p className="text-white/60 text-sm">Categories</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${getConfidenceColor(confidence)}`}>
                {confidence}%
              </p>
              <p className="text-white/60 text-sm">Confidence</p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">Category Breakdown</h3>
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <div className="flex-1">
                  <p className="text-white font-medium">{category.name}</p>
                  <p className="text-white/60 text-sm">{category.transactionCount} transactions</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">${category.amount.toLocaleString()}</p>
                  <p className="text-white/60 text-sm">{category.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">Transactions</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <div className="flex-1">
                  <p className="text-white font-medium">{transaction.description}</p>
                  <p className="text-white/60 text-sm">{transaction.date} • {transaction.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">${transaction.amount.toLocaleString()}</p>
                  <p className={`text-xs ${getConfidenceColor(transaction.confidence)}`}>
                    {transaction.confidence}% confidence
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/20 w-full max-w-6xl max-h-[90vh] overflow-hidden mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white">
                  {getFileIcon(document.type)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{document.name}</h2>
                  <p className="text-white/60 text-sm capitalize">{document.type} document</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(document.url, '_blank')}
                  className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline">Download</span>
                </button>
                <button
                  onClick={onClose}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4 inline mr-2" />
                Preview
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'data'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Extracted Data
              </button>
            </div>

            {/* Content */}
            <div className="p-6 h-[calc(90vh-200px)] overflow-y-auto">
              {activeTab === 'preview' ? renderDocumentPreview() : renderExtractedData()}
            </div>
          </div>
        </div>
      )}
    
  );
};

export default DocumentViewer;
