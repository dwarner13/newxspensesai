/**
 * EXAMPLE USAGE: How to integrate the AI Employee Orchestration System
 * This shows how to use the orchestrator without breaking existing code
 */

import { FinancialNarrativeOrchestrator } from './index';

// Example: How to use the orchestrator in your upload flow
export async function useOrchestratorForUpload(files: File[]) {
  try {
    // Create orchestrator instance
    const orchestrator = new FinancialNarrativeOrchestrator();
    
    // Run the full pipeline
    const result = await orchestrator.orchestrateFullPipeline(files);
    
    // Check if orchestration was successful
    if (result.error) {
      console.warn('Orchestration failed, falling back to basic processing:', result.message);
      return null; // Fall back to your existing upload system
    }
    
    // Success! You now have:
    console.log('🎉 Orchestration Complete!');
    console.log('📊 Executive Summary:', result.executiveSummary);
    console.log('📝 Narrative Length:', result.narrative.length, 'words');
    console.log('🎙️ Podcasts Generated:', result.podcasts.length);
    console.log('⏱️ Processing Time:', result.processingTime, 'ms');
    
    return result;
    
  } catch (error) {
    console.error('Orchestrator error:', error);
    return null; // Fall back to existing system
  }
}

// Example: How to integrate into your existing UploadPage
export function addOrchestratorToUploadPage() {
  // In your UploadPage.tsx, you could add this:
  /*
  
  import { useOrchestratorForUpload } from '../orchestrator/example-usage';
  
  const handleFileUpload = async (files: File[]) => {
    // Try orchestrator first
    const orchestrationResult = await useOrchestratorForUpload(files);
    
    if (orchestrationResult) {
      // Use the rich orchestration results
      setCurrentStep('orchestration-complete');
      setOrchestrationResult(orchestrationResult);
      return;
    }
    
    // Fall back to existing upload logic
    // ... your existing upload code here
  };
  
  */
}

// Example: How to display orchestration results
export function displayOrchestrationResults(result: any) {
  return {
    // Show executive summary
    executiveSummary: result.executiveSummary,
    
    // Show the narrative
    narrative: result.narrative,
    
    // Show podcasts
    podcasts: result.podcasts.map((podcast: any) => ({
      title: podcast.title,
      host: podcast.host,
      duration: podcast.duration,
      content: podcast.content
    })),
    
    // Show processing stats
    stats: {
      processingTime: result.processingTime,
      documentsProcessed: result.executiveSummary.keyMetrics.documentsProcessed,
      moneysSaved: result.executiveSummary.keyMetrics.moneysSaved
    }
  };
}
