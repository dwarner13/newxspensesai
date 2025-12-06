/**
 * Extended message types for chat system
 * Supports handoff, upload requests, and task recommendations
 */

export interface BaseMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  processingTime?: number;
}

export interface HandoffMessage extends BaseMessage {
  type: 'handoff';
  fromEmployee: string;
  toEmployee: string;
  reason?: string;
  context?: string;
}

export interface UploadRequestMessage extends BaseMessage {
  type: 'upload_request';
  employeeSlug: string;
  acceptedFormats?: string[];
}

export interface TaskRecommendationMessage extends BaseMessage {
  type: 'task_recommendation';
  tasks: Array<{
    id: string;
    label: string;
    action: string;
    employeeSlug: string;
    icon?: string;
  }>;
}

export interface StatusIndicatorMessage extends BaseMessage {
  type: 'status_indicator';
  status: 'uploading' | 'extracting' | 'categorizing' | 'analyzing' | 'processing';
  message: string;
}

export type ExtendedMessage = 
  | BaseMessage 
  | HandoffMessage 
  | UploadRequestMessage 
  | TaskRecommendationMessage 
  | StatusIndicatorMessage;




