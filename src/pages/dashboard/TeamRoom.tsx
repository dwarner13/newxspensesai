import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import DashboardHeader from '../../components/ui/DashboardHeader';
import { 
  Users, 
  Play, 
  Pause, 
  Trash2, 
  Send, 
  Settings, 
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Info,
  Wrench,
  Hand,
  Lightbulb,
  AlertTriangle,
  FileText,
  BarChart3,
  FileSpreadsheet,
  FileImage,
  Tag,
  TrendingUp,
  ArrowRight,
  MessageCircle,
  Activity
} from 'lucide-react';
import { useTeamRoomStore } from '../../store/teamRoom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

const TeamRoom: React.FC = () => {
  console.log('TeamRoom component rendering...');
  
  const {
    status,
    agents,
    messages,
    tasks,
    memory,
    routeMode,
    directTarget,
    initSeed,
    toggleAgent,
    sendMessage,
    simulate,
    pause,
    clear,
    setTaskStatus,
    loadMemory,
    loadTasks
  } = useTeamRoomStore();
  
  console.log('TeamRoom store data:', { status, agents: agents?.length, messages: messages?.length });

  const [messageText, setMessageText] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    console.log('TeamRoom useEffect running...');
    initSeed();
    loadMemory();
    loadTasks();
  }, []); // Remove dependencies to run only once

  const departments = [
    { id: 'command', name: 'Command & Orchestration', agents: agents?.filter((a: any) => a.dept === 'Command') || [] },
    { id: 'core', name: 'Core Finance Ops', agents: agents?.filter((a: any) => a.dept === 'Core') || [] },
    { id: 'planning', name: 'Planning & Guidance', agents: agents?.filter((a: any) => a.dept === 'Planning') || [] },
    { id: 'biz', name: 'Business & Analytics', agents: agents?.filter((a: any) => a.dept === 'Biz') || [] },
    { id: 'wellness', name: 'Entertainment & Wellness', agents: agents?.filter((a: any) => a.dept === 'Wellness') || [] },
    { id: 'voices', name: 'Podcast Personalities', agents: agents?.filter((a: any) => a.dept === 'Voices') || [] }
  ];

  const taskTemplates = [
    'Parse new statement',
    'Auto-categorize',
    'Forecast next month',
    'Find deductions',
    'Plan debt snowball',
    'Bill audit',
    'Generate weekly podcast',
    'BI snapshot'
  ];

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    
    sendMessage(messageText);
    setMessageText('');
  };

  // Simulate AI team activity
  const simulateTeamActivity = () => {
    if (isSimulating) return;
    
    setIsSimulating(true);
    const activities = [
      { agent: 'Prime', action: 'Coordinating team workflow', emoji: '👑' },
      { agent: 'Byte', action: 'Processing new statement upload', emoji: '📄' },
      { agent: 'Crystal', action: 'Analyzing spending patterns', emoji: '🔮' },
      { agent: 'Tag', action: 'Categorizing transactions', emoji: '🏷️' },
      { agent: 'Ledger', action: 'Calculating tax implications', emoji: '📊' },
      { agent: 'Chime', action: 'Sending bill reminders', emoji: '🔔' },
      { agent: 'Finley', action: 'Updating budget forecasts', emoji: '💰' },
      { agent: 'Crystal', action: 'Generating insights report', emoji: '📈' }
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < activities.length) {
        const activity = activities[index];
        const message = {
          id: Date.now() + index,
          from: activity.agent.toLowerCase(),
          text: `${activity.emoji} ${activity.action}`,
          ts: new Date().toISOString(),
          kind: 'action',
          confidence: 0.9 + Math.random() * 0.1
        };
        
        // Add message to store (this would be handled by the store)
        console.log('AI Activity:', message);
        index++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 2000);
  };

  const handleTemplateSelect = (template: string) => {
    setMessageText(template);
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getMessageIcon = (kind: string) => {
    switch (kind) {
      case 'handoff': return <Hand className="w-4 h-4" />;
      case 'insight': return <Lightbulb className="w-4 h-4" />;
      case 'tool': return <Wrench className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getMessageColor = (kind: string) => {
    switch (kind) {
      case 'handoff': return 'text-blue-400';
      case 'insight': return 'text-green-400';
      case 'tool': return 'text-purple-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'in-progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'done': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const systemsHealth = agents && agents.length > 0
    ? Math.round((agents.filter((a: any) => a.active).length / agents.length) * 100)
    : 0;

  // Early return for debugging
  if (!agents || agents.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-3 pt-4">
        <MobilePageTitle 
          title="Team Room" 
          subtitle="Collaborate with your AI financial team"
        />
        <div className="text-center mt-8">
          <h1 className="text-2xl font-bold text-white mb-4">Team Room Loading...</h1>
          <p className="text-white/70">Initializing AI team...</p>
          <button 
            onClick={() => initSeed()}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Initialize Team
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 pt-4">
      {/* Page Title */}
      <MobilePageTitle 
        title="Team Room" 
        subtitle="Collaborate with your AI financial team"
      />
      
      {/* Content */}
      <div>
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                    AI Command Center
                  </h1>
                  <p className="text-white/60 text-lg mt-2">
                    Orchestrate your 30-member AI enterprise in real-time
                  </p>
                </div>
              </div>
            </div>
            
            {/* Status Cards */}
            <div className="flex flex-wrap gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 min-w-[200px]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-white font-semibold">Team Status</span>
                </div>
                <div className="text-2xl font-bold text-white">{agents?.filter(a => a.active).length || 0} Active</div>
                <div className="text-white/60 text-sm">of {agents?.length || 0} AI Employees</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 min-w-[200px]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-white font-semibold">System Health</span>
                </div>
                <div className="text-2xl font-bold text-white">{systemsHealth}%</div>
                <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-cyan-400 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${systemsHealth}%` }}
                  ></div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column - AI Team Roster */}
          <div className="xl:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">AI Team Roster</h3>
                  <p className="text-white/60 text-sm">30 specialized AI employees</p>
                </div>
              </div>
              
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {departments.map((dept, deptIndex) => (
                    <motion.div
                      key={dept.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + deptIndex * 0.1 }}
                      className="bg-white/5 rounded-xl p-4 border border-white/10"
                    >
                      <button
                        onClick={() => toggleSection(dept.id)}
                        className="flex items-center justify-between w-full p-2 text-left hover:bg-white/10 rounded-lg transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
                          <span className="text-white font-semibold group-hover:text-purple-200 transition-colors">
                            {dept.name}
                          </span>
                          <span className="text-white/40 text-sm">({dept.agents.length})</span>
                        </div>
                        {collapsedSections[dept.id] ? (
                          <ChevronDown className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                        )}
                      </button>
                      
                      <AnimatePresence>
                        {!collapsedSections[dept.id] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 mt-4"
                          >
                            {dept.agents.map((agent, index) => (
                              <motion.div
                                key={agent.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * index }}
                                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-200 group"
                              >
                                <div 
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg"
                                  style={{ backgroundColor: agent.color + '20' }}
                                >
                                  {agent.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-medium truncate">{agent.name}</span>
                                    <div className={`w-2 h-2 rounded-full ${agent.active ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                                  </div>
                                  <p className="text-white/60 text-xs truncate">{agent.role}</p>
                                </div>
                                <Switch
                                  checked={agent.active}
                                  onCheckedChange={() => toggleAgent(agent.id)}
                                  className="data-[state=checked]:bg-green-600"
                                />
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          </div>

          {/* Center Column - Collaboration Feed */}
          <div className="xl:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Live Collaboration</h3>
                    <p className="text-white/60 text-sm">Real-time AI team coordination</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={simulateTeamActivity}
                    disabled={isSimulating}
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isSimulating ? 'AI Team Working...' : 'Watch AI Team Work'}
                  </Button>
                  <Button
                    onClick={simulate}
                    disabled={status === 'running'}
                    size="sm"
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Simulation
                  </Button>
                  <Button
                    onClick={pause}
                    disabled={status !== 'running'}
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                  <Button
                    onClick={clear}
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                      Task Templates
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-800 border-white/20">
                    {taskTemplates.map((template) => (
                      <DropdownMenuItem
                        key={template}
                        onClick={() => handleTemplateSelect(template)}
                        className="text-white hover:bg-white/10"
                      >
                        {template}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {/* Sample AI Team Activity Messages */}
                  {!messages || messages.length === 0 ? (
                    <div className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg shadow-lg">
                            👑
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-white font-semibold">Prime</span>
                              <span className="text-white/40 text-xs">
                                {new Date().toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-white/80 text-sm mb-3 leading-relaxed">
                              🚀 Initializing AI team coordination. All 30 AI employees are ready for action!
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">coordination</span>
                              <span className="px-2 py-1 bg-pink-500/20 text-pink-300 text-xs rounded-full">initialization</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl p-4 border border-cyan-500/30"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-lg shadow-lg">
                            📄
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-white font-semibold">Byte</span>
                              <ArrowRight className="w-4 h-4 text-white/50" />
                              <span className="text-white/70 font-medium">OCR Processing</span>
                              <span className="text-white/40 text-xs">
                                {new Date(Date.now() - 30000).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-white/80 text-sm mb-3 leading-relaxed">
                              📊 Processing Chase statement upload. Extracting transaction data with 98% accuracy...
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded-full">ocr</span>
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">processing</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-white/20 rounded-full h-1.5">
                                  <div className="bg-gradient-to-r from-cyan-400 to-blue-400 h-1.5 rounded-full w-4/5"></div>
                                </div>
                                <span className="text-xs text-white/50 font-medium">98%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-xl p-4 border border-emerald-500/30"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-lg shadow-lg">
                            🏷️
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-white font-semibold">Tag</span>
                              <ArrowRight className="w-4 h-4 text-white/50" />
                              <span className="text-white/70 font-medium">Categorization</span>
                              <span className="text-white/40 text-xs">
                                {new Date(Date.now() - 60000).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-white/80 text-sm mb-3 leading-relaxed">
                              🎯 Auto-categorizing 47 transactions. Detected recurring patterns and merchant relationships...
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full">categorization</span>
                              <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">ai-learning</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-white/20 rounded-full h-1.5">
                                  <div className="bg-gradient-to-r from-emerald-400 to-green-400 h-1.5 rounded-full w-3/4"></div>
                                </div>
                                <span className="text-xs text-white/50 font-medium">78%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4 border border-orange-500/30"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-lg shadow-lg">
                            📊
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-white font-semibold">Ledger</span>
                              <ArrowRight className="w-4 h-4 text-white/50" />
                              <span className="text-white/70 font-medium">Tax Analysis</span>
                              <span className="text-white/40 text-xs">
                                {new Date(Date.now() - 90000).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-white/80 text-sm mb-3 leading-relaxed">
                              💰 Calculating tax implications for Q4. Found 3 potential deductions worth $1,247...
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full">tax-analysis</span>
                              <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">deductions</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-white/20 rounded-full h-1.5">
                                  <div className="bg-gradient-to-r from-orange-400 to-red-400 h-1.5 rounded-full w-1/2"></div>
                                </div>
                                <span className="text-xs text-white/50 font-medium">52%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  ) : (
                    messages?.map((message, index) => {
                    const fromAgent = agents?.find(a => a.id === message.from);
                    const toAgent = message.to ? agents?.find(a => a.id === message.to) : null;
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-200 group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div 
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-lg shadow-lg"
                              style={{ backgroundColor: fromAgent?.color + '20' }}
                            >
                              {fromAgent?.emoji}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-white font-semibold">{fromAgent?.name}</span>
                              {toAgent && (
                                <>
                                  <ArrowRight className="w-4 h-4 text-white/50" />
                                  <span className="text-white/70 font-medium">{toAgent.name}</span>
                                </>
                              )}
                              <span className="text-white/40 text-xs ml-auto">
                                {new Date(message.ts).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-white/80 text-sm mb-3 leading-relaxed">{message.text}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              {message.tags?.map((tag) => (
                                <span 
                                  key={tag}
                                  className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                              <div className="flex items-center gap-2">
                                {getMessageIcon(message.kind)}
                                <span className={`text-xs font-medium ${getMessageColor(message.kind)}`}>
                                  {message.kind}
                                </span>
                              </div>
                              {message.confidence && (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-white/20 rounded-full h-1.5">
                                    <div 
                                      className="bg-gradient-to-r from-green-400 to-cyan-400 h-1.5 rounded-full transition-all duration-1000"
                                      style={{ width: `${message.confidence * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-white/50 font-medium">
                                    {Math.round(message.confidence * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                </div>
              </ScrollArea>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <Switch
                    checked={routeMode === 'manager'}
                    onCheckedChange={() => {
                      // This would be handled by the store
                    }}
                    className="data-[state=checked]:bg-purple-600"
                  />
                  <span className="text-white/80 text-sm font-medium">
                    Route Mode: {routeMode === 'manager' ? 'Prime (Manager)' : 'Direct'}
                  </span>
                </div>
                
                {routeMode === 'direct' && (
                  <Select value={directTarget} onValueChange={() => {
                    // This would be handled by the store
                  }}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Choose agent..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      {agents?.filter(a => a.active).map((agent) => (
                        <SelectItem key={agent.id} value={agent.id} className="text-white hover:bg-white/10">
                          {agent.emoji} {agent.name} - {agent.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                <div className="flex gap-3">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Ask Prime or message an agent..."
                    className="flex-1 bg-white/5 border-white/20 text-white placeholder-white/50 focus:border-purple-400"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!messageText.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Memory / Tasks / Tools */}
          <div className="xl:col-span-1 space-y-6">
            {/* Shared Memory */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Shared Memory</h3>
                  <p className="text-white/60 text-sm">Team knowledge base</p>
                </div>
              </div>
              
              <Tabs defaultValue="session" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-white/5 border-white/20">
                  <TabsTrigger value="session" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Session</TabsTrigger>
                  <TabsTrigger value="longterm" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Long-term</TabsTrigger>
                  <TabsTrigger value="vendors" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Vendors</TabsTrigger>
                </TabsList>
                
                <TabsContent value="session" className="space-y-3 mt-4">
                  {memory?.session?.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <span className="text-white/70 text-sm font-medium">{item.key}:</span>
                        <span className="text-white text-sm ml-2">{JSON.stringify(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="longterm" className="space-y-3 mt-4">
                  {memory?.longterm?.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <span className="text-white/70 text-sm font-medium">{item.key}:</span>
                        <span className="text-white text-sm ml-2">{JSON.stringify(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="vendors" className="space-y-3 mt-4">
                  {memory?.vendors?.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <span className="text-white/70 text-sm font-medium">{item.key}:</span>
                        <span className="text-white text-sm ml-2">{JSON.stringify(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Open Tasks */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Open Tasks</h3>
                  <p className="text-white/60 text-sm">Active assignments</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {tasks?.map((task, index) => {
                  const assignee = agents?.find(a => a.id === task.assignee);
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 + index * 0.1 }}
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm mb-2">{task.title}</p>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          <span className="text-white/50 text-xs flex items-center gap-1">
                            {assignee?.emoji} {assignee?.name}
                          </span>
                        </div>
                      </div>
                      <Select
                        value={task.status}
                        onValueChange={(value: any) => setTaskStatus(task.id, value)}
                      >
                        <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-white/20">
                          <SelectItem value="queued" className="text-white hover:bg-white/10">Queued</SelectItem>
                          <SelectItem value="in-progress" className="text-white hover:bg-white/10">In Progress</SelectItem>
                          <SelectItem value="done" className="text-white hover:bg-white/10">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Tools */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">AI Tools</h3>
                  <p className="text-white/60 text-sm">Quick actions</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="sm" className="justify-start bg-white/5 border-white/20 text-white hover:bg-white/10 h-12">
                  <FileImage className="w-4 h-4 mr-2" />
                  Parse OCR
                </Button>
                <Button variant="outline" size="sm" className="justify-start bg-white/5 border-white/20 text-white hover:bg-white/10 h-12">
                  <Tag className="w-4 h-4 mr-2" />
                  Categorize
                </Button>
                <Button variant="outline" size="sm" className="justify-start bg-white/5 border-white/20 text-white hover:bg-white/10 h-12">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Forecast
                </Button>
                <Button variant="outline" size="sm" className="justify-start bg-white/5 border-white/20 text-white hover:bg-white/10 h-12">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" className="justify-start bg-white/5 border-white/20 text-white hover:bg-white/10 h-12">
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" size="sm" className="justify-start bg-white/5 border-white/20 text-white hover:bg-white/10 h-12">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  BI Snapshot
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamRoom;
