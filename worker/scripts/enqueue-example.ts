import { QueueManager } from '../src/queue.js';
import { config } from '../src/config.js';

// Example script to enqueue a test job
async function enqueueTestJob() {
  try {
    console.log('Enqueueing test job...');
    
    const jobData = {
      userId: '00000000-0000-0000-0000-000000000000', // Test user ID
      fileUrl: 'https://example.com/sample-bank-statement.pdf',
      docType: 'bank_statement' as const,
      redact: true,
    };
    
    const jobId = await QueueManager.addJob(jobData);
    
    console.log(`Job enqueued successfully! Job ID: ${jobId}`);
    
    // Check job status
    const status = await QueueManager.getJobStatus(jobId);
    console.log('Job status:', status);
    
    // Get queue statistics
    const stats = await QueueManager.getQueueStats();
    console.log('Queue statistics:', stats);
    
  } catch (error) {
    console.error('Failed to enqueue job:', error);
    process.exit(1);
  }
}

// Run the script
enqueueTestJob();


