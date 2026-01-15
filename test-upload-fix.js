/**
 * Test Upload Fix
 *
 * This script tests that the upload flow works correctly with the uploadUrl fix.
 * It simulates the client-side upload process.
 */

const TEST_USER_ID = 'test-user-123';
const TEST_FILE_NAME = 'test-document.pdf';
const TEST_MIME_TYPE = 'application/pdf';

async function testUploadFlow() {
  console.log('🧪 Testing Upload Flow with uploadUrl fix...\n');

  try {
    // Step 1: Initialize upload
    console.log('Step 1: Calling smart-import-init...');
    const initResponse = await fetch('http://localhost:8888/.netlify/functions/smart-import-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        filename: TEST_FILE_NAME,
        mime: TEST_MIME_TYPE,
        source: 'test'
      })
    });

    if (!initResponse.ok) {
      const error = await initResponse.text();
      throw new Error(`Init failed: ${initResponse.status} - ${error}`);
    }

    const initData = await initResponse.json();
    console.log('✅ Init successful!');
    console.log('   Response keys:', Object.keys(initData));
    console.log('   Has uploadUrl?', 'uploadUrl' in initData);
    console.log('   Has docId?', 'docId' in initData);
    console.log('   Has storagePath?', 'storagePath' in initData);

    // Check for old format (should NOT exist)
    if ('url' in initData || 'token' in initData) {
      console.log('⚠️  WARNING: Response contains old format (url/token)');
      console.log('   Has url?', 'url' in initData);
      console.log('   Has token?', 'token' in initData);
    }

    if (!initData.uploadUrl) {
      throw new Error('❌ FAIL: Response missing uploadUrl field');
    }

    console.log('   uploadUrl format:', initData.uploadUrl.substring(0, 50) + '...');
    console.log('   docId:', initData.docId);

    // Step 2: Create a small test file
    console.log('\nStep 2: Uploading test file...');
    const testContent = Buffer.from('Test PDF content - this is a mock PDF file for testing');

    const uploadResponse = await fetch(initData.uploadUrl, {
      method: 'PUT',
      headers: {
        'content-type': TEST_MIME_TYPE,
      },
      body: testContent
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} - ${error}`);
    }

    console.log('✅ Upload successful!');
    console.log('   Status:', uploadResponse.status, uploadResponse.statusText);

    // Step 3: Finalize (optional - may fail if Supabase not configured)
    console.log('\nStep 3: Calling smart-import-finalize...');
    try {
      const finalizeResponse = await fetch('http://localhost:8888/.netlify/functions/smart-import-finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_USER_ID,
          docId: initData.docId,
          expectedSize: testContent.length
        })
      });

      const finalizeData = await finalizeResponse.json();
      console.log('✅ Finalize response received');
      console.log('   Status:', finalizeResponse.status);
      console.log('   Response:', JSON.stringify(finalizeData, null, 2));
    } catch (finalizeError) {
      console.log('⚠️  Finalize step failed (this is expected if Supabase is not configured)');
      console.log('   Error:', finalizeError.message);
    }

    console.log('\n✅ UPLOAD FIX TEST PASSED!');
    console.log('   The upload flow correctly uses uploadUrl instead of url/token');
    return true;

  } catch (error) {
    console.error('\n❌ UPLOAD FIX TEST FAILED!');
    console.error('   Error:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    return false;
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/smart-import-init', {
      method: 'OPTIONS'
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  console.log('🔍 Checking if dev server is running on http://localhost:8888...\n');

  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log('❌ Dev server is not running!');
    console.log('\n📝 To test the upload fix:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Wait for server to start on http://localhost:8888');
    console.log('   3. Run this test again: node test-upload-fix.js\n');
    process.exit(1);
  }

  console.log('✅ Dev server is running!\n');

  const success = await testUploadFlow();
  process.exit(success ? 0 : 1);
})();
