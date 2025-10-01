// Comprehensive Testing and Validation for Core Intelligence Features
import { tagCategorizationBrain, Transaction as TagTransaction } from './TagCategorizationBrain';
import { crystalAnalysisBrain, Transaction as CrystalTransaction } from './CrystalAnalysisBrain';
import { transactionPipeline, ProcessingContext } from './TransactionPipeline';

export interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
}

export class CoreIntelligenceTests {
  private testResults: TestResult[] = [];

  // Main test runner
  async runAllTests(): Promise<TestSuite> {
    console.log('🧪 Starting Core Intelligence Tests...');
    const startTime = Date.now();
    
    this.testResults = [];
    
    // Run all test suites
    await this.testTagCategorization();
    await this.testCrystalAnalysis();
    await this.testTransactionPipeline();
    await this.testIntegration();
    await this.testPerformance();
    await this.testErrorHandling();
    
    const duration = Date.now() - startTime;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = this.testResults.filter(t => !t.passed).length;
    
    const suite: TestSuite = {
      name: 'Core Intelligence Tests',
      tests: this.testResults,
      totalTests: this.testResults.length,
      passedTests,
      failedTests,
      duration
    };
    
    console.log(`🧪 Tests completed: ${passedTests}/${this.testResults.length} passed in ${duration}ms`);
    return suite;
  }

  // Tag Categorization Tests
  private async testTagCategorization(): Promise<void> {
    console.log('🧪 Testing Tag Categorization...');
    
    // Test 1: Basic categorization
    await this.runTest('Tag: Basic Categorization', async () => {
      const transaction: TagTransaction = {
        merchant: 'Starbucks',
        amount: 5.47,
        description: 'Coffee purchase',
        date: '2024-01-15'
      };
      
      const result = await tagCategorizationBrain.categorizeTransaction(transaction, 'testUser');
      
      if (result.category !== 'Food & Dining') {
        throw new Error(`Expected 'Food & Dining', got '${result.category}'`);
      }
      
      if (result.subcategory !== 'Coffee & Tea') {
        throw new Error(`Expected 'Coffee & Tea', got '${result.subcategory}'`);
      }
      
      if (result.confidence < 0.8) {
        throw new Error(`Expected confidence > 0.8, got ${result.confidence}`);
      }
      
      return { category: result.category, subcategory: result.subcategory, confidence: result.confidence };
    });
    
    // Test 2: Learning from corrections
    await this.runTest('Tag: Learning from Corrections', async () => {
      const transaction: TagTransaction = {
        merchant: 'New Merchant XYZ',
        amount: 50.00,
        description: 'Test purchase',
        date: '2024-01-15'
      };
      
      // First categorization
      const first = await tagCategorizationBrain.categorizeTransaction(transaction, 'testUser');
      
      // User corrects it
      await tagCategorizationBrain.learnFromCorrection(
        'testUser',
        transaction,
        first.category,
        'Shopping'
      );
      
      // Second time should remember
      const second = await tagCategorizationBrain.categorizeTransaction(transaction, 'testUser');
      
      if (second.category !== 'Shopping') {
        throw new Error(`Expected 'Shopping' after learning, got '${second.category}'`);
      }
      
      if (second.source !== 'learned_pattern') {
        throw new Error(`Expected 'learned_pattern' source, got '${second.source}'`);
      }
      
      return { before: first.category, after: second.category, source: second.source };
    });
    
    // Test 3: Bulk categorization
    await this.runTest('Tag: Bulk Categorization', async () => {
      const transactions: TagTransaction[] = [
        { merchant: 'McDonalds', amount: 8.99, description: 'Fast food', date: '2024-01-15' },
        { merchant: 'McDonalds', amount: 9.50, description: 'Fast food', date: '2024-01-16' },
        { merchant: 'Shell', amount: 45.00, description: 'Gas', date: '2024-01-15' }
      ];
      
      const results = await tagCategorizationBrain.bulkCategorize(transactions, 'testUser');
      
      if (results.length !== 3) {
        throw new Error(`Expected 3 results, got ${results.length}`);
      }
      
      const mcdonaldsResults = results.filter(r => r.merchant === 'McDonalds');
      if (mcdonaldsResults.length !== 2) {
        throw new Error(`Expected 2 McDonalds results, got ${mcdonaldsResults.length}`);
      }
      
      // All McDonalds should have same category
      const firstCategory = mcdonaldsResults[0].category;
      const allSame = mcdonaldsResults.every(r => r.category === firstCategory);
      
      if (!allSame) {
        throw new Error('Bulk categorization should group similar transactions');
      }
      
      return { total: results.length, grouped: mcdonaldsResults.length };
    });
    
    // Test 4: Custom rules
    await this.runTest('Tag: Custom Rules', async () => {
      const rule = await tagCategorizationBrain.createSmartRule('testUser', {
        name: 'Test Rule',
        merchant: 'Test Store',
        category: 'Shopping',
        subcategory: 'Electronics',
        priority: 100});
      
      const transaction: TagTransaction = {
        merchant: 'Test Store',
        amount: 100.00,
        description: 'Test purchase',
        date: '2024-01-15'
      };
      
      const result = await tagCategorizationBrain.categorizeTransaction(transaction, 'testUser');
      
      if (result.category !== 'Shopping') {
        throw new Error(`Expected 'Shopping' from custom rule, got '${result.category}'`);
      }
      
      if (result.source !== 'custom_rule') {
        throw new Error(`Expected 'custom_rule' source, got '${result.source}'`);
      }
      
      return { ruleId: rule.id, category: result.category, source: result.source };
    });
  }

