import { useState, useEffect, useRef } from 'react';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import { useLocation } from 'react-router-dom';
import { 
  Send, 
  Loader2,
  Target,
  Brain,
  Mic,
  Paperclip,
  Upload,
  BarChart3,
  FileText,
  Zap,
  X,
  Bot
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import {
  getEmployeeConfig,
  getConversation,
  saveConversation,
  logAIInteraction,
  getRecentConversations
} from '../../lib/ai-employees';

interface PrimeMessage {
  role: 'user' | 'prime' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    processing_time_ms?: number;
    tokens_used?: number;
    model_used?: string;
  };
}

interface AIWorker {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'completed';
  progress: number;
  currentTask: string;
  avatar: string;
  color: string;
}

interface WorkerMessage {
  id: string;
  worker: string;
  content: string;
  timestamp: string;
  type: 'status' | 'chat' | 'progress';
}

export default function AIFinancialAssistantPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<PrimeMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [watchMeWorkOpen, setWatchMeWorkOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentFeature, setCurrentFeature] = useState('');
  const [workerChatInput, setWorkerChatInput] = useState('');
  const [workerChatMessages, setWorkerChatMessages] = useState([
    {
      id: '1',
      sender: 'Prime',
      message: 'Hello! I\'m Prime, your AI team coordinator. Feel free to ask me or any of the team members questions!',
      timestamp: new Date().toISOString(),
      type: 'system'
    }
  ]);

  // Real data states for sidebar display
  const [realCategories, setRealCategories] = useState([
    { name: 'Food & Dining', count: 23, amount: 456.78, color: 'from-green-500 to-emerald-500' },
    { name: 'Transportation', count: 15, amount: 234.50, color: 'from-blue-500 to-cyan-500' },
    { name: 'Shopping', count: 8, amount: 189.99, color: 'from-purple-500 to-violet-500' },
    { name: 'Entertainment', count: 12, amount: 156.75, color: 'from-orange-500 to-yellow-500' },
    { name: 'Utilities', count: 6, amount: 298.30, color: 'from-red-500 to-pink-500' },
    { name: 'Healthcare', count: 4, amount: 89.45, color: 'from-indigo-500 to-purple-500' }
  ]);

  const [realTransactions, setRealTransactions] = useState([
    { id: 1, description: 'Starbucks Coffee', amount: 4.95, category: 'Food & Dining', date: '2024-01-15', type: 'expense' },
    { id: 2, description: 'Uber Ride', amount: 12.50, category: 'Transportation', date: '2024-01-15', type: 'expense' },
    { id: 3, description: 'Amazon Purchase', amount: 45.99, category: 'Shopping', date: '2024-01-14', type: 'expense' },
    { id: 4, description: 'Netflix Subscription', amount: 15.99, category: 'Entertainment', date: '2024-01-14', type: 'expense' },
    { id: 5, description: 'Salary Deposit', amount: 3500.00, category: 'Income', date: '2024-01-14', type: 'income' }
  ]);

  const [realAutomations, setRealAutomations] = useState([
    { id: 1, name: 'Auto-categorize Starbucks', rule: 'If merchant contains "Starbucks" → Food & Dining', status: 'active', lastRun: '2 hours ago' },
    { id: 2, name: 'Round up savings', rule: 'Round up all purchases to nearest dollar → Savings', status: 'active', lastRun: '1 hour ago' },
    { id: 3, name: 'Bill reminders', rule: 'Notify 3 days before recurring bills', status: 'active', lastRun: '30 minutes ago' },
    { id: 4, name: 'Expense alerts', rule: 'Alert when daily spending exceeds $100', status: 'active', lastRun: '15 minutes ago' }
  ]);

  const [realGoals, setRealGoals] = useState([
    { id: 1, name: 'Emergency Fund', target: 10000, current: 3500, deadline: '2024-12-31', progress: 35 },
    { id: 2, name: 'Vacation Fund', target: 3000, current: 1200, deadline: '2024-06-30', progress: 40 },
    { id: 3, name: 'New Car', target: 25000, current: 8500, deadline: '2025-03-15', progress: 34 }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activityFeedRef = useRef<HTMLDivElement>(null);

  // AI Workers state
  const [aiWorkers, setAiWorkers] = useState<AIWorker[]>([
    {
      id: 'finley',
      name: 'Finley',
      role: 'Financial Assistant',
      status: 'idle',
      progress: 0,
      currentTask: 'Ready to assist with financial queries',
      avatar: '🤖',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'crystal',
      name: 'Crystal',
      role: 'Data Analysis Expert',
      status: 'idle',
      progress: 0,
      currentTask: 'Waiting for data to analyze',
      avatar: '💎',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'tag',
      name: 'Tag',
      role: 'Auto-Categorization Specialist',
      status: 'idle',
      progress: 0,
      currentTask: 'Ready to categorize transactions',
      avatar: '🏷️',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'prime',
      name: 'Prime',
      role: 'AI Team Coordinator',
      status: 'idle',
      progress: 0,
      currentTask: 'Coordinating team activities',
      avatar: '👑',
      color: 'from-orange-500 to-yellow-500'
    }
  ]);

  const [workerMessages, setWorkerMessages] = useState<WorkerMessage[]>([
    {
      id: '1',
      worker: 'Prime',
      content: 'AI Financial Assistant team assembled and ready!',
      timestamp: new Date().toISOString(),
      type: 'status'
    }
  ]);

  // Simulate AI worker activities for different features
  const simulateFeatureWorkflow = (feature: string) => {
    // Reset workers to idle state
    setAiWorkers(prev => prev.map(worker => ({
      ...worker,
      status: 'idle' as const,
      progress: 0,
      currentTask: 'Ready to assist with financial queries'
    })));

    // Clear previous messages
    setWorkerMessages([{
      id: '1',
      worker: 'Prime',
      content: `${feature} team assembled and ready!`,
      timestamp: new Date().toISOString(),
      type: 'status'
    }]);
    const workflows = {
      'Smart Import AI': [
        { worker: 'finley', task: 'Initializing document processing...', progress: 20 },
        { worker: 'finley', task: 'Analyzing document structure...', progress: 40 },
        { worker: 'finley', task: 'Extracting transaction data...', progress: 60 },
        { worker: 'finley', task: 'Validating data integrity...', progress: 80 },
        { worker: 'finley', task: 'Smart Import AI processing complete!', progress: 100 },
        { worker: 'tag', task: 'Auto-categorizing transactions...', progress: 50 },
        { worker: 'tag', task: 'Applying smart tags...', progress: 100 },
        { worker: 'crystal', task: 'Analyzing spending patterns...', progress: 70 },
        { worker: 'crystal', task: 'Generating insights...', progress: 100 }
      ],
      'Smart Categories': [
        { worker: 'tag', task: 'Scanning transaction categories...', progress: 30 },
        { worker: 'tag', task: 'Identifying patterns...', progress: 60 },
        { worker: 'tag', task: 'Optimizing category rules...', progress: 90 },
        { worker: 'tag', task: 'Smart Categories updated!', progress: 100 },
        { worker: 'crystal', task: 'Analyzing category performance...', progress: 80 },
        { worker: 'crystal', task: 'Category insights ready!', progress: 100 }
      ],
      'Transaction Analysis': [
        { worker: 'crystal', task: 'Loading transaction data...', progress: 25 },
        { worker: 'crystal', task: 'Analyzing spending trends...', progress: 50 },
        { worker: 'crystal', task: 'Identifying anomalies...', progress: 75 },
        { worker: 'crystal', task: 'Transaction analysis complete!', progress: 100 },
        { worker: 'finley', task: 'Generating recommendations...', progress: 100 }
      ],
      'AI Goal Concierge': [
        { worker: 'finley', task: 'Analyzing financial goals...', progress: 30 },
        { worker: 'finley', task: 'Creating goal roadmap...', progress: 60 },
        { worker: 'finley', task: 'Setting milestones...', progress: 90 },
        { worker: 'finley', task: 'Goal Concierge plan ready!', progress: 100 },
        { worker: 'prime', task: 'Coordinating goal tracking...', progress: 100 }
      ],
      'Receipt Processing': [
        { worker: 'finley', task: 'Scanning receipt image...', progress: 25 },
        { worker: 'finley', task: 'Extracting receipt data...', progress: 50 },
        { worker: 'finley', task: 'Validating receipt info...', progress: 75 },
        { worker: 'finley', task: 'Receipt processed successfully!', progress: 100 },
        { worker: 'tag', task: 'Categorizing receipt...', progress: 100 }
      ],
      'Smart Automation': [
        { worker: 'prime', task: 'Analyzing workflow patterns...', progress: 40 },
        { worker: 'prime', task: 'Creating automation rules...', progress: 70 },
        { worker: 'prime', task: 'Testing automation logic...', progress: 90 },
        { worker: 'prime', task: 'Smart Automation activated!', progress: 100 },
        { worker: 'finley', task: 'Monitoring automation...', progress: 100 }
      ]
    };

    const tasks = workflows[feature as keyof typeof workflows] || [];
    let taskIndex = 0;
    
    const interval = setInterval(() => {
      if (taskIndex >= tasks.length) {
        clearInterval(interval);
        return;
      }

      const currentTask = tasks[taskIndex];
      
      // Update worker status
      setAiWorkers(prev => prev.map(worker => 
        worker.id === currentTask.worker 
          ? { 
              ...worker, 
              status: currentTask.progress === 100 ? 'completed' : 'working',
              progress: currentTask.progress,
              currentTask: currentTask.task
            }
          : worker
      ));

      // Add worker message
      const newMessage: WorkerMessage = {
        id: Date.now().toString(),
        worker: currentTask.worker,
        content: currentTask.task,
        timestamp: new Date().toISOString(),
        type: currentTask.progress === 100 ? 'status' : 'progress'
      };

      setWorkerMessages(prev => [...prev, newMessage]);

      // Add chat messages between workers
      if (Math.random() > 0.6) {
        const chatMessages = {
          'Smart Import AI': [
            { worker: 'Finley', content: 'Document processing is going smoothly!' },
            { worker: 'Tag', content: 'Auto-categorization is working perfectly.' },
            { worker: 'Crystal', content: 'I can see clear patterns in the imported data.' }
          ],
          'Smart Categories': [
            { worker: 'Tag', content: 'Category optimization is running smoothly!' },
            { worker: 'Crystal', content: 'Category performance analysis is complete.' },
            { worker: 'Finley', content: 'Smart categories are being applied automatically.' }
          ],
          'Transaction Analysis': [
            { worker: 'Crystal', content: 'Transaction analysis is revealing interesting patterns!' },
            { worker: 'Finley', content: 'Generating personalized recommendations now.' },
            { worker: 'Prime', content: 'Analysis team coordination is excellent!' }
          ],
          'AI Goal Concierge': [
            { worker: 'Finley', content: 'Financial goal analysis is progressing well!' },
            { worker: 'Prime', content: 'Goal tracking coordination is active.' },
            { worker: 'Crystal', content: 'Goal performance metrics are being calculated.' }
          ],
          'Receipt Processing': [
            { worker: 'Finley', content: 'Receipt scanning and extraction is working perfectly!' },
            { worker: 'Tag', content: 'Receipt categorization is automated and accurate.' },
            { worker: 'Crystal', content: 'Receipt data patterns are being analyzed.' }
          ],
          'Smart Automation': [
            { worker: 'Prime', content: 'Automation workflow analysis is complete!' },
            { worker: 'Finley', content: 'Monitoring automation performance in real-time.' },
            { worker: 'Crystal', content: 'Automation efficiency metrics are excellent.' }
          ]
        };

        const featureMessages = chatMessages[feature as keyof typeof chatMessages] || [
          { worker: 'Finley', content: `Working on ${feature} - this is going smoothly!` },
          { worker: 'Crystal', content: 'I can see the data patterns clearly now.' },
          { worker: 'Tag', content: 'Categories are being optimized automatically.' }
        ];

        const randomChat = featureMessages[Math.floor(Math.random() * featureMessages.length)];
        const chatMessage: WorkerMessage = {
          id: (Date.now() + 1).toString(),
          worker: randomChat.worker,
          content: randomChat.content,
          timestamp: new Date().toISOString(),
          type: 'chat'
        };

        setWorkerMessages(prev => [...prev, chatMessage]);
      }

      taskIndex++;
    }, 2000);
  };

  // Initialize conversation and load Finley's config
  useEffect(() => {
    const initializeFinley = async () => {
      if (!user?.id) return;

      // Use a persistent conversation ID based on user ID
      const persistentConversationId = `finley-${user.id}`;
      setConversationId(persistentConversationId);

      // Load Finley's configuration
      await getEmployeeConfig('finley');

      // Load existing conversation if any
      const existingConversation = await getConversation(user.id, 'finley', persistentConversationId);
      if (existingConversation && existingConversation.messages.length > 0) {
        setMessages(existingConversation.messages as FinleyMessage[]);
      } else {
        // If no conversation with persistent ID, try to get the most recent conversation
        const recentConversations = await getRecentConversations(user.id, 'finley', 1);
        if (recentConversations.length > 0) {
          const recentConversation = recentConversations[0];
          setMessages(recentConversation.messages as FinleyMessage[]);
          setConversationId(recentConversation.conversation_id);
        }
      }
    };

    initializeFinley();
  }, [user?.id]);

  // Handle activity context from sidebar navigation
  useEffect(() => {
    const activityContext = location.state?.activityContext;
    if (activityContext && user?.id) {
      // Auto-send a message about the activity
      const activityMessage = `I see ${activityContext.aiName} was ${activityContext.activityTitle.toLowerCase()} ${activityContext.timestamp}. Can you tell me more about this?`;
      setTimeout(() => {
        sendMessage(activityMessage);
      }, 1000);
    }
  }, [location.state, user?.id]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-scroll activity feed when new worker messages arrive
  useEffect(() => {
    if (activityFeedRef.current) {
      // Multiple attempts to ensure scrolling works
      const scrollToBottom = () => {
        const container = activityFeedRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      };

      // Immediate scroll
      scrollToBottom();
      
      // Delayed scrolls to handle rendering timing
      setTimeout(scrollToBottom, 50);
      setTimeout(scrollToBottom, 150);
      setTimeout(scrollToBottom, 300);
    }
  }, [workerMessages]);

  // Listen for Watch Me Work events from alerts popup
  useEffect(() => {
    const handleOpenWatchMeWork = (event: CustomEvent) => {
      const { feature } = event.detail;
      setCurrentFeature(feature || 'AI Team Overview');
      simulateFeatureWorkflow(feature || 'AI Team Overview');
      setWatchMeWorkOpen(true);
    };

    window.addEventListener('openWatchMeWork', handleOpenWatchMeWork as EventListener);
    return () => window.removeEventListener('openWatchMeWork', handleOpenWatchMeWork as EventListener);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachments(prev => [...prev, ...newFiles]);
      
      // Auto-send message about uploaded files
      const fileNames = newFiles.map(f => f.name).join(', ');
      sendMessage(`I uploaded ${fileNames}`);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !user?.id) return;

    const userMessage: PrimeMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the real chat endpoint with Prime
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id || 'demo-user',
          employeeSlug: 'prime-boss',
          message: content.trim(),
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.status}`);
      }

      const data = await response.json();
      
      const aiResponse: PrimeMessage = {
        role: 'prime',
        content: data.content || "I'm here to help coordinate your AI team!",
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: Date.now(),
          tokens_used: 0,
          model_used: 'gpt-4'
        }
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Fallback response from Prime
      const fallbackResponse: PrimeMessage = {
        role: 'prime',
        content: "I'm Prime, your AI Team Coordinator! I'm having trouble connecting right now, but I'm here to help you coordinate with Byte, Crystal, Tag, and all our AI specialists. What would you like to accomplish?",
        timestamp: new Date().toISOString(),
        metadata: {
          processing_time_ms: Date.now(),
          tokens_used: 0,
          model_used: 'fallback'
        }
      };

      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsLoading(false);
    }
      
      const lowerContent = content.toLowerCase();
      
      if (lowerContent.includes('hi') || lowerContent.includes('hello') || lowerContent.includes('hey')) {
        const userName = user?.name || user?.email?.split('@')[0] || 'there';
        aiResponse = {
          role: 'finley',
          content: `👋 Hi ${userName}! I'm your XspensesAI Financial Assistant. How can I help you today?`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 800,
            tokens_used: 50,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('smart import') || lowerContent.includes('upload') || lowerContent.includes('categorize') || lowerContent.includes('upload document') || lowerContent.includes('process statement')) {
        const userName = user?.name || user?.email?.split('@')[0] || 'there';
        aiResponse = {
          role: 'finley',
          content: `Great choice! Byte is our document processing superstar. Let me get them...\n\n*Byte joins the conversation*\n\nByte: "Hey ${userName}! 📄 I'm Byte, and I absolutely love processing documents! I can handle bank statements, receipts, CSV files - you name it. I'm super fast and accurate too. What do you have for me to work on?"`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1200,
            tokens_used: 120,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('add category') || lowerContent.includes('create category') || lowerContent.includes('new category') || lowerContent.includes('can you add a category')) {
        const userName = user?.name || user?.email?.split('@')[0] || 'there';
        aiResponse = {
          role: 'finley',
          content: `Perfect! Tag is our categorization wizard. Let me grab them...\n\n*Tag joins the conversation*\n\nTag: "Hey ${userName}! 🏷️ I heard you want to add a category. I'm all about keeping things organized! What kind of category are you thinking? Something for work expenses, entertainment, or maybe something totally unique?"`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1200,
            tokens_used: 120,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('smart categories') || lowerContent.includes('categorization')) {
        aiResponse = {
          role: 'finley',
          content: `🧠 **Smart Categories**\n\nAuto-categorizes transactions. Gets smarter over time!`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 800,
            tokens_used: 60,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('transaction') || lowerContent.includes('analysis') || lowerContent.includes('spending')) {
        aiResponse = {
          role: 'finley',
          content: `📊 **Transaction Analysis** reveals the hidden stories in your spending:\n\n• **Trend Analysis**: Spot spending patterns across months and years\n• **Category Breakdown**: See exactly where your money goes\n• **Spending Alerts**: Get notified about unusual transactions\n• **Predictive Insights**: Forecast future spending based on patterns\n\nI can help you dive deep into any specific time period or category. What would you like to analyze?`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1300,
            tokens_used: 170,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('goal') || lowerContent.includes('concierge') || lowerContent.includes('set goal') || lowerContent.includes('financial goal')) {
        const userName = user?.name || user?.email?.split('@')[0] || 'there';
        aiResponse = {
          role: 'finley',
          content: `Hey ${userName}! I think Goalie would be perfect for this. Let me get them for you...\n\n*Goalie joins the conversation*\n\nGoalie: "Hey ${userName}! 👋 I heard you're thinking about financial goals. That's awesome! I love helping people turn their dreams into reality. What's on your mind? Are you saving for something specific, or maybe looking to pay off debt?"`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1200,
            tokens_used: 120,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('receipt') || lowerContent.includes('scan')) {
        aiResponse = {
          role: 'finley',
          content: `📄 **Receipt Processing** makes expense tracking effortless:\n\n• **Instant OCR**: Extract data from any receipt in seconds\n• **Smart Matching**: Automatically match receipts to transactions\n• **Expense Validation**: Verify amounts and categories\n• **Digital Storage**: Never lose a receipt again\n\nJust snap a photo and watch the AI do the rest. It's like having a personal assistant for every purchase!`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1250,
            tokens_used: 165,
            model_used: 'gpt-4'
          }
        };
      } else if (lowerContent.includes('automation') || lowerContent.includes('workflow')) {
        aiResponse = {
          role: 'finley',
          content: `⚡ **Smart Automation** streamlines your financial management:\n\n• **Auto-Categorization**: Set rules for recurring transactions\n• **Bill Reminders**: Never miss a payment again\n• **Budget Alerts**: Get notified when approaching limits\n• **Report Generation**: Automatic weekly and monthly reports\n\nI can help you set up custom automations that work with your specific financial habits. What would you like to automate?`,
          timestamp: new Date().toISOString(),
          metadata: {
            processing_time_ms: 1350,
            tokens_used: 180,
            model_used: 'gpt-4'
          }
        };
      } else {
        const userName = user?.name || user?.email?.split('@')[0] || 'there';
        aiResponse = {
        role: 'finley',
          content: `🤖 Hi ${userName}! I'm your XspensesAI Financial Assistant, and I'm here to help you master your finances!\n\nI can assist you with:\n• **Smart Import AI** - Upload and categorize transactions\n• **Smart Categories** - AI-powered expense insights\n• **Transaction Analysis** - Deep spending analysis\n• **AI Goal Concierge** - Set and track financial goals\n• **Receipt Processing** - Scan and process receipts\n• **Smart Automation** - Automate your workflows\n\nWhat would you like to explore? I'm here to make your financial journey smarter and more efficient!`,
        timestamp: new Date().toISOString(),
        metadata: {
            processing_time_ms: 1500,
            tokens_used: 200,
            model_used: 'gpt-4'
          }
        };
      }

      setMessages(prev => [...prev, aiResponse]);

      // Save conversation
      const conversationMessages = [...messages, userMessage, aiResponse].map(msg => ({
        ...msg,
        role: msg.role === 'finley' ? 'assistant' as const : msg.role
      }));
      await saveConversation(user.id, 'finley', conversationId, conversationMessages);

      // Log interaction
      await logAIInteraction(user.id, 'finley', 'chat', JSON.stringify({
        messageCount: messages.length + 2,
        conversationId
      }));

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkerChat = (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      sender: 'You',
      message: message.trim(),
      timestamp: new Date().toISOString(),
      type: 'user' as const
    };

    setWorkerChatMessages(prev => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        { sender: 'Prime', message: 'Great question! Let me coordinate with the team on that.' },
        { sender: 'Byte', message: 'I\'m currently processing documents. Everything is running smoothly!' },
        { sender: 'Crystal', message: 'The data analysis is progressing well. I\'ll have insights ready soon.' },
        { sender: 'Tag', message: 'Categorization is working perfectly. All transactions are being sorted automatically.' },
        { sender: 'Prime', message: 'The team is working efficiently. Is there anything specific you\'d like to know?' }
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        sender: randomResponse.sender,
        message: randomResponse.message,
        timestamp: new Date().toISOString(),
        type: 'ai' as const
      };

      setWorkerChatMessages(prev => [...prev, aiMessage]);
    }, 1000);

    setWorkerChatInput('');
  };

  const handleWorkerChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleWorkerChat(workerChatInput);
    }
  };

  return (
    <>
      <div className="w-full pt-4 px-4 sm:px-6 lg:px-8">
        {/* Page Title */}
        <MobilePageTitle 
          title="AI Financial Assistant" 
          subtitle="Get personalized financial advice from AI"
        />
        
        {/* Desktop Title */}
        <div className="hidden md:block text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2" style={{ WebkitBackgroundClip: 'text' }}>
            AI Financial Assistant
          </h1>
          <p className="text-white/60 text-lg">
            Get personalized financial advice from AI
          </p>
        </div>
        
        {/* Welcome Banner */}
        <div className="max-w-6xl mx-auto pr-4 lg:pr-20">
          <div
            className="text-center mb-6"
          >
            <h2 className="text-xl font-bold text-white mb-1">
              Welcome to Finley's Financial Lab
            </h2>
            <p className="text-white/60 text-sm mb-4">
              Your intelligent financial advisor and personal money management assistant
            </p>
          </div>
          

          {/* Feature Modules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto pr-4 lg:pr-20">
            {[
              { icon: Upload, title: "Smart Import AI", desc: "Upload and categorize transactions", color: "from-blue-500 to-purple-600" },
              { icon: Brain, title: "Smart Categories", desc: "AI-powered expense insights", color: "from-green-500 to-emerald-600" },
              { icon: BarChart3, title: "Transaction Analysis", desc: "Deep spending analysis", color: "from-red-500 to-pink-600" },
              { icon: Target, title: "AI Goal Concierge", desc: "Set and track financial goals", color: "from-purple-500 to-violet-600" },
              { icon: FileText, title: "Receipt Processing", desc: "Scan and process receipts", color: "from-orange-500 to-red-600" },
              { icon: Zap, title: "Smart Automation", desc: "Automate workflows", color: "from-cyan-500 to-blue-600" }
            ].map((item, index) => (
              <button
                key={item.title}
                onClick={() => {
                  sendMessage(`Help me with ${item.title.toLowerCase()}`);
                  setCurrentFeature(item.title);
                  simulateFeatureWorkflow(item.title);
                  setWatchMeWorkOpen(true);
                  
                  // Show real data based on feature
                  if (item.title === 'Smart Categories') {
                    // Simulate AI updating categories
                    setTimeout(() => {
                      setRealCategories(prev => prev.map(cat => ({
                        ...cat,
                        count: cat.count + Math.floor(Math.random() * 3),
                        amount: cat.amount + (Math.random() * 50)
                      })));
                    }, 2000);
                  } else if (item.title === 'Transaction Analysis') {
                    // Simulate new transaction analysis
                    setTimeout(() => {
                      setRealTransactions(prev => [...prev, {
                        id: Date.now(),
                        description: 'AI Detected: Unusual spending pattern',
                        amount: -25.00,
                        category: 'Analysis Alert',
                        date: new Date().toISOString().split('T')[0],
                        type: 'analysis'
                      }]);
                    }, 3000);
                  } else if (item.title === 'Smart Automation') {
                    // Simulate automation running
                    setTimeout(() => {
                      setRealAutomations(prev => prev.map(auto => ({
                        ...auto,
                        lastRun: 'Just now'
                      })));
                    }, 1500);
                  } else if (item.title === 'AI Goal Concierge') {
                    // Simulate goal progress update
                    setTimeout(() => {
                      setRealGoals(prev => prev.map(goal => ({
                        ...goal,
                        current: goal.current + Math.floor(Math.random() * 100),
                        progress: Math.min(100, Math.floor(((goal.current + Math.floor(Math.random() * 100)) / goal.target) * 100))
                      })));
                    }, 2500);
                  }
                }}
                className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-white/60 text-xs leading-tight">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Chat with Finley</h3>
                <p className="text-white/60 text-sm">Your AI Financial Assistant</p>
              </div>
            </div>
            
            {/* Chat Messages Area */}
            <div className="h-64 overflow-y-auto space-y-3 mb-4" ref={messagesEndRef}>
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-white/60 text-sm mb-2">
                      Start a conversation with Finley
                    </p>
                    <p className="text-white/40 text-xs">
                      Click any feature above or type a message below to get started
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md px-2 py-1.5 rounded text-left ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    <p className="text-sm leading-tight whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-0.5">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div
                className="flex justify-start"
              >
                <div className="bg-white/10 px-3 py-2 rounded-lg border border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Brain className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-green-400" />
                      <span className="text-xs text-white/70">AI is analyzing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>
            
            {/* Chat Input Area */}
            <div className="border-t border-white/10 pt-4">
            {/* Attachments Display */}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-1 bg-white/10 rounded px-2 py-1 text-xs text-white">
                    <span className="truncate max-w-20">{file.name}</span>
                    <button 
                      onClick={() => removeAttachment(index)}
                      className="text-white/60 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                  placeholder="Ask Finley about Smart Import AI, Smart Categories, or any financial question..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                  disabled={isLoading}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Paperclip className="w-4 h-4 text-white/60" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.csv,.xlsx,.xls,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Mic className="w-4 h-4 text-white/60" />
              </button>
              <button
                onClick={() => !isLoading && sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Watch Me Work Modal */}
      
        {watchMeWorkOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setWatchMeWorkOpen(false)}
          >
            <div
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/20 w-full max-w-6xl max-h-[95vh] overflow-hidden mx-2 md:mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-2xl font-bold text-white mb-1 md:mb-2 truncate">
                    {currentFeature ? `${currentFeature} Team` : 'AI Financial Assistant Team'}
                  </h2>
                  <p className="text-white/60 text-sm md:text-base hidden md:block">
                    {currentFeature 
                      ? `Watch Finley's team process ${currentFeature.toLowerCase()} in real-time`
                      : 'Watch Finley\'s team process financial tasks in real-time'
                    }
                  </p>
                  <p className="text-white/60 text-xs md:hidden">
                    {currentFeature ? `${currentFeature} in action` : 'AI team in action'}
                  </p>
                </div>
                <button
                  onClick={() => setWatchMeWorkOpen(false)}
                  className="text-white/60 hover:text-white transition-colors flex-shrink-0 ml-2"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-col md:flex-row h-[calc(95vh-80px)] md:h-[calc(90vh-120px)]">
                {/* Left Side - AI Workers */}
                <div className="w-full md:w-1/2 p-3 md:p-6 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">AI Workers</h3>
                  <div className="space-y-2 md:space-y-4">
                    {aiWorkers.map((worker) => (
                      <div
                        key={worker.id}
                        className="bg-white/5 rounded-lg md:rounded-xl p-2 md:p-4 border border-white/10"
                      >
                        <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                          <div className={`w-8 h-8 md:w-12 md:h-12 bg-gradient-to-r ${worker.color} rounded-lg md:rounded-xl flex items-center justify-center text-white text-sm md:text-xl`}>
                            {worker.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold text-xs md:text-base">{worker.name}</h4>
                            <p className="text-white/60 text-xs md:text-sm truncate">{worker.role}</p>
                          </div>
                          <div className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium ${
                            worker.status === 'working' ? 'bg-blue-500/20 text-blue-400' :
                            worker.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {worker.status}
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-1 md:mb-3">
                          <div className="flex justify-between text-xs text-white/60 mb-1">
                            <span className="truncate mr-2 text-xs">{worker.currentTask}</span>
                            <span className="flex-shrink-0 text-xs">{worker.progress}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-1 md:h-2">
                            <div
                              className={`h-1 md:h-2 rounded-full bg-gradient-to-r ${worker.color}`}
                              animate={{ width: `${worker.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side - Live Chat & Real Data */}
                <div className="w-full md:w-1/2 p-3 md:p-6 overflow-y-auto">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Live Activity Feed</h3>
                  <div 
                    ref={activityFeedRef}
                    className="space-y-1.5 md:space-y-3 max-h-[calc(25vh-60px)] md:max-h-[calc(40vh-100px)] overflow-y-auto mb-3 md:mb-4"
                  >
                    {workerMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-1.5 md:p-3 rounded-md md:rounded-lg ${
                          message.type === 'chat' ? 'bg-blue-500/10 border border-blue-500/20' :
                          message.type === 'status' ? 'bg-green-500/10 border border-green-500/20' :
                          'bg-purple-500/10 border border-purple-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-1 md:gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-semibold text-white">{message.worker}</span>
                          <span className={`text-xs px-1 md:px-2 py-0.5 rounded-full ${
                            message.type === 'chat' ? 'bg-blue-500/20 text-blue-400' :
                            message.type === 'status' ? 'bg-green-500/20 text-green-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {message.type}
                          </span>
                          <span className="text-xs text-white/40">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-white/80 text-xs">{message.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Real Data Section */}
                  <div className="border-t border-white/10 pt-3 md:pt-4">
                    <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Real Data Updates</h3>
                    
                    {/* Categories */}
                    {currentFeature === 'Smart Categories' && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-white/80 mb-2">Updated Categories</h4>
                        <div className="space-y-1.5 md:space-y-2 max-h-24 md:max-h-32 overflow-y-auto">
                          {realCategories.map((category, index) => (
                            <div
                              key={category.name}
                              className="flex items-center justify-between p-1.5 md:p-2 bg-white/5 rounded-md md:rounded-lg"
                            >
                              <div className="flex items-center gap-1.5 md:gap-2">
                                <div className={`w-2.5 h-2.5 md:w-3 md:h-3 bg-gradient-to-r ${category.color} rounded-full`}></div>
                                <span className="text-white text-xs md:text-sm">{category.name}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-white text-xs font-medium">${category.amount.toFixed(2)}</div>
                                <div className="text-white/60 text-xs">{category.count} txns</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transactions */}
                    {currentFeature === 'Transaction Analysis' && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-white/80 mb-2">Recent Transactions</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {realTransactions.slice(-3).map((transaction, index) => (
                            <div
                              key={transaction.id}
                              className={`flex items-center justify-between p-2 rounded-lg ${
                                transaction.type === 'income' ? 'bg-green-500/10 border border-green-500/20' :
                                transaction.type === 'analysis' ? 'bg-orange-500/10 border border-orange-500/20' :
                                'bg-white/5'
                              }`}
                            >
                              <div>
                                <div className="text-white text-sm font-medium">{transaction.description}</div>
                                <div className="text-white/60 text-xs">{transaction.category}</div>
                              </div>
                              <div className={`text-sm font-medium ${
                                transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                ${Math.abs(transaction.amount).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Automations */}
                    {currentFeature === 'Smart Automation' && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-white/80 mb-2">Active Automations</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {realAutomations.map((automation, index) => (
                            <div
                              key={automation.id}
                              className="p-2 bg-white/5 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-white text-sm font-medium">{automation.name}</span>
                                <span className="text-green-400 text-xs">● {automation.status}</span>
                              </div>
                              <div className="text-white/60 text-xs mb-1">{automation.rule}</div>
                              <div className="text-white/40 text-xs">Last run: {automation.lastRun}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Goals */}
                    {currentFeature === 'AI Goal Concierge' && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-white/80 mb-2">Goal Progress</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {realGoals.map((goal, index) => (
                            <div
                              key={goal.id}
                              className="p-2 bg-white/5 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-white text-sm font-medium">{goal.name}</span>
                                <span className="text-white text-xs">{goal.progress}%</span>
                              </div>
                              <div className="w-full bg-white/10 rounded-full h-1.5 mb-1">
                                <div
                                  className="h-1.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                                  animate={{ width: `${goal.progress}%` }}
                                />
                              </div>
                              <div className="text-white/60 text-xs">
                                ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Chat with AI Workers */}
                  <div className="border-t border-white/10 pt-3 md:pt-4">
                    <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Chat with AI Workers</h3>
                    {/* Chat Messages */}
                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                      {workerChatMessages.map((msg) => (
                        <div key={msg.id} className={`p-2 rounded-lg ${
                          msg.type === 'user' ? 'bg-blue-500/10 ml-4' :
                          msg.type === 'system' ? 'bg-purple-500/10' :
                          'bg-white/5 mr-4'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-white">{msg.sender}</span>
                            <span className="text-xs text-white/40">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs text-white/80">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={workerChatInput}
                          onChange={(e) => setWorkerChatInput(e.target.value)}
                          onKeyPress={handleWorkerChatKeyPress}
                          placeholder="Ask a question to the AI team..."
                          className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                        />
                        <button 
                          onClick={() => handleWorkerChat(workerChatInput)}
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg px-3 py-2 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Quick Questions */}
                    <div className="space-y-1">
                      <p className="text-xs text-white/60 mb-2">Quick questions:</p>
                      <div className="flex flex-wrap gap-1">
                        {[
                          "What are you working on?",
                          "How's the progress?",
                          "Any issues?",
                          "Need help?"
                        ].map((question, index) => (
                          <button
                            key={index}
                            onClick={() => handleWorkerChat(question)}
                            className="text-xs bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-2 py-1 rounded-md transition-colors"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Finley Chat Slide-Out Panel */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-gradient-to-b from-slate-900 to-slate-800 border-l border-white/10 shadow-2xl transform transition-transform duration-300 z-50 ${
        isChatOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">👑</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Prime</h3>
              <p className="text-white/60 text-sm">AI Team Coordinator & Financial Boss</p>
            </div>
          </div>
          <button
            onClick={() => setIsChatOpen(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 h-[calc(100vh-140px)]">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-purple-400" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Welcome! I'm Prime 👑</h4>
                <p className="text-white/60 text-sm mb-4">
                  I'm your AI Team Coordinator and Financial Boss. I have the most memory and can connect you with the right specialists. What would you like to accomplish today?
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => sendMessage("I need help with document processing - connect me with Byte")}
                    className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm transition-colors"
                  >
                    📄 Connect me with Byte (Document Processing)
                  </button>
                  <button
                    onClick={() => sendMessage("I want financial analysis - bring in Crystal")}
                    className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm transition-colors"
                  >
                    🔮 Connect me with Crystal (Financial Analysis)
                  </button>
                  <button
                    onClick={() => sendMessage("I need help with categorization - get Tag involved")}
                    className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm transition-colors"
                  >
                    🏷️ Connect me with Tag (Smart Categories)
                  </button>
                  <button
                    onClick={() => sendMessage("Show me all available AI employees and their specialties")}
                    className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm transition-colors"
                  >
                    👥 Show me the full AI team
                  </button>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 px-3 py-2 rounded-lg border border-white/20">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <Brain className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-green-400" />
                    <span className="text-xs text-white/70">Prime is coordinating...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                placeholder="Ask Prime anything or request a specialist..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => !isLoading && sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Prime Chat Toggle Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-white z-40 transition-all duration-200 ${
          isChatOpen ? 'opacity-50' : ''
        }`}
        title="Chat with Prime - AI Team Coordinator"
      >
        <span className="text-white text-lg">👑</span>
      </button>
    </>
  );
} 