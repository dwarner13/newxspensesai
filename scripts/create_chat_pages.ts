#!/usr/bin/env tsx

/**
 * Create Missing Chat Pages
 * 
 * Auto-generates chat pages for employees that don't have them.
 */

import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

const EMPLOYEE_MAP: Record<string, { title: string; override: string; route: string }> = {
  prime: { title: 'Prime', override: 'prime', route: '/prime' },
  tag: { title: 'Tag', override: 'tag', route: '/smart-categories' },
  byte: { title: 'Byte', override: 'byte', route: '/smart-import' },
  crystal: { title: 'Crystal', override: 'crystal', route: '/predict' },
  goalie: { title: 'Goalie', override: 'goalie', route: '/goals' },
  automa: { title: 'Automation', override: 'automa', route: '/automation' },
  blitz: { title: 'Debt', override: 'blitz', route: '/debt' },
  liberty: { title: 'Liberty', override: 'liberty', route: '/freedom' },
  chime: { title: 'Chime', override: 'chime', route: '/bills' },
  roundtable: { title: 'Podcast', override: 'roundtable', route: '/podcast' },
  serenity: { title: 'Therapist', override: 'serenity', route: '/therapist' },
  harmony: { title: 'Wellness', override: 'harmony', route: '/wellness' },
  wave: { title: 'Spotify', override: 'wave', route: '/spotify' },
  ledger: { title: 'Tax', override: 'ledger', route: '/tax' },
  intelia: { title: 'BI', override: 'intelia', route: '/bi' },
  dash: { title: 'Analytics', override: 'dash', route: '/analytics' },
  custodian: { title: 'Settings', override: 'custodian', route: '/settings' }
};

function generateChatPage(employee: string, config: { title: string; override: string }) {
  const name = config.title.replace(/\s+/g, '') + 'Chat';
  const component = `
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { usePrimeChat } from "../../hooks/usePrimeChat";
import HeaderStrip from "../../components/HeaderStrip";

/**
 * ${config.title} Chat Page
 * 
 * Grade 4 explanation: This page lets you chat with ${config.title}, 
 * one of the AI employees. The chat sends your messages to the server,
 * and ${config.title} responds with helpful information.
 */
export default function ${name}() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  
  // Grade 4 explanation: usePrimeChat hook connects to the chat server
  // and manages messages. We pass '${config.override}' to tell it which employee to use.
  const { messages, send, headers } = usePrimeChat(
    user?.id || 'anonymous',
    undefined,
    '${config.override}' as any
  );

  // Grade 4 explanation: Check localStorage for any payload from other pages
  // (like when Byte gets data from Smart Import page)
  useEffect(() => {
    const payload = localStorage.getItem('${config.override}:payload');
    if (payload) {
      try {
        const data = JSON.parse(payload);
        // Send payload as first message if present
        if (data && typeof data === 'object') {
          send(JSON.stringify(data));
          localStorage.removeItem('${config.override}:payload');
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Grade 4 explanation: When form is submitted, send the message
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    send(input);
    setInput("");
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">${config.title}</h1>
      
      {/* Grade 4 explanation: HeaderStrip shows headers from the server response */}
      <HeaderStrip headers={headers} />
      
      {/* Show if session summary was applied */}
      {headers?.["X-Session-Summary"] && (
        <div className="mb-2 text-xs px-2 py-1 rounded bg-yellow-50 border border-yellow-200">
          Context-Summary (recent) applied
        </div>
      )}

      {/* Grade 4 explanation: Show all messages in a list */}
      <div className="my-3 space-y-2 min-h-[400px]">
        {messages?.map?.((m: any, i: number) => (
          <div 
            key={i} 
            className={\`text-sm p-3 rounded \${m.role === 'user' ? 'bg-blue-50 ml-auto max-w-[80%]' : 'bg-gray-50 max-w-[80%]'}\`}
          >
            <b className="text-xs text-gray-500">{m.role}:</b>
            <div className="mt-1 whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
      </div>

      {/* Grade 4 explanation: Input form to type and send messages */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
        />
        <button 
          className="px-3 py-2 rounded bg-black text-white" 
          type="submit"
        >
          Send
        </button>
      </form>
    </div>
  );
}
`;

  const pagePath = join(root, 'src', 'pages', 'chat', `${name}.tsx`);
  
  // Only create if doesn't exist
  if (!existsSync(pagePath)) {
    writeFileSync(pagePath, component);
    console.log(`[Create] Created ${pagePath}`);
    return true;
  } else {
    console.log(`[Create] Skipped ${pagePath} (already exists)`);
    return false;
  }
}

// Employees that already have pages (from audit)
const EXISTING_PAGES = new Set([
  'prime',  // PrimeChatSimple.tsx
  'tag',    // Uses AICategorizationPage
  'byte',   // ByteChatTest.tsx
  'crystal' // Uses SpendingPredictionsPage
]);

function main() {
  console.log('[Create] Creating missing chat pages...');
  
  const pagesDir = join(root, 'src', 'pages', 'chat');
  if (!existsSync(pagesDir)) {
    const { mkdirSync } = require('fs');
    mkdirSync(pagesDir, { recursive: true });
  }
  
  let created = 0;
  for (const [employee, config] of Object.entries(EMPLOYEE_MAP)) {
    if (!EXISTING_PAGES.has(employee)) {
      if (generateChatPage(employee, config)) {
        created++;
      }
    }
  }
  
  console.log(`[Create] ✅ Created ${created} chat pages`);
}

main();







