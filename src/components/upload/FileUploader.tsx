import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Check, FileText, File, Brain } from 'lucide-react';
interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
  acceptedFileTypes: string[];
  multiple?: boolean;
}

const FileUploader = ({
  onFilesSelected,
  isUploading,
  acceptedFileTypes,
  multiple = true
}: FileUploaderProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFilesSelected(acceptedFiles);
    }
  }, [onFilesSelected]);

  const { 
    getRootProps, 
    getInputProps, 
    isDragActive,
    isDragAccept,
    isDragReject,
    acceptedFiles,
    fileRejections
  } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
    },
    multiple});

  const getFileIcon = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'csv') return <FileText size={24} className="text-primary-500" />;
    if (extension === 'pdf') return <File size={24} className="text-error-500" />;
    return <File size={24} className="text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className={`dropzone transition-all ${
          isDragActive ? 'dropzone-active' : ''
        } ${
          isDragReject ? 'border-error-500 bg-error-50' : ''
        } ${
          isDragAccept ? 'border-success-500 bg-success-50' : ''
        } ${
          isUploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <input {...getInputProps()} disabled={isUploading} />
        
        <div
          className="flex flex-col items-center"
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isDragReject ? 'bg-error-100 text-error-600' : 
            isDragAccept ? 'bg-success-100 text-success-600' : 
            'bg-primary-100 text-primary-600'
          }`}>
            {isDragReject ? (
              <X size={32} />
            ) : isDragAccept ? (
              <Check size={32} />
            ) : (
              <Upload size={32} />
            )}
          </div>
          
          <p className="text-base font-medium text-gray-900 mb-1">
            {isDragActive 
              ? isDragAccept 
                ? 'Drop to upload' 
                : 'This file type is not supported'
              : 'Drag & drop your files here'
            }
          </p>
          
          <p className="text-sm text-gray-500 mb-4">
            or <span className="text-primary-600 font-medium">browse files</span>
          </p>
          
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <div className="flex items-center">
              <FileText size={16} className="mr-1" />
              <span>CSV (Auto-import)</span>
            </div>
            <div className="flex items-center">
              <File size={16} className="mr-1" />
              <Brain size={16} className="ml-1 text-primary-500" />
              <span>PDF (AI-powered)</span>
            </div>
          </div>
        </div>
      </div>
      
      {acceptedFiles.length > 0 && !isUploading && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files</h4>
          <ul className="space-y-2">
            {acceptedFiles.map((file, index) => (
              <li key={index} className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg">
                {getFileIcon(file)}
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <span>{(file.size / 1024).toFixed(2)} KB</span>
                    {file.name.toLowerCase().endsWith('.pdf') && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
                        <Brain size={12} className="mr-1" />
                        AI Processing
                      </span>
                    )}
                  </div>
                </div>
                <span className="flex-shrink-0 ml-3">
                  <Check size={16} className="text-success-500" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {fileRejections.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Rejected Files</h4>
          <ul className="space-y-2">
            {fileRejections.map(({ file, errors }, index) => (
              <li key={index} className="flex items-center p-3 bg-error-50 border border-error-200 rounded-lg">
                <File size={24} className="text-error-500" />
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-error-600">{errors[0].message}</p>
                </div>
                <span className="flex-shrink-0 ml-3">
                  <X size={16} className="text-error-500" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
