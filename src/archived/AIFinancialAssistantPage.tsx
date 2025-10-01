import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  MessageCircle, 
  Send, 
  Upload, 
  Mic, 
  MicOff, 
  User, 
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  DollarSign,
  Target,
  Brain,
  Zap,
  Bell,
  CreditCard,
  PiggyBank,
  BarChart3,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  Settings,
  X,
  Minimize2,
  Maximize2,
  FileText,
  Calculator,
  Lightbulb,
  Award,
  ArrowRight,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  category: string;
  status: 'upcoming' | 'overdue' | 'paid';
  reminder: boolean;
}

interface Debt {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  strategy: 'avalanche' | 'snowball';
  progress: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  dueDate?: Date;
  category: string;
}

export default function AIFinancialAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your AI Financial Assistant. I'm here to help you manage your finances, track bills, plan debt payoff, and provide personalized insights. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'bills' | 'debt' | 'insights' | 'tasks'>('chat');
  const [isMinimized, setIsMinimized] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock data
  const bills: Bill[] = [
    {
      id: '1',
      name: 'Rent',
      amount: 1200,
      dueDate: new Date(2024, 0, 15),
      category: 'Housing',
      status: 'upcoming',
      reminder: true
    },
    {
      id: '2',
      name: 'Electric Bill',
      amount: 85,
      dueDate: new Date(2024, 0, 10),
      category: 'Utilities',
      status: 'overdue',
      reminder: true
    },
    {
      id: '3',
      name: 'Internet',
      amount: 65,
      dueDate: new Date(2024, 0, 20),
      category: 'Utilities',
      status: 'upcoming',
      reminder: false
    }
  ];

  const debts: Debt[] = [
    {
      id: '1',
      name: 'Credit Card',
      balance: 2500,
      interestRate: 18.99,
      minimumPayment: 75,
      strategy: 'avalanche',
      progress: 60
    },
    {
      id: '2',
      name: 'Student Loan',
      balance: 15000,
      interestRate: 5.5,
      minimumPayment: 200,
      strategy: 'avalanche',
      progress: 25
    }
  ];

  const tasks: Task[] = [
    {
      id: '1',
      title: 'Review monthly budget',
      description: 'Analyze spending patterns and adjust budget categories',
      priority: 'high',
      status: 'pending',
      dueDate: new Date(2024, 0, 5),
      category: 'Budgeting'
    },
    {
      id: '2',
      title: 'Set up emergency fund',
      description: 'Transfer $500 to emergency savings account',
      priority: 'medium',
      status: 'pending',
      dueDate: new Date(2024, 0, 10),
      category: 'Savings'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputMessage);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const generateAIResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('bill') || lowerMessage.includes('payment')) {
      return "I can help you track your bills! You have 2 upcoming bills totaling $1,265. Would you like me to set up reminders for any of them?";
    }
    
    if (lowerMessage.includes('debt') || lowerMessage.includes('loan')) {
      return "I see you have $17,500 in total debt. I recommend the avalanche method to save on interest. Would you like me to create a payoff plan?";
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('spending')) {
      return "Your current spending is 15% above your budget. I can help you identify areas to cut back. Would you like to see a detailed breakdown?";
    }
    
    if (lowerMessage.includes('save') || lowerMessage.includes('emergency')) {
      return "Great idea! I recommend saving 3-6 months of expenses. You're currently at 1.5 months. Would you like me to help you set up automatic transfers?";
    }
    
    return "I understand you're asking about that. Let me help you with that. Could you provide a bit more context so I can give you the most accurate assistance?";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    // TODO: Implement voice recognition
  };

  const getTotalDebt = () => {
    return debts.reduce((total, debt) => total + debt.balance, 0);
  };

  const getOverdueBills = () => {
    return bills.filter(bill => bill.status === 'overdue');
  };

  const getUpcomingBills = () => {
    return bills.filter(bill => bill.status === 'upcoming');
  };

  const getPendingTasks = () => {
    return tasks.filter(task => task.status === 'pending');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              AI Financial Assistant
            </h1>
            <p className="text-xl text-gray-300">
              Your personal AI-powered financial advisor
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chat Interface */}
            <div className="lg:col-span-2">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 h-[600px] flex flex-col">
                {/* Chat Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">AI Assistant</h3>
                      <p className="text-gray-400 text-sm">Online</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {isMinimized ? <Maximize2 size={20} /> : <Minimize2 size={20} />}
                    </button>
                    <button className="p-2 text-gray-400 hover:text-white transition-colors">
                      <Settings size={20} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] ${message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'} rounded-2xl px-4 py-3`}>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div
                      className="flex justify-start"
                    >
                      <div className="bg-gray-700 text-white rounded-2xl px-4 py-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything about your finances..."
                      className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={toggleVoiceInput}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 ${isListening ? 'text-red-500' : 'text-gray-400'} hover:text-white transition-colors`}
                    >
                      {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:to-green-700 transition-all">
                    <div className="flex items-center justify-between">
                      <span>Pay Bills</span>
                      <DollarSign size={20} />
                    </div>
                  </button>
                  <button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all">
                    <div className="flex items-center justify-between">
                      <span>Track Debt</span>
                      <CreditCard size={20} />
                    </div>
                  </button>
                  <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all">
                    <div className="flex items-center justify-between">
                      <span>View Insights</span>
                      <BarChart3 size={20} />
                    </div>
                  </button>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Financial Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Debt</span>
                    <span className="text-red-400 font-semibold">${getTotalDebt().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Upcoming Bills</span>
                    <span className="text-yellow-400 font-semibold">{getUpcomingBills().length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Overdue Bills</span>
                    <span className="text-red-400 font-semibold">{getOverdueBills().length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Pending Tasks</span>
                    <span className="text-blue-400 font-semibold">{getPendingTasks().length}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300 text-sm">Bill reminder set</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-300 text-sm">Budget updated</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-300 text-sm">Debt payment scheduled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 