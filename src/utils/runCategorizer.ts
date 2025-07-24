import { categorizeUncategorizedTransactions } from '../agents/agents/categorizerAgent';

/**
 * Example usage of the categorizer agent
 * This can be called from:
 * - After file upload completion
 * - From an admin panel button
 * - As a scheduled job
 * - From the browser console for testing
 */

// Run categorization for current user
export async function runCategorizer() {
  console.log('Starting transaction categorization...');
  
  try {
    const result = await categorizeUncategorizedTransactions();
    
    console.log('Categorization results:', result);
    
    if (result.categorized > 0) {
      console.log(`Successfully categorized ${result.categorized} transactions!`);
    } else {
      console.log('No transactions were categorized.');
    }
    
    if (result.errors > 0) {
      console.warn(`Encountered ${result.errors} errors during categorization.`);
    }
    
    return result;
  } catch (error) {
    console.error('Failed to run categorizer:', error);
    throw error;
  }
}

// Run categorization for a specific user (admin use)
export async function runCategorizerForUser(userId: string) {
  console.log(`Starting transaction categorization for user: ${userId}`);
  
  try {
    const result = await categorizeUncategorizedTransactions(userId);
    
    console.log('Categorization results:', result);
    
    return result;
  } catch (error) {
    console.error('Failed to run categorizer:', error);
    throw error;
  }
}

// Expose to window for easy testing in browser console
if (typeof window !== 'undefined') {
  (window as any).runCategorizer = runCategorizer;
  (window as any).runCategorizerForUser = runCategorizerForUser;
  console.log('💡 Categorizer agent available! Run window.runCategorizer() in console to test.');
} 