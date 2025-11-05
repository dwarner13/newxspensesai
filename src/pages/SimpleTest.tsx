/**
 * Ultra Simple Test Page with Chat V2
 * =====================
 * Minimal page to test if React routing works and chat-v2 endpoint
 */

import React, { useState, useRef, useEffect } from 'react';
import { sendChatV2 } from '../lib/api/chat';

type AgentChoice = 'Auto' | 'Prime' | 'Tag' | 'Crystal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
}

export default function SimpleTest() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentChoice>('Auto');
  const [isLoading, setIsLoading] = useState(false);
  const [convoId] = useState(() => {
    const stored = localStorage.getItem('chatV2_convoId');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('chatV2_convoId', newId);
    return newId;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await sendChatV2({
        message: currentInput,
        convoId,
        preferredAgent: selectedAgent === 'Auto' ? null : selectedAgent
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.reply,
        agent: response.agent
      };

      setMessages(prev => [...prev, assistantMessage]);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
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
        {messages.length === 0 ? (
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
              <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                {msg.role === 'user' ? 'You' : `(${msg.agent || 'Unknown'}) Reply`}
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
      <div style={{ display: 'flex', gap: '10px' }}>
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
        <button
          onClick={handleSend}
          disabled={isLoading || !inputMessage.trim()}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: isLoading ? '#ccc' : '#2196f3',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
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
  );
}
