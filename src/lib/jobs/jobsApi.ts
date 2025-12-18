/**
 * Jobs API Helper Functions
 * 
 * Provides helper functions to create and update jobs
 * Used by handoff system and other job-creating components
 */

import { getSupabase } from '../supabase';
import type { Job, JobStatus } from '../../state/jobsSystemStore';

export interface CreateJobParams {
  userId: string;
  conversationId?: string | null;
  createdByEmployee?: string;
  assignedToEmployee: string;
  title: string;
  status?: JobStatus;
  progress?: number;
}

export interface UpdateJobProgressParams {
  jobId: string;
  progress: number;
  status?: JobStatus;
  resultSummary?: string | null;
  resultPayload?: any | null;
  errorMessage?: string | null;
}

/**
 * Create a new job
 */
export async function createJob(params: CreateJobParams): Promise<Job | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[jobsApi] Supabase not available');
    return null;
  }
  
  const {
    userId,
    conversationId = null,
    createdByEmployee = 'prime',
    assignedToEmployee,
    title,
    status = 'queued',
    progress = 0,
  } = params;
  
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      created_by_employee: createdByEmployee,
      assigned_to_employee: assignedToEmployee,
      title,
      status,
      progress,
    })
    .select()
    .single();
  
  if (error) {
    // Handle missing table gracefully (404/PGRST116)
    if (error.code === 'PGRST116' || 
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        (error.message?.includes('relation') && error.message?.includes('does not exist'))) {
      console.debug('[jobsApi] Jobs table does not exist - feature disabled');
      return null;
    }
    console.error('[jobsApi] Error creating job:', error);
    return null;
  }
  
  return data as Job;
}

/**
 * Update job progress
 */
export async function updateJobProgress(params: UpdateJobProgressParams): Promise<Job | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[jobsApi] Supabase not available');
    return null;
  }
  
  const {
    jobId,
    progress,
    status,
    resultSummary,
    resultPayload,
    errorMessage,
  } = params;
  
  const updateData: any = {
    progress,
    updated_at: new Date().toISOString(),
  };
  
  if (status !== undefined) {
    updateData.status = status;
    
    // Set completed_at when status becomes completed or failed
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }
  }
  
  if (resultSummary !== undefined) {
    updateData.result_summary = resultSummary;
  }
  
  if (resultPayload !== undefined) {
    updateData.result_payload = resultPayload;
  }
  
  if (errorMessage !== undefined) {
    updateData.error_message = errorMessage;
  }
  
  const { data, error } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', jobId)
    .select()
    .single();
  
  if (error) {
    // Handle missing table gracefully (404/PGRST116)
    if (error.code === 'PGRST116' || 
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        (error.message?.includes('relation') && error.message?.includes('does not exist'))) {
      console.debug('[jobsApi] Jobs table does not exist - feature disabled');
      return null;
    }
    console.error('[jobsApi] Error updating job:', error);
    return null;
  }
  
  return data as Job;
}

/**
 * Create a notification for a job
 */
export async function createNotification(params: {
  userId: string;
  jobId: string | null;
  type: 'job_completed' | 'job_needs_user' | 'job_failed';
  title: string;
  body?: string | null;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[jobsApi] Supabase not available');
    return;
  }
  
  const { userId, jobId, type, title, body = null } = params;
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      job_id: jobId,
      type,
      title,
      body,
    });
  
  if (error) {
    // Handle missing table gracefully (404/PGRST116)
    if (error.code === 'PGRST116' || 
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        (error.message?.includes('relation') && error.message?.includes('does not exist'))) {
      console.debug('[jobsApi] Notifications table does not exist - feature disabled');
      return;
    }
    console.error('[jobsApi] Error creating notification:', error);
  }
}