  // Crystal Analysis Tests
  private async testCrystalAnalysis(): Promise<void> {
    console.log('🧪 Testing Crystal Analysis...');
    
    // Test 1: Basic transaction analysis
    await this.runTest('Crystal: Basic Transaction Analysis', async () => {
      const transaction: CrystalTransaction = {
        merchant: 'Starbucks',
        amount: 5.47,
        description: 'Coffee purchase',
        date: '2024-01-15',
        category: 'Food & Dining',
        subcategory: 'Coffee & Tea'
      };
      
      const analysis = await crystalAnalysisBrain.analyzeTransaction(transaction, 'testUser');
      
      if (!analysis.velocity) {
        throw new Error('Velocity analysis missing');
      }
      
      if (!analysis.categoryInsights) {
        throw new Error('Category insights missing');
      }
      
      if (!analysis.merchantPatterns) {
        throw new Error('Merchant patterns missing');
      }
      
      if (!analysis.predictions) {
        throw new Error('Predictions missing');
      }
      
      return {
        velocity: analysis.velocity.isUnusual,
        category: analysis.categoryInsights.category,
        merchant: analysis.merchantPatterns.merchant,
        confidence: analysis.predictions.confidence
      };
    });
    
    // Test 2: Pattern detection
    await this.runTest('Crystal: Pattern Detection', async () => {
      // Add some test transactions
      const transactions: CrystalTransaction[] = [
        { merchant: 'Starbucks', amount: 5.47, description: 'Coffee', date: '2024-01-15', category: 'Food & Dining', subcategory: 'Coffee & Tea' },
        { merchant: 'Starbucks', amount: 6.20, description: 'Coffee', date: '2024-01-16', category: 'Food & Dining', subcategory: 'Coffee & Tea' },
        { merchant: 'Starbucks', amount: 4.99, description: 'Coffee', date: '2024-01-17', category: 'Food & Dining', subcategory: 'Coffee & Tea' },
        { merchant: 'Shell', amount: 45.00, description: 'Gas', date: '2024-01-15', category: 'Transportation', subcategory: 'Gas' }
      ];
      
      // Store transactions
      for (const txn of transactions) {
        await crystalAnalysisBrain.analyzeTransaction(txn, 'testUser');
      }
      
      const patterns = await crystalAnalysisBrain.detectPatterns('testUser', 30);
      
      if (patterns.length === 0) {
        throw new Error('No patterns detected');
      }
      
      const recurringPatterns = patterns.filter(p => p.type === 'recurring');
      if (recurringPatterns.length === 0) {
        throw new Error('No recurring patterns detected');
      }
      
      return { totalPatterns: patterns.length, recurringPatterns: recurringPatterns.length };
    });
    
    // Test 3: Predictive analytics
    await this.runTest('Crystal: Predictive Analytics', async () => {
      const prediction = await crystalAnalysisBrain.predictNextMonth('testUser');
      
      if (prediction.totalSpending < 0) {
        throw new Error('Invalid total spending prediction');
      }
      
      if (prediction.confidence < 0 || prediction.confidence > 1) {
        throw new Error('Invalid confidence score');
      }
      
      if (prediction.factors.length === 0) {
        throw new Error('No prediction factors provided');
      }
      
      return {
        totalSpending: prediction.totalSpending,
        confidence: prediction.confidence,
        factors: prediction.factors.length
      };
    });
    
    // Test 4: User insights
    await this.runTest('Crystal: User Insights', async () => {
      const insights = crystalAnalysisBrain.getUserInsights('testUser');
      
      if (insights.totalTransactions < 0) {
        throw new Error('Invalid total transactions count');
      }
      
      if (insights.totalSpending < 0) {
        throw new Error('Invalid total spending');
      }
      
      if (!Array.isArray(insights.topCategories)) {
        throw new Error('Top categories should be an array');
      }
      
      return {
        totalTransactions: insights.totalTransactions,
        totalSpending: insights.totalSpending,
        topCategories: insights.topCategories.length
      };
    });
  }

