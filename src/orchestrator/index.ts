/**
 * XSPENSESAI ORCHESTRATOR EXPORTS
 * Main entry point for the AI Employee Orchestration System
 */

export { default as FinancialNarrativeOrchestrator } from './orchestrator';
export { AI_EMPLOYEES, EMPLOYEE_PHASES, VALID_CATEGORIES, type EmployeeOutput } from './aiEmployees';
export { PODCAST_TEAM, PODCAST_PROMPTS, generatePodcastTitle, estimatePodcastDuration, type PodcastEpisode } from './podcastTeam';
export { MASTER_SYSTEM_PROMPT } from './orchestrator';
export type { OrchestrationResult } from './orchestrator';

// Re-export for easy importing
export * from './orchestrator';
export * from './aiEmployees';
export * from './podcastTeam';
