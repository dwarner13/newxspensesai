import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Image, 
  FileSpreadsheet, 
  File, 
  Camera, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Paperclip,
  FolderOpen
} from 'lucide-react';

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress?: number;
  url?: string;
  file?: File;
}

interface DocumentUploadZoneProps {
  onFilesUploaded: (files: FileList) => void;
  onFileRemoved: (fileId: string) => void;
  attachments: FileAttachment[];
  isUploading: boolean;
  employeeName: string;
  employeeColor: string;
  isMobile?: boolean;
  className?: string;
}

const supportedFileTypes = {
  'application/pdf': { icon: <FileText className="w-6 h-6" />, label: 'PDF' },
  'text/csv': { icon: <FileSpreadsheet className="w-6 h-6" />, label: 'CSV' },
  'application/vnd.ms-excel': { icon: <FileSpreadsheet className="w-6 h-6" />, label: 'Excel' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: <FileSpreadsheet className="w-6 h-6" />, label: 'Excel' },
  'text/plain': { icon: <FileText className="w-6 h-6" />, label: 'Text' },
  'image/jpeg': { icon: <Image className="w-6 h-6" />, label: 'JPEG' },
  'image/jpg': { icon: <Image className="w-6 h-6" />, label: 'JPG' },
  'image/png': { icon: <Image className="w-6 h-6" />, label: 'PNG' },
  'image/gif': { icon: <Image className="w-6 h-6" />, label: 'GIF' }
};

const getFileIcon = (type: string) => {
  return supportedFileTypes[type as keyof typeof supportedFileTypes]?.icon || <File className="w-6 h-6" />;
};

const getFileLabel = (type: string) => {
  return supportedFileTypes[type as keyof typeof supportedFileTypes]?.label || 'File';
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function DocumentUploadZone({
  onFilesUploaded,
  onFileRemoved,
  attachments,
  isUploading,
  employeeName,
  employeeColor,
  isMobile = false,
  className = ''
}: DocumentUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUploadArea, setShowUploadArea] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFilesUploaded(files);
    }
  }, [onFilesUploaded]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesUploaded(files);
    }
    // Reset input value to allow same file selection
    e.target.value = '';
  }, [onFilesUploaded]);

  const handleCameraCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesUploaded(files);
    }
    // Reset input value to allow same file selection
    e.target.value = '';
  }, [onFilesUploaded]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return `${employeeName} is analyzing...`;
      case 'completed':
        return 'Ready!';
      case 'error':
        return 'Upload failed';
      default:
        return '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Trigger Button */}
      {!showUploadArea && attachments.length === 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowUploadArea(true)}
          className={`w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 group ${isMobile ? 'p-6' : ''}`}
        >
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-orange-100 rounded-full group-hover:bg-orange-200 transition-colors">
              <Upload className="w-6 h-6 text-orange-500" />
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-medium">
                Drop your financial documents here
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {employeeName} loves organizing chaos!
              </p>
              <p className="text-gray-400 text-xs mt-2">
                PDF, CSV, Excel, Images supported
              </p>
            </div>
          </div>
        </motion.button>
      )}

      {/* Upload Area */}
      <AnimatePresence>
        {showUploadArea && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 ${
                isDragOver
                  ? `border-orange-400 bg-orange-50`
                  : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
              }`}
            >
              <div className="flex flex-col items-center space-y-4">
                <div className={`p-4 rounded-full ${isDragOver ? 'bg-orange-200' : 'bg-orange-100'}`}>
                  <FolderOpen className="w-8 h-8 text-orange-500" />
                </div>
                
                <div className="text-center">
                  <p className="text-gray-700 font-medium text-lg">
                    {isDragOver ? 'Drop files here!' : 'Upload your documents'}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    {employeeName} is excited to organize your data!
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 justify-center">
                  <label className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <Paperclip className="w-4 h-4" />
                    <span className="text-sm">Choose Files</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.csv,.xlsx,.xls,.txt,.jpg,.jpeg,.png"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>

                  {isMobile && (
                    <label className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <Camera className="w-4 h-4" />
                      <span className="text-sm">Take Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCameraCapture}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="text-xs text-gray-400 text-center">
                  <p>Supported: PDF, CSV, Excel, TXT, JPG, PNG</p>
                  <p>Max file size: 10MB per file</p>
                </div>
              </div>
            </div>

            {/* Close Upload Area */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowUploadArea(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Attachments */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">
                Uploaded Files ({attachments.length})
              </h4>
              <button
                onClick={() => setShowUploadArea(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {attachments.map((attachment) => (
                <motion.div
                  key={attachment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(attachment.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(attachment.status)}
                        <button
                          onClick={() => onFileRemoved(attachment.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        {getFileLabel(attachment.type)} • {formatFileSize(attachment.size)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getStatusMessage(attachment.status)}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    {(attachment.status === 'uploading' || attachment.status === 'processing') && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all duration-300 ${
                              attachment.status === 'uploading' ? 'bg-blue-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${attachment.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Status */}
      {isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span className="text-sm text-blue-700">
            {employeeName} is processing your documents...
          </span>
        </motion.div>
      )}
    </div>
  );
}
