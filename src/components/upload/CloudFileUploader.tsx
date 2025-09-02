/**
 * Cloud File Uploader Component
 * 
 * Enhanced file uploader with cloud storage integration
 * Maintains current upload UI and progress tracking
 */

import React, { useState, useCallback, useRef } from 'react';
import { cloudStorageService, UploadProgress } from '../../lib/cloudStorageService';

interface CloudFileUploaderProps {
  onUploadComplete: (result: { url: string; key: string; filename: string }) => void;
  onUploadError: (error: string) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
  multiple?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: UploadProgress;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  result?: { url: string; key: string };
}

export const CloudFileUploader: React.FC<CloudFileUploaderProps> = ({
  onUploadComplete,
  onUploadError,
  onUploadProgress,
  acceptedTypes = [
    'application/pdf',
    'text/csv',
    'image/jpeg',
    'image/png',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ],
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
  className = ''
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateFileKey = useCallback((filename: string, userId: string): string => {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${userId}/${timestamp}_${sanitizedFilename}`;
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`;
    }

    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }

    return null;
  }, [maxSize, acceptedTypes]);

  const uploadFile = useCallback(async (file: File, userId: string) => {
    const validationError = validateFile(file);
    if (validationError) {
      onUploadError(validationError);
      return;
    }

    const key = generateFileKey(file.name, userId);
    const uploadingFile: UploadingFile = {
      file,
      progress: { loaded: 0, total: file.size, percentage: 0 },
      status: 'uploading'
    };

    setUploadingFiles(prev => [...prev, uploadingFile]);

    try {
      const result = await cloudStorageService.uploadFile(
        file,
        key,
        file.type,
        (progress) => {
          setUploadingFiles(prev => 
            prev.map(f => 
              f.file === file 
                ? { ...f, progress }
                : f
            )
          );
          
          onUploadProgress?.(progress);
        }
      );

      if (result.success) {
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { ...f, status: 'completed', result }
              : f
          )
        );

        onUploadComplete({
          url: result.url,
          key: result.key,
          filename: file.name
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === file 
            ? { ...f, status: 'error', error: errorMessage }
            : f
        )
      );

      onUploadError(errorMessage);
    }
  }, [validateFile, generateFileKey, onUploadComplete, onUploadError, onUploadProgress]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const userId = 'current-user'; // TODO: Get from auth context

    if (!multiple && fileArray.length > 1) {
      onUploadError('Only one file can be uploaded at a time');
      return;
    }

    fileArray.forEach(file => {
      uploadFile(file, userId);
    });
  }, [multiple, uploadFile, onUploadError]);

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
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  const clearCompletedUploads = useCallback(() => {
    setUploadingFiles(prev => prev.filter(f => f.status !== 'completed'));
  }, []);

  const retryUpload = useCallback((file: File, userId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
    uploadFile(file, userId);
  }, [uploadFile]);

  const removeUploadingFile = useCallback((file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  }, []);

  return (
    <div className={`cloud-file-uploader ${className}`}>
      {/* Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports PDF, CSV, JPG, PNG, XLS, XLSX, TXT files up to {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Uploading Files</h3>
            <button
              onClick={clearCompletedUploads}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Completed
            </button>
          </div>

          {uploadingFiles.map((uploadingFile, index) => (
            <div key={index} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {uploadingFile.status === 'uploading' && (
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {uploadingFile.status === 'completed' && (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {uploadingFile.status === 'error' && (
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadingFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Math.round(uploadingFile.file.size / 1024)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {uploadingFile.status === 'error' && (
                    <button
                      onClick={() => retryUpload(uploadingFile.file, 'current-user')}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Retry
                    </button>
                  )}
                  
                  <button
                    onClick={() => removeUploadingFile(uploadingFile.file)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {uploadingFile.status === 'uploading' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadingFile.progress.percentage}%` }}
                  />
                </div>
              )}

              {/* Error Message */}
              {uploadingFile.status === 'error' && uploadingFile.error && (
                <p className="text-sm text-red-600 mt-2">{uploadingFile.error}</p>
              )}

              {/* Success Message */}
              {uploadingFile.status === 'completed' && (
                <p className="text-sm text-green-600 mt-2">Upload completed successfully</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CloudFileUploader;