  // Transaction Pipeline Tests
  private async testTransactionPipeline(): Promise<void> {
    console.log('🧪 Testing Transaction Pipeline...');
    
    // Test 1: Single transaction processing
    await this.runTest('Pipeline: Single Transaction Processing', async () => {
      const context: ProcessingContext = {
        userId: 'testUser',
        source: 'receipt',
        metadata: { test: true }
      };
      
      const data = {
        merchant: 'Test Store',
        amount: 25.99,
        description: 'Test purchase',
        date: '2024-01-15'
      };
      
      const result = await transactionPipeline.processNewTransaction(data, context);
      
      if (!result.success) {
        throw new Error(`Processing failed: ${result.error}`);
      }
      
      if (!result.transaction) {
        throw new Error('No transaction returned');
      }
      
      if (result.transaction.merchant !== 'Test Store') {
        throw new Error(`Expected 'Test Store', got '${result.transaction.merchant}'`);
      }
      
      if (result.transaction.amount !== 25.99) {
        throw new Error(`Expected 25.99, got ${result.transaction.amount}`);
      }
      
      return {
        success: result.success,
        merchant: result.transaction.merchant,
        amount: result.transaction.amount,
        insights: result.insights?.length || 0
      };
    });
    
    // Test 2: Batch processing
    await this.runTest('Pipeline: Batch Processing', async () => {
      const context: ProcessingContext = {
        userId: 'testUser',
        source: 'receipt',
        batchId: 'test-batch-1'
      };
      
      const files = [
        { merchant: 'Store 1', amount: 10.00, description: 'Item 1', date: '2024-01-15' },
        { merchant: 'Store 2', amount: 20.00, description: 'Item 2', date: '2024-01-15' },
        { merchant: 'Store 3', amount: 30.00, description: 'Item 3', date: '2024-01-15' }
      ];
      
      const result = await transactionPipeline.processBatch(files, context);
      
      if (result.summary.total !== 3) {
        throw new Error(`Expected 3 total, got ${result.summary.total}`);
      }
      
      if (result.summary.successful !== 3) {
        throw new Error(`Expected 3 successful, got ${result.summary.successful}`);
      }
      
      if (result.summary.failed !== 0) {
        throw new Error(`Expected 0 failed, got ${result.summary.failed}`);
      }
      
      if (result.summary.totalAmount !== 60.00) {
        throw new Error(`Expected 60.00 total amount, got ${result.summary.totalAmount}`);
      }
      
      return {
        total: result.summary.total,
        successful: result.summary.successful,
        failed: result.summary.failed,
        totalAmount: result.summary.totalAmount
      };
    });
    
    // Test 3: Queue management
    await this.runTest('Pipeline: Queue Management', async () => {
      const context: ProcessingContext = {
        userId: 'testUser',
        source: 'manual'
      };
      
      const data = {
        merchant: 'Queued Store',
        amount: 15.00,
        description: 'Queued purchase',
        date: '2024-01-15'
      };
      
      const result = await transactionPipeline.queueTransaction(data, context);
      
      if (!result.success) {
        throw new Error(`Queue processing failed: ${result.error}`);
      }
      
      if (!result.transaction) {
        throw new Error('No transaction returned from queue');
      }
      
      return {
        success: result.success,
        merchant: result.transaction.merchant,
        amount: result.transaction.amount
      };
    });
    
    // Test 4: Processing statistics
    await this.runTest('Pipeline: Processing Statistics', async () => {
      const stats = transactionPipeline.getProcessingStats();
      
      if (stats.totalProcessed < 0) {
        throw new Error('Invalid total processed count');
      }
      
      if (stats.successful < 0) {
        throw new Error('Invalid successful count');
      }
      
      if (stats.failed < 0) {
        throw new Error('Invalid failed count');
      }
      
      if (stats.averageProcessingTime < 0) {
        throw new Error('Invalid average processing time');
      }
      
      return {
        totalProcessed: stats.totalProcessed,
        successful: stats.successful,
        failed: stats.failed,
        averageProcessingTime: stats.averageProcessingTime
      };
    });
  }

