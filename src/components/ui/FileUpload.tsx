import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  X, 
  File, 
  Image, 
  FileText, 
  Receipt, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Paperclip
} from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
}

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export default function FileUpload({
  onFileUpload,
  acceptedTypes = ['image/*', 'application/pdf', 'text/csv', '.xlsx', '.xls'],
  maxFiles = 5,
  maxSize = 10, // 10MB default
  className = '',
  disabled = false
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      }
      return file.type === type || file.name.toLowerCase().endsWith(type);
    });

    if (!isValidType) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type === 'application/pdf') return FileText;
    if (file.type.includes('spreadsheet') || file.name.includes('.xls')) return FileText;
    if (file.type.includes('csv') || file.name.includes('.csv')) return FileText;
    return File;
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const newUploadedFiles: UploadedFile[] = [];

    fileArray.forEach((file, index) => {
      const error = validateFile(file);
      
      if (error) {
        newUploadedFiles.push({
          id: `${Date.now()}-${index}`,
          file,
          status: 'error',
          progress: 0,
          error});
      } else {
        validFiles.push(file);
        newUploadedFiles.push({
          id: `${Date.now()}-${index}`,
          file,
          status: 'uploading',
          progress: 0});
      }
    });

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    // Simulate upload progress for valid files
    validFiles.forEach((file, index) => {
      const fileId = newUploadedFiles.find(f => f.file === file)?.id;
      if (fileId) {
        simulateUpload(fileId);
      }
    });

    if (validFiles.length > 0) {
      onFileUpload(validFiles);
    }
  }, [acceptedTypes, maxSize, onFileUpload]);

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'success' as const, progress: 100 }
              : f
          )
        );
      } else {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, progress }
              : f
          )
        );
      }
    }, 200);
  };

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
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
          isDragOver 
            ? 'border-blue-400 bg-blue-50/10' 
            : 'border-gray-300/30 hover:border-gray-400/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="space-y-3">
          <div className="flex justify-center">
            <div className={`p-3 rounded-full ${
              isDragOver ? 'bg-blue-500/20' : 'bg-gray-500/20'
            }`}>
              <Upload className={`w-6 h-6 ${
                isDragOver ? 'text-blue-400' : 'text-gray-400'
              }`} />
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-200">
              {isDragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {acceptedTypes.join(', ')} • Max {maxSize}MB per file • Up to {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files List */}
      
        {uploadedFiles.length > 0 && (
          <div
            className="space-y-2"
          >
            <h4 className="text-sm font-medium text-gray-200">Uploaded Files</h4>
            {uploadedFiles.map((uploadedFile) => {
              const FileIcon = getFileIcon(uploadedFile.file);
              
              return (
                <div
                  key={uploadedFile.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    uploadedFile.status === 'error' 
                      ? 'border-red-500/30 bg-red-500/10' 
                      : uploadedFile.status === 'success'
                      ? 'border-green-500/30 bg-green-500/10'
                      : 'border-gray-500/30 bg-gray-500/10'
                  }`}
                >
                  <FileIcon className="w-5 h-5 text-gray-400" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {uploadedFile.status === 'uploading' && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        <span className="text-xs text-blue-400">{Math.round(uploadedFile.progress)}%</span>
                      </div>
                    )}
                    
                    {uploadedFile.status === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                    
                    {uploadedFile.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(uploadedFile.id);
                      }}
                      className="p-1 hover:bg-gray-500/20 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  {uploadedFile.error && (
                    <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-300">
                      {uploadedFile.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      
    </div>
  );
}
