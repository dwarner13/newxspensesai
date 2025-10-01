import { useState, useEffect, useRef } from 'react';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import { 
  Zap,
  Brain,
  Send,
  Loader2,
  Paperclip,
  Mic,
  Users,
  BarChart3,
  Lightbulb,
  Activity,
  Crown
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface PrimeMessage {
  role: 'user' | 'prime';
  content: string;
  timestamp: string;
}

export default function SmartAutomationPage() {
  const { updateWorkspaceState, getWorkspaceState } = useWorkspace();
  const workspaceId = 'smart-automation';
  
  // Load saved state
  const savedState = getWorkspaceState(workspaceId);
  
  // View state
  const [activeView] = useState(savedState.activeView || 'overview');
  
  // Chat state
  const [messages, setMessages] = useState<PrimeMessage[]>(savedState.messages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: PrimeMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const primeResponse: PrimeMessage = {
        role: 'prime',
        content: getPrimeResponse(message),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, primeResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getPrimeResponse = (_message: string): string => {
    const responses = [
      "I've analyzed your request and created an automation workflow. This will save you approximately 2-3 hours per week and reduce manual errors by 95%.",
      "Perfect! I've set up a smart automation rule that will handle this process automatically. The system will monitor your accounts 24/7 and execute the workflow when conditions are met.",
      "Excellent choice! I've configured an AI-powered automation that will optimize your financial processes. This automation will run continuously and adapt to your spending patterns.",
      "I've created a comprehensive automation strategy for you. This includes multiple workflows that will work together to maximize your financial efficiency and savings.",
      "Great! I've implemented a smart automation system that will handle this task automatically. The AI will learn from your patterns and improve over time."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Save state whenever it changes
  useEffect(() => {
    updateWorkspaceState(workspaceId, {
      activeView,
      messages});
  }, [activeView, messages]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <div className="max-w-7xl mx-auto p-6 pt-32">
        {/* Page Title */}
        <MobilePageTitle 
          title="Smart Automation" 
          subtitle="Automate your financial workflows"
        />
        
        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px]" ref={messagesEndRef}>
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-2xl">
                    <h2
                      className="text-xl font-bold text-white mb-1"
                    >
                      Welcome to Automa's Automation Command Center
                    </h2>
                    <p
                      className="text-white/60 text-sm mb-3"
                    >
                      Your AI-powered strategic command center for automation and workflow optimization
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                      {[
                        { icon: Zap, title: "Smart Automation AI", desc: "Configure automation rules and workflows", color: "from-purple-500 to-violet-500" },
                        { icon: Users, title: "AI Team Manager", desc: "Manage your AI automation team", color: "from-green-500 to-emerald-500" },
                        { icon: BarChart3, title: "Performance Analytics", desc: "View automation performance metrics", color: "from-blue-500 to-cyan-500" },
                        { icon: Crown, title: "Prime Overview", desc: "Strategic automation dashboard", color: "from-yellow-500 to-orange-500" },
                        { icon: Activity, title: "Live Activity", desc: "Real-time automation logs", color: "from-red-500 to-pink-500" },
                        { icon: Lightbulb, title: "Smart Insights", desc: "AI-powered recommendations", color: "from-indigo-500 to-purple-500" }
                      ].map((item, index) => (
                        <button
                          key={item.title}
                          onClick={() => sendMessage(`Help me with ${item.title.toLowerCase()}`)}
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

            {/* High-Tech Input Area */}
            <div className="px-2 pt-1 pb-0.5 border-t border-white/10 bg-gradient-to-r from-purple-500/5 to-cyan-500/5">
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
              <div className="flex gap-1">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                    placeholder="Ask about automation rules, team performance..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 pr-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-sm"
                    disabled={isLoading}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-white/60" />
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
                <button className="p-1.5 hover:bg-white/10 rounded transition-colors">
                  <Mic className="w-3.5 h-3.5 text-white/60" />
                </button>
                <button
                  onClick={() => !isLoading && sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="px-2 py-1.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
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
    </>
  );
}