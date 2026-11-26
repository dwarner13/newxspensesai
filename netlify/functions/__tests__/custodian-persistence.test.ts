/**
 * Universal conversation persistence (owner): the live Custodian endpoint (custodian-chat) uses the
 * shared conversation platform with the same contract as Tag — server-only history, ownership and
 * employee identity, claim-first retries, signed replies, honest persisted flag.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.resolve(__dirname, '../custodian-chat.ts'), 'utf8');

describe('custodian-chat persistence contract', () => {
  it('opens or resumes only the customer\'s own Custodian conversation', () => {
    expect(src).toMatch(/resolveEmployeeConversation\(db, \{\s*userId: auth\.userId, employeeSlug: 'custodian', requestedSessionId, newConversation: body\.newConversation === true,/);
  });
  it('ignores browser-sent history; model context is stored history only', () => {
    expect(src).not.toMatch(/history = \[\]|body\.history|boundChatHistory\(/);
    expect(src).toContain('...storedHistory,');
  });
  it('claims the turn before answering; duplicates return the stored reply; conflicts do not answer', () => {
    const claimAt = src.indexOf('claimConversationTurn(db,');
    const modelAt = src.indexOf('client.messages.create(');
    expect(claimAt).toBeGreaterThan(0);
    expect(claimAt).toBeLessThan(modelAt);
    expect(src).toMatch(/claim\.status === 'duplicate'[\s\S]{0,700}duplicate: true/);
    expect(src).toMatch(/claim\.status === 'conflict'[\s\S]{0,300}persisted: false/);
  });
  it('saves the reply through the platform and reports persisted honestly', () => {
    expect(src).toMatch(/completeConversationTurn\(db, \{[\s\S]{0,200}employeeSlug: 'custodian'/);
    expect(src).toContain("body: JSON.stringify({ reply, action, sessionId: conversationId, persisted }),");
    expect(src).not.toMatch(/from\('chat_messages'\)\.insert/);
  });
});
