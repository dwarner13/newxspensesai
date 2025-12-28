/**
 * Ultra Simple Test Page with Chat V2
 * =====================
 * Minimal page to test if React routing works and chat-v2 endpoint
 */

import React, { useState, useRef, useEffect } from 'react';
import { sendChatV2 } from '../lib/api/chat';
import { fetchHistory, type HistoryMessage } from '../lib/api/history';
import { fetchSummary } from '../lib/api/summary';

type AgentChoice = 'Auto' | 'Prime' | 'Tag' | 'Crystal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
  created_at?: string;
}

/**
 * Get agent badge emoji
 */
function getAgentBadge(agent?: string): string {
  if (!agent) return '';
  const agentLower = agent.toLowerCase();
  if (agentLower.includes('prime')) return '👑';
  if (agentLower.includes('tag')) return '🏷️';
  if (agentLower.includes('crystal')) return '🔍';
  return '';
}

export default function SimpleTest() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentChoice>('Auto');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [convoId] = useState(() => {
    const stored = localStorage.getItem('chatV2_convoId');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('chatV2_convoId', newId);
    return newId;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load history and summary on mount
  useEffect(() => {
    loadHistory();
    loadSummary();
  }, [convoId]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await fetchHistory(convoId);
      // Transform history messages to Message format
      const historyMessages: Message[] = history.messages.map((msg: HistoryMessage) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        agent: msg.agent,
        created_at: msg.created_at
      }));
      setMessages(historyMessages);
    } catch (error: any) {
      console.error('Failed to load history:', error);
      // Don't show error to user, just start with empty messages
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const summaryData = await fetchSummary(convoId);
      setSummary(summaryData.summary || '');
    } catch (error: any) {
      console.error('Failed to load summary:', error);
      setSummary('');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleSend = async (messageToSend?: string) => {
    const message = messageToSend || inputMessage;
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: message
    };

    setMessages(prev => [...prev, userMessage]);
    setLastUserMessage(message); // Store for retry
    if (!messageToSend) {
      setInputMessage('');
    }
    setIsLoading(true);

    try {
      const response = await sendChatV2({
        message,
        convoId,
        preferredAgent: selectedAgent === 'Auto' ? null : selectedAgent
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.reply,
        agent: response.agent
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Reload history and summary after sending
      await Promise.all([loadHistory(), loadSummary()]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to send message'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastUserMessage) {
      handleSend(lastUserMessage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto', display: 'flex', gap: '20px' }}>
      {/* Main Chat Area */}
      <div style={{ flex: 1 }}>
        <h1>🎉 Chat V2 Test</h1>
        
        {/* Agent Selection Dropdown */}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="agent-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>
            Agent:
          </label>
          <select
            id="agent-select"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value as AgentChoice)}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: 'white'
            }}
          >
            <option value="Auto">Auto</option>
            <option value="Prime">Prime</option>
            <option value="Tag">Tag</option>
            <option value="Crystal">Crystal</option>
          </select>
        </div>

      {/* Messages Display */}
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        minHeight: '300px',
        maxHeight: '500px',
        overflowY: 'auto',
        backgroundColor: '#f9f9f9',
        marginBottom: '20px'
      }}>
        {isLoadingHistory ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Loading conversation history...</p>
        ) : messages.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No messages yet. Start a conversation!</p>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: '15px',
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: msg.role === 'user' ? '#e3f2fd' : '#fff',
                borderLeft: `4px solid ${msg.role === 'user' ? '#2196f3' : '#4caf50'}`
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {msg.role === 'user' ? (
                  'You'
                ) : (
                  <>
                    {getAgentBadge(msg.agent)} {msg.agent || 'Unknown'}
                  </>
                )}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

        {/* Input Area */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              resize: 'vertical',
              minHeight: '60px',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputMessage.trim()}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: isLoading ? '#ccc' : '#2196f3',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
            {lastUserMessage && (
              <button
                onClick={handleRetry}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#666',
                  backgroundColor: isLoading ? '#f0f0f0' : '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                🔄 Retry
              </button>
            )}
          </div>
        </div>
      
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
          Conversation ID: {convoId}
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <a href="/" style={{ color: '#0066cc', textDecoration: 'underline' }}>
            ← Back to Home
          </a>
        </div>
      </div>

      {/* Summary Panel */}
      <div style={{ width: '250px', flexShrink: 0 }}>
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '15px',
          backgroundColor: '#f9f9f9',
          position: 'sticky',
          top: '20px'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
            Conversation Summary
          </h3>
          {isLoadingSummary ? (
            <p style={{ color: '#666', fontStyle: 'italic', fontSize: '12px' }}>Loading...</p>
          ) : summary ? (
            <p style={{ fontSize: '12px', lineHeight: '1.5', color: '#333', whiteSpace: 'pre-wrap' }}>
              {summary}
            </p>
          ) : (
            <p style={{ color: '#999', fontStyle: 'italic', fontSize: '12px' }}>
              No summary yet. Start a conversation!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
