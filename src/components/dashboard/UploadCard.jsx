import React from 'react';
import { Upload } from 'lucide-react';

/**
 * UploadCard component for document upload functionality
 * Handles drag and drop file upload with visual feedback
 */
const UploadCard = ({ dragOver, onDragOver, onDragLeave, onDrop }) => {
  return (
    <div className="bg-gradient-to-br from-purple-900/60 to-blue-900/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/10 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Upload size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Upload Documents</h3>
          <p className="text-sm text-white/60">Bank statements, receipts, invoices</p>
        </div>
      </div>
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          dragOver 
            ? 'border-blue-400 bg-blue-900/50' 
            : 'border-white/30 hover:border-blue-400'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-white/60 mb-4" />
        <h4 className="text-lg font-semibold text-white mb-2">Drop files here or click to upload</h4>
        <p className="text-white/60 mb-4">Support for PDF, JPG, PNG</p>
        <button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all">
          Choose Files
        </button>
      </div>
    </div>
  );
};

export default UploadCard; 