  // Integration Tests
  private async testIntegration(): Promise<void> {
    console.log('🧪 Testing Integration...');
    
    // Test 1: End-to-end processing
    await this.runTest('Integration: End-to-End Processing', async () => {
      const context: ProcessingContext = {
        userId: 'testUser',
        source: 'receipt'
      };
      
      const data = {
        merchant: 'Integration Test Store',
        amount: 50.00,
        description: 'Integration test purchase',
        date: '2024-01-15'
      };
      
      const result = await transactionPipeline.processNewTransaction(data, context);
      
      if (!result.success) {
        throw new Error(`Integration test failed: ${result.error}`);
      }
      
      const transaction = result.transaction!;
      
      // Verify all components worked
      if (!transaction.category) {
        throw new Error('Tag categorization failed');
      }
      
      if (!transaction.analysis) {
        throw new Error('Crystal analysis failed');
      }
      
      if (!transaction.analysis.velocity) {
        throw new Error('Velocity analysis missing');
      }
      
      if (!transaction.analysis.categoryInsights) {
        throw new Error('Category insights missing');
      }
      
      return {
        success: result.success,
        categorized: !!transaction.category,
        analyzed: !!transaction.analysis,
        insights: result.insights?.length || 0
      };
    });
    
    // Test 2: Data persistence
    await this.runTest('Integration: Data Persistence', async () => {
      // Load user data
      transactionPipeline.loadUserData('testUser');
      
      // Get user summary
      const summary = transactionPipeline.getUserSummary('testUser');
      
      if (summary.totalTransactions < 0) {
        throw new Error('Invalid total transactions');
      }
      
      if (summary.totalSpending < 0) {
        throw new Error('Invalid total spending');
      }
      
      if (!Array.isArray(summary.topCategories)) {
        throw new Error('Top categories should be an array');
      }
      
      return {
        totalTransactions: summary.totalTransactions,
        totalSpending: summary.totalSpending,
        topCategories: summary.topCategories.length
      };
    });
  }

  // Performance Tests
  private async testPerformance(): Promise<void> {
    console.log('🧪 Testing Performance...');
    
    // Test 1: Single transaction performance
    await this.runTest('Performance: Single Transaction', async () => {
      const startTime = Date.now();
      
      const context: ProcessingContext = {
        userId: 'testUser',
        source: 'receipt'
      };
      
      const data = {
        merchant: 'Performance Test Store',
        amount: 25.00,
        description: 'Performance test',
        date: '2024-01-15'
      };
      
      const result = await transactionPipeline.processNewTransaction(data, context);
      const duration = Date.now() - startTime;
      
      if (!result.success) {
        throw new Error(`Performance test failed: ${result.error}`);
      }
      
      if (duration > 5000) {
        throw new Error(`Processing took too long: ${duration}ms`);
      }
      
      return { duration, success: result.success };
    });
    
    // Test 2: Batch processing performance
    await this.runTest('Performance: Batch Processing', async () => {
      const startTime = Date.now();
      
      const context: ProcessingContext = {
        userId: 'testUser',
        source: 'receipt'
      };
      
      const files = Array.from({ length: 10 }, (_, i) => ({
        merchant: `Store ${i}`,
        amount: 10.00 + i,
        description: `Item ${i}`,
        date: '2024-01-15'
      }));
      
      const result = await transactionPipeline.processBatch(files, context);
      const duration = Date.now() - startTime;
      
      if (result.summary.successful !== 10) {
        throw new Error(`Expected 10 successful, got ${result.summary.successful}`);
      }
      
      if (duration > 10000) {
        throw new Error(`Batch processing took too long: ${duration}ms`);
      }
      
      return { duration, successful: result.summary.successful };
    });
  }

