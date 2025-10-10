/**
 * Byte Chat Test Page
 * ====================
 * Test page for Byte integration with centralized chat runtime
 * Includes PII redaction demonstration
 */

import React, { useState } from 'react';
import ByteChatCentralized from '../components/chat/ByteChatCentralized';

export default function ByteChatTest() {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [testResults, setTestResults] = useState<string[]>([]);

  // Test prompts for PII redaction
  const testPrompts = [
    {
      id: 1,
      label: 'Credit Card Test',
      prompt: 'My VISA is 4111 1111 1111 1111',
      expected: 'Should mask as {{CARD_1111}}',
    },
    {
      id: 2,
      label: 'SIN Test',
      prompt: 'SIN 123-456-789',
      expected: 'Should mask as {{SSN}}',
    },
    {
      id: 3,
      label: 'Phone Test',
      prompt: 'Call me at (780) 707-5554',
      expected: 'Should mask as {{PHONE}}',
    },
    {
      id: 4,
      label: 'Email Test',
      prompt: 'Email: darrell.warner@gfs.com',
      expected: 'Should mask as {{EMAIL_d***@gfs.com}}',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📄 Byte Chat - Centralized Runtime Test
          </h1>
          <p className="text-gray-600">
            Test the new centralized chat runtime with PII redaction
          </p>
        </div>

        {/* Test Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* PII Test Prompts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>🔒</span> PII Redaction Test Prompts
            </h2>
            <div className="space-y-3">
              {testPrompts.map((test) => (
                <div
                  key={test.id}
                  className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{test.label}</span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      Test {test.id}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1 font-mono bg-gray-50 p-2 rounded">
                    "{test.prompt}"
                  </p>
                  <p className="text-xs text-green-600">{test.expected}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What to Test */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>🧪</span> Test Scenarios
            </h2>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-medium text-gray-900 mb-1">1. Memory Test</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Send: "Remember my export preference is CSV."
                </p>
                <p className="text-xs text-gray-500">
                  ✓ Should save to user_memory_facts table
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-medium text-gray-900 mb-1">2. Recall Test</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Send: "What's my export preference?"
                </p>
                <p className="text-xs text-gray-500">
                  ✓ Should recall from user_memory_facts
                </p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-medium text-gray-900 mb-1">3. RAG Test</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Send: "Summarize my October expenses from uploaded receipts."
                </p>
                <p className="text-xs text-gray-500">
                  ✓ Should use vector search to find relevant documents
                </p>
              </div>

              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="font-medium text-gray-900 mb-1">4. PII Redaction</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Use test prompts from left panel
                </p>
                <p className="text-xs text-gray-500">
                  ✓ Check database for masked values
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Database Verification Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            📊 Verify in Database
          </h2>
          <div className="space-y-2 text-sm text-blue-800">
            <p className="font-medium">After sending PII test messages, run in Supabase SQL Editor:</p>
            <pre className="bg-white p-3 rounded border border-blue-200 overflow-x-auto text-xs">
{`-- Check redacted content
SELECT 
  id,
  role,
  content,
  redacted_content,
  created_at
FROM chat_messages
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;

-- Verify no PII in redacted_content
SELECT 
  id,
  redacted_content,
  CASE 
    WHEN redacted_content ~ '\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}' THEN '❌ CARD FOUND'
    WHEN redacted_content ~ '\\d{3}-\\d{2}-\\d{4}' THEN '❌ SSN FOUND'
    WHEN redacted_content ~ '\\d{3}[\\)-]?\\s?\\d{3}[\\s-]?\\d{4}' THEN '❌ PHONE FOUND'
    WHEN redacted_content ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}' THEN '❌ EMAIL FOUND'
    ELSE '✅ NO PII'
  END as pii_check
FROM chat_messages
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;`}
            </pre>
          </div>
        </div>

        {/* Open Chat Button */}
        <div className="flex justify-center">
          <button
            onClick={() => setIsChatOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all flex items-center space-x-2 shadow-lg"
          >
            <FileText className="w-5 h-5" />
            <span>Open Byte Chat</span>
          </button>
        </div>
      </div>

      {/* Byte Chat Modal */}
      <ByteChatCentralized
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}

