import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Heart, 
  Brain, 
  Leaf, 
  Zap, 
  MessageCircle, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Target,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  RefreshCw,
  Download,
  Share2
} from 'lucide-react';

interface Therapist {
  id: string;
  name: string;
  style: string;
  description: string;
  specialties: string[];
  avatarClass: string;
  personality: string;
  emoji: string;
}

interface FinancialPattern {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  recommendation: string;
}

interface TherapySession {
  id: string;
  therapist: string;
  date: string;
  duration: number;
  insights: string[];
  mood: 'positive' | 'neutral' | 'negative';
  progress: number;
}

interface Insight {
  icon: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

const AIFinancialTherapist: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [isInSession, setIsInSession] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [conversation, setConversation] = useState<Array<{role: 'user' | 'therapist', message: string, timestamp: Date}>>([]);
  const [financialPatterns, setFinancialPatterns] = useState<FinancialPattern[]>([]);
  const [therapySessions, setTherapySessions] = useState<TherapySession[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPatterns, setShowPatterns] = useState(false);
  const [activeTherapist, setActiveTherapist] = useState<Therapist | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);

  const therapists: Therapist[] = [
    {
      id: 'sarah',
      name: 'Dr. Sarah',
      style: 'Empathetic & Nurturing',
      description: "Let's explore your feelings about money in a safe, judgment-free space",
      specialties: ['Anxiety', 'Guilt', 'Self-Worth'],
      avatarClass: 'empathetic',
      personality: 'empathetic',
      emoji: '💝'
    },
    {
      id: 'marcus',
      name: 'Dr. Marcus',
      style: 'Analytical & Strategic',
      description: "Let's break down the psychology behind your financial patterns",
      specialties: ['Behavior Analysis', 'Cognitive Patterns'],
      avatarClass: 'analytical',
      personality: 'analytical',
      emoji: '🧠'
    },
    {
      id: 'luna',
      name: 'Dr. Luna',
      style: 'Mindful & Zen',
      description: "Find peace and balance in your relationship with money",
      specialties: ['Mindfulness', 'Stress Relief', 'Balance'],
      avatarClass: 'mindful',
      personality: 'mindful',
      emoji: '🧘'
    },
    {
      id: 'alex',
      name: 'Dr. Alex',
      style: 'Motivational & Energetic',
      description: "Build confidence and crush your financial wellness goals",
      specialties: ['Confidence', 'Goal Achievement', 'Growth'],
      avatarClass: 'motivational',
      personality: 'motivational',
      emoji: '⚡'
    }
  ];

  const moods = [
    { id: 'stressed', emoji: '😰', text: 'Stressed', description: 'Feeling overwhelmed by financial decisions' },
    { id: 'guilty', emoji: '😔', text: 'Guilty', description: 'Regretting recent spending choices' },
    { id: 'anxious', emoji: '😟', text: 'Anxious', description: 'Worried about future financial security' },
    { id: 'confident', emoji: '😊', text: 'Confident', description: 'Feeling good about financial progress' },
    { id: 'confused', emoji: '🤔', text: 'Confused', description: 'Unsure about next financial steps' }
  ];

  const topics = [
    { id: 'stress-spending', icon: '🛒', title: 'Stress Spending', description: 'Understanding emotional triggers' },
    { id: 'money-anxiety', icon: '😰', title: 'Money Anxiety', description: 'Managing financial worries' },
    { id: 'budget-struggles', icon: '📊', title: 'Budget Struggles', description: 'Creating sustainable budgets' },
    { id: 'goal-achievement', icon: '🎯', title: 'Goal Achievement', description: 'Building momentum toward goals' },
    { id: 'self-worth', icon: '💎', title: 'Self-Worth', description: 'Separating value from money' },
    { id: 'family-finances', icon: '👨‍👩‍👧‍👦', title: 'Family Finances', description: 'Navigating shared money decisions' }
  ];

  useEffect(() => {
    // Load user's financial data and generate patterns
    generateFinancialPatterns();
    loadTherapySessions();
    generatePersonalizedInsights();
  }, []);

  const generateFinancialPatterns = () => {
    // Simulate analyzing user's financial data from localStorage
    const mockPatterns: FinancialPattern[] = [
      {
        type: 'Stress Spending',
        description: 'Increased spending on weekends and late nights',
        severity: 'medium',
        impact: 'May indicate emotional regulation through shopping',
        recommendation: 'Practice mindfulness before purchases'
      },
      {
        type: 'Impulse Purchases',
        description: 'Multiple small purchases under $50 within short timeframes',
        severity: 'high',
        impact: 'Accumulates to significant monthly expenses',
        recommendation: 'Implement 24-hour purchase delay rule'
      },
      {
        type: 'Budget Anxiety',
        description: 'Frequent account checking (5+ times daily)',
        severity: 'medium',
        impact: 'Creates stress and may lead to rash decisions',
        recommendation: 'Set specific check-in times, limit to 2x daily'
      },
      {
        type: 'Goal Achievement',
        description: 'Consistent progress toward savings goals',
        severity: 'low',
        impact: 'Positive financial behavior pattern',
        recommendation: 'Celebrate progress and maintain momentum'
      }
    ];
    setFinancialPatterns(mockPatterns);
  };

  const generatePersonalizedInsights = () => {
    // Mock insights for demonstration
    const mockInsights: Insight[] = [
      {
        icon: '📊',
        title: 'Weekend Spending Pattern',
        description: "You spend 40% more on weekends, suggesting emotional shopping. Let's explore healthier coping strategies.",
        priority: 'high'
      },
      {
        icon: '🕐',
        title: 'Late Night Transactions', 
        description: "3 recent purchases after 11PM detected. This often indicates stress or anxiety spending.",
        priority: 'medium'
      },
      {
        icon: '🎯',
        title: 'Goal Progress',
        description: "You're 67% toward your savings goal! Your confidence is growing - let's build on this momentum.",
        priority: 'low'
      }
    ];
    setInsights(mockInsights);
  };

  const loadTherapySessions = () => {
    // Load from localStorage or create mock data
    const mockSessions: TherapySession[] = [
      {
        id: '1',
        therapist: 'Dr. Sarah',
        date: '2024-01-15',
        duration: 45,
        insights: ['Identified stress spending triggers', 'Developed coping strategies'],
        mood: 'positive',
        progress: 75
      },
      {
        id: '2',
        therapist: 'Dr. Marcus',
        date: '2024-01-08',
        duration: 60,
        insights: ['Analyzed spending patterns', 'Created behavior modification plan'],
        mood: 'neutral',
        progress: 60
      }
    ];
    setTherapySessions(mockSessions);
  };

  const selectTherapist = (therapistId: string) => {
    setSelectedTherapist(therapistId);
    const therapist = therapists.find(t => t.id === therapistId);
    setActiveTherapist(therapist || null);
  };

  const startSession = (therapistId: string) => {
    setSelectedTherapist(therapistId);
    setIsInSession(true);
    
    const therapist = therapists.find(t => t.id === therapistId);
    if (therapist) {
      setActiveTherapist(therapist);
      const welcomeMessage = generateWelcomeMessage(therapist);
      setConversation([{
        role: 'therapist',
        message: welcomeMessage,
        timestamp: new Date()
      }]);
    }
  };

  const startTherapySession = (type: string, value: string) => {
    let message = '';
    
    switch(type) {
      case 'mood':
        message = `I'm feeling ${value} about money today.`;
        break;
      case 'topic':
        message = `I'd like to talk about ${value.replace('-', ' ')}.`;
        break;
      case 'insight':
        message = `I want to explore the insight about "${value}".`;
        break;
    }
    
    const userMessage = {
      role: 'user' as const,
      message: message,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);
    
    setTimeout(() => {
      const response = generateTherapistResponse(message, type);
      setConversation(prev => [...prev, {
        role: 'therapist',
        message: response,
        timestamp: new Date()
      }]);
    }, 1000);
  };

  const generateWelcomeMessage = (therapist: Therapist): string => {
    const patterns = financialPatterns.filter(p => p.severity === 'high' || p.severity === 'medium');
    
    switch (therapist.personality) {
      case 'empathetic':
        return `Hello, I'm ${therapist.name}. I can see you've been dealing with some challenging financial patterns lately. I want you to know that it's completely normal to feel overwhelmed by money sometimes. Let's talk about what's been happening and how you're feeling. What would you like to explore today?`;
      
      case 'analytical':
        return `Welcome, I'm ${therapist.name}. I've analyzed your financial data and identified ${patterns.length} key behavioral patterns that we should examine. I'm particularly interested in your stress spending patterns and impulse purchase frequency. Shall we dive into the psychology behind these behaviors?`;
      
      case 'mindful':
        return `Greetings, I'm ${therapist.name}. I sense some financial turbulence in your life right now. Let's take a moment to breathe and center ourselves. Money is just energy flowing through your life - it doesn't define your worth. What's weighing on your mind today?`;
      
      case 'motivational':
        return `Hey there! I'm ${therapist.name} and I'm excited to work with you! I can see you have some amazing financial strengths, and together we're going to turn those challenges into opportunities for growth. What's one financial goal you'd love to crush this month?`;
      
      default:
        return `Hello, I'm ${therapist.name}. How can I help you today?`;
    }
  };

  const sendMessage = () => {
    if (!currentMessage.trim()) return;

    const userMessage = {
      role: 'user' as const,
      message: currentMessage,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);
    setCurrentMessage('');
    
    // Simulate therapist response
    setTimeout(() => {
      const therapistResponse = generateTherapistResponse(currentMessage);
      setConversation(prev => [...prev, {
        role: 'therapist',
        message: therapistResponse,
        timestamp: new Date()
      }]);
    }, 1000);
  };

  const generateTherapistResponse = (userMessage: string, sessionType: string | null = null): string => {
    const therapist = therapists.find(t => t.id === selectedTherapist);
    if (!therapist) return "I'm here to help. Can you tell me more?";

    const lowerMessage = userMessage.toLowerCase();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
    
    // Contextual responses based on session type
    if (sessionType) {
      const responses: { [key: string]: string } = {
        stressed: "I hear that you're feeling stressed about money. That's completely understandable - financial stress affects most people. Let's take a moment to breathe together. Can you tell me what specifically is causing the most stress right now?",
        
        guilty: "Guilt around spending is so common, and I want you to know there's no judgment here. Often, guilt comes from our inner critic being too harsh. What recent purchase or financial decision is weighing on your mind?",
        
        'stress-spending': "Stress spending is a very human response to difficult emotions. When we're overwhelmed, shopping can feel like a quick way to feel better. Let's explore what emotions usually trigger this for you.",
        
        'money-anxiety': "Financial anxiety can feel overwhelming, but you're taking a brave step by addressing it. Anxiety often comes from uncertainty about the future. What aspects of your financial future worry you most?"
      };
      
      if (responses[sessionType]) {
        return responses[sessionType];
      }
    }
    
    // Greeting responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('hi there')) {
      return `Hi ${userName}! 💚 I'm your AI Financial Therapist. I'm here to help you work through any financial stress, anxiety, or emotional challenges you're facing with money. I provide a safe, judgment-free space to explore your relationship with finances. What's on your mind today?`;
    }
    
    // Pattern-based responses
    if (lowerMessage.includes('stress') || lowerMessage.includes('anxiety')) {
      return "I can see from your spending patterns that stress is a significant trigger. When you feel overwhelmed, your brain seeks immediate comfort through purchases. Let's explore healthier coping mechanisms together. What situations typically trigger your stress spending?";
    }
    
    if (lowerMessage.includes('impulse') || lowerMessage.includes('spend')) {
      return "Impulse spending is often a way to fill an emotional void or seek instant gratification. I notice you make several small purchases in quick succession. This suggests you might be looking for something beyond the items themselves. What do you think you're really seeking when you make these purchases?";
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('plan')) {
      return "Your frequent account checking shows you care about staying on track, but it can actually increase anxiety. Let's create a balanced approach - structured check-ins that give you control without the stress. What would feel like a healthy amount of financial awareness to you?";
    }
    
    if (lowerMessage.includes('goal') || lowerMessage.includes('save')) {
      return "I'm impressed by your progress toward your savings goals! This shows real commitment to your financial future. What's driving this positive change? Understanding your motivation can help us build on this success.";
    }
    
    // Default personality-based responses
    switch (therapist.personality) {
      case 'empathetic':
        return "I hear you, and I want you to know that your feelings are valid. Money can bring up deep emotions for all of us. Can you tell me more about what you're experiencing?";
      
      case 'analytical':
        return "That's an interesting observation. From a behavioral psychology perspective, this pattern suggests [analysis]. Let's examine the underlying triggers and develop a systematic approach to address them.";
      
      case 'mindful':
        return "Let's pause for a moment and observe what's happening. Notice your breath, your body sensations. Money is just one aspect of your life - it doesn't define your entire experience. What do you notice when you bring awareness to this situation?";
      
      case 'motivational':
        return "I love your energy! Every challenge is an opportunity to grow stronger and wiser. You've got this! Let's turn this into a victory. What's one small step you can take right now to move forward?";
      
      default:
        return `Hi ${userName}! Thank you for sharing that. How can I best support you right now?`;
    }
  };

  const endSession = () => {
    setIsInSession(false);
    setSelectedTherapist(null);
    setConversation([]);
    setActiveTherapist(null);
    
    // Save session summary
    if (selectedTherapist && conversation.length > 0) {
      const session: TherapySession = {
        id: Date.now().toString(),
        therapist: therapists.find(t => t.id === selectedTherapist)?.name || '',
        date: new Date().toISOString().split('T')[0],
        duration: Math.ceil(conversation.length * 2), // Rough estimate
        insights: extractInsights(conversation),
        mood: analyzeMood(conversation),
        progress: calculateProgress(conversation)
      };
      
      setTherapySessions(prev => [...prev, session]);
      toast.success('Session saved successfully!');
    }
  };

  const extractInsights = (conv: typeof conversation): string[] => {
    const insights: string[] = [];
    if (conv.some(m => m.message.toLowerCase().includes('stress'))) insights.push('Identified stress triggers');
    if (conv.some(m => m.message.toLowerCase().includes('impulse'))) insights.push('Recognized impulse patterns');
    if (conv.some(m => m.message.toLowerCase().includes('goal'))) insights.push('Clarified financial goals');
    if (conv.some(m => m.message.toLowerCase().includes('coping'))) insights.push('Developed coping strategies');
    return insights.length > 0 ? insights : ['Gained self-awareness'];
  };

  const analyzeMood = (conv: typeof conversation): 'positive' | 'neutral' | 'negative' => {
    const positiveWords = ['good', 'better', 'improve', 'progress', 'hope', 'excited'];
    const negativeWords = ['bad', 'worse', 'hopeless', 'stuck', 'frustrated', 'angry'];
    
    const positiveCount = conv.filter(m => 
      positiveWords.some(word => m.message.toLowerCase().includes(word))
    ).length;
    
    const negativeCount = conv.filter(m => 
      negativeWords.some(word => m.message.toLowerCase().includes(word))
    ).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  };

  const calculateProgress = (conv: typeof conversation): number => {
    // Simple progress calculation based on conversation depth
    const meaningfulExchanges = conv.filter(m => m.message.length > 20).length;
    return Math.min(90, Math.max(10, meaningfulExchanges * 15));
  };

  const exportSession = (session: TherapySession) => {
    const content = `
AI Financial Therapy Session Report
==================================
Date: ${session.date}
Therapist: ${session.therapist}
Duration: ${session.duration} minutes
Mood: ${session.mood}
Progress: ${session.progress}%

Key Insights:
${session.insights.map(insight => `• ${insight}`).join('\n')}

Generated on: ${new Date().toLocaleDateString()}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `therapy-session-${session.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isInSession) {
    const therapist = therapists.find(t => t.id === selectedTherapist);
    
    return (
      <div className="ai-therapist-session">
        {/* Session Header */}
        <div className="session-header">
          <button onClick={endSession} className="back-button">
            <ArrowLeft size={20} />
            End Session
          </button>
          <div className="therapist-info">
            <div className={`therapist-avatar ${therapist?.avatarClass}`}>
              {therapist?.emoji}
            </div>
            <div>
              <h3>{therapist?.name}</h3>
              <p>{therapist?.style}</p>
            </div>
          </div>
          <div className="session-timer">
            <Clock size={16} />
            {Math.ceil(conversation.length * 2)} min
          </div>
        </div>

        {/* Conversation Area */}
        <div className="conversation-area">
          <div className="conversation-messages">
            {conversation.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-content">
                  {msg.role === 'therapist' && (
                    <div className={`therapist-avatar-small ${therapist?.avatarClass}`}>
                      {therapist?.emoji}
                    </div>
                  )}
                  <div className="message-bubble">
                    <p>{msg.message}</p>
                    <span className="timestamp">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="message-input">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Share your thoughts, feelings, or questions..."
            className="message-field"
          />
          <button onClick={sendMessage} className="send-button">
            <MessageCircle size={20} />
          </button>
        </div>

        {/* Quick Insights Panel */}
        <div className="quick-insights">
          <h4>Session Insights</h4>
          <div className="insights-grid">
            <div className="insight-card">
              <TrendingUp size={16} />
              <span>Progress: {calculateProgress(conversation)}%</span>
            </div>
            <div className="insight-card">
              <Heart size={16} />
              <span>Mood: {analyzeMood(conversation)}</span>
            </div>
            <div className="insight-card">
              <MessageCircle size={16} />
              <span>Exchanges: {conversation.length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-financial-therapist">
      {/* Header */}
      <div className="therapist-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <h1>AI Financial Therapist</h1>
        <p>Transform your relationship with money through AI-powered therapy</p>
      </div>

      {/* Therapist Selection */}
      <div className="therapist-selection">
        <h2>Choose Your AI Therapist</h2>
        <p className="selection-subtitle">
          Each therapist has a unique approach to help you understand and improve your financial psychology
        </p>
        
        <div className="therapist-grid">
          {therapists.map((therapist) => (
            <div 
              key={therapist.id} 
              className={`therapist-card ${selectedTherapist === therapist.id ? 'active' : ''}`}
              onClick={() => selectTherapist(therapist.id)}
            >
              <div className={`therapist-avatar ${therapist.avatarClass}`}>
                <span className="avatar-emoji">{therapist.emoji}</span>
              </div>
              <h3>{therapist.name}</h3>
              <p className="therapist-style">{therapist.style}</p>
              <p className="therapist-desc">{therapist.description}</p>
              <div className="specialties">
                {therapist.specialties.join(' • ')}
              </div>
              <button 
                className="start-session-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  startSession(therapist.id);
                }}
              >
                Start Session
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Session Interface */}
      {activeTherapist && (
        <div className="session-container">
          <div className="session-header">
            <div className="active-therapist-info">
              <div className={`active-therapist-avatar ${activeTherapist.avatarClass}`}>
                {activeTherapist.emoji}
              </div>
              <div className="therapist-details">
                <h3 id="current-therapist-name">{activeTherapist.name}</h3>
                <div className="session-status">
                  <div className="online-indicator"></div>
                  <span>Ready to begin</span>
                </div>
              </div>
            </div>
            <div className="session-controls">
              <button className="control-btn" onClick={() => setShowPatterns(!showPatterns)}>
                <BarChart3 size={16} />
                View Patterns
              </button>
              <button className="control-btn" onClick={() => startSession(activeTherapist.id)}>
                <MessageCircle size={16} />
                Start Chat
              </button>
            </div>
          </div>

          {/* Begin Section */}
          <div className="begin-section">
            <h3 className="begin-title">How are you feeling about money today?</h3>
            
            {/* Mood Entry */}
            <div className="mood-entry">
              <h4>Select your current mood:</h4>
              <div className="mood-grid">
                {moods.map((mood) => (
                  <button
                    key={mood.id}
                    className="mood-btn"
                    onClick={() => startTherapySession('mood', mood.text.toLowerCase())}
                  >
                    <span className="mood-emoji">{mood.emoji}</span>
                    <div className="mood-text">
                      <strong>{mood.text}</strong>
                      <p>{mood.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Selection */}
            <div className="topic-selection">
              <h4>Or choose a topic to explore:</h4>
              <div className="topic-grid">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    className="topic-card"
                    onClick={() => startTherapySession('topic', topic.id)}
                  >
                    <div className="topic-icon">{topic.icon}</div>
                    <div className="topic-content">
                      <h5>{topic.title}</h5>
                      <p>{topic.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="ai-insights-section">
        <div className="insights-header">
          <h3>AI-Powered Insights</h3>
          <p>Based on your financial patterns and behavior</p>
        </div>
        
        <div className="insights-grid">
          {insights.map((insight, index) => (
            <div key={index} className={`insight-card priority-${insight.priority}`}>
              <div className="insight-icon">{insight.icon}</div>
              <div className="insight-content">
                <h4>{insight.title}</h4>
                <p>{insight.description}</p>
                <button 
                  className="explore-btn"
                  onClick={() => startTherapySession('insight', insight.title)}
                >
                  Explore This
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Patterns Analysis */}
      <div className="patterns-section">
        <div className="section-header">
          <h2>Your Financial Patterns</h2>
          <button 
            onClick={() => setShowPatterns(!showPatterns)}
            className="toggle-patterns-btn"
          >
            {showPatterns ? 'Hide' : 'Show'} Analysis
          </button>
        </div>
        
        {showPatterns && (
          <div className="patterns-grid">
            {financialPatterns.map((pattern, index) => (
              <div key={index} className={`pattern-card ${pattern.severity}`}>
                <div className="pattern-header">
                  <h4>{pattern.type}</h4>
                  <span className={`severity-badge ${pattern.severity}`}>
                    {pattern.severity.toUpperCase()}
                  </span>
                </div>
                <p className="pattern-description">{pattern.description}</p>
                <div className="pattern-impact">
                  <strong>Impact:</strong> {pattern.impact}
                </div>
                <div className="pattern-recommendation">
                  <strong>Recommendation:</strong> {pattern.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Therapy History */}
      <div className="therapy-history">
        <h2>Your Therapy Journey</h2>
        <div className="sessions-grid">
          {therapySessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="session-header">
                <h4>{session.therapist}</h4>
                <span className="session-date">{session.date}</span>
              </div>
              <div className="session-details">
                <div className="session-stat">
                  <Clock size={16} />
                  <span>{session.duration} min</span>
                </div>
                <div className="session-stat">
                  <TrendingUp size={16} />
                  <span>{session.progress}% progress</span>
                </div>
                <div className="session-stat">
                  <MessageCircle size={16} />
                  <span>{session.insights.length} insights</span>
                </div>
              </div>
              <div className="session-insights">
                <strong>Key Insights:</strong>
                <ul>
                  {session.insights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>
              <div className="session-actions">
                <button 
                  onClick={() => exportSession(session)}
                  className="export-btn"
                >
                  <Download size={16} />
                  Export
                </button>
                <button className="share-btn">
                  <Share2 size={16} />
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button 
            onClick={() => setShowPatterns(!showPatterns)}
            className="action-btn"
          >
            <BarChart3 size={20} />
            Analyze Patterns
          </button>
          <button 
            onClick={generateFinancialPatterns}
            className="action-btn"
          >
            <RefreshCw size={20} />
            Refresh Analysis
          </button>
          <button 
            onClick={() => navigate('/dashboard/analytics')}
            className="action-btn"
          >
            <TrendingUp size={20} />
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIFinancialTherapist;