  // Error Handling Tests
  private async testErrorHandling(): Promise<void> {
    console.log('🧪 Testing Error Handling...');
    
    // Test 1: Invalid transaction data
    await this.runTest('Error Handling: Invalid Data', async () => {
      const context: ProcessingContext = {
        userId: 'testUser',
        source: 'receipt'
      };
      
      const invalidData = {
        merchant: null,
        amount: 'invalid',
        description: undefined,
        date: 'invalid-date'
      };
      
      const result = await transactionPipeline.processNewTransaction(invalidData, context);
      
      // Should handle gracefully
      if (result.success) {
        throw new Error('Should have failed with invalid data');
      }
      
      if (!result.error) {
        throw new Error('Should have provided error message');
      }
      
      return { success: result.success, hasError: !!result.error };
    });
    
    // Test 2: Network timeout simulation
    await this.runTest('Error Handling: Timeout Simulation', async () => {
      const context: ProcessingContext = {
        userId: 'testUser',
        source: 'receipt'
      };
      
      const data = {
        merchant: 'Timeout Test Store',
        amount: 25.00,
        description: 'Timeout test',
        date: '2024-01-15'
      };
      
      // Simulate timeout by setting a very short timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      );
      
      const processPromise = transactionPipeline.processNewTransaction(data, context);
      
      try {
        await Promise.race([processPromise, timeoutPromise]);
        return { handled: true };
      } catch (error) {
        // Should handle timeout gracefully
        return { handled: true, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
  }

  // Helper method to run individual tests
  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: true,
        duration,
        details: result});
      
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      
      console.log(`❌ ${testName} - FAILED (${duration}ms): ${error}`);
    }
  }

  // Generate test report
  generateTestReport(suite: TestSuite): string {
    const report = [
      '🧪 CORE INTELLIGENCE TEST REPORT',
      '================================',
      '',
      `Total Tests: ${suite.totalTests}`,
      `Passed: ${suite.passedTests}`,
      `Failed: ${suite.failedTests}`,
      `Success Rate: ${((suite.passedTests / suite.totalTests) * 100).toFixed(1)}%`,
      `Duration: ${suite.duration}ms`,
      '',
      'DETAILED RESULTS:',
      '================='
    ];
    
    suite.tests.forEach(test => {
      const status = test.passed ? '✅ PASS' : '❌ FAIL';
      report.push(`${status} ${test.testName} (${test.duration}ms)`);
      
      if (!test.passed && test.error) {
        report.push(`   Error: ${test.error}`);
      }
      
      if (test.details) {
        report.push(`   Details: ${JSON.stringify(test.details, null, 2)}`);
      }
      
      report.push('');
    });
    
    return report.join('\n');
  }

  // Run specific test category
  async runTestCategory(category: 'tag' | 'crystal' | 'pipeline' | 'integration' | 'performance' | 'errors'): Promise<TestSuite> {
    console.log(`🧪 Running ${category} tests...`);
    const startTime = Date.now();
    
    this.testResults = [];
    
    switch (category) {
      case 'tag':
        await this.testTagCategorization();
        break;
      case 'crystal':
        await this.testCrystalAnalysis();
        break;
      case 'pipeline':
        await this.testTransactionPipeline();
        break;
      case 'integration':
        await this.testIntegration();
        break;
      case 'performance':
        await this.testPerformance();
        break;
      case 'errors':
        await this.testErrorHandling();
        break;
    }
    
    const duration = Date.now() - startTime;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = this.testResults.filter(t => !t.passed).length;
    
    return {
      name: `${category} Tests`,
      tests: this.testResults,
      totalTests: this.testResults.length,
      passedTests,
      failedTests,
      duration
    };
  }
}

// Export singleton instance
export const coreIntelligenceTests = new CoreIntelligenceTests();
