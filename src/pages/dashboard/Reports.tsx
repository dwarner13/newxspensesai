import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  Filter,
  DollarSign,
  Menu,
  FileText,
  Bot,
  Shield,
  Target,
  Zap,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  Activity,
  Brain,
  Users,
  MessageCircle,
  Play,
  RefreshCw,
  Settings,
  Share2,
  Mail,
  Printer,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Report Interfaces
interface Report {
  id: string;
  title: string;
  description: string;
  category: 'financial' | 'ai' | 'tax' | 'business' | 'custom';
  type: 'summary' | 'detailed' | 'forecast' | 'analysis';
  lastGenerated: string;
  status: 'ready' | 'generating' | 'error';
  size: string;
  format: 'pdf' | 'csv' | 'excel' | 'json';
  aiInsights?: number;
  accuracy?: number;
  dataPoints?: number;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  estimatedTime: string;
  aiPowered: boolean;
  customizable: boolean;
}

interface ReportMetrics {
  totalReports: number;
  aiGenerated: number;
  accuracy: number;
  timeSaved: number;
  insightsGenerated: number;
  lastUpdated: string;
}

export default function Reports() {
  console.log('🚀🚀🚀 LOADING REPORTS DASHBOARD - Complete Analytics & Insights!');
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('6m');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  // Report Templates
  const reportTemplates: ReportTemplate[] = [
    {
      id: 'financial-overview',
      name: 'Financial Overview',
      description: 'Complete income, expenses, and profit analysis',
      icon: '📊',
      category: 'financial',
      estimatedTime: '2 minutes',
      aiPowered: true,
      customizable: true
    },
    {
      id: 'ai-insights',
      name: 'AI Insights Report',
      description: 'AI-powered analysis and recommendations',
      icon: '🤖',
      category: 'ai',
      estimatedTime: '3 minutes',
      aiPowered: true,
      customizable: true
    },
    {
      id: 'tax-summary',
      name: 'Tax Preparation Summary',
      description: 'Complete tax-ready financial summary',
      icon: '📋',
      category: 'tax',
      estimatedTime: '4 minutes',
      aiPowered: true,
      customizable: false
    },
    {
      id: 'business-intelligence',
      name: 'Business Intelligence',
      description: 'Strategic insights and performance metrics',
      icon: '🎯',
      category: 'business',
      estimatedTime: '5 minutes',
      aiPowered: true,
      customizable: true
    },
    {
      id: 'cash-flow',
      name: 'Cash Flow Analysis',
      description: 'Detailed cash flow and liquidity analysis',
      icon: '💧',
      category: 'financial',
      estimatedTime: '2 minutes',
      aiPowered: false,
      customizable: true
    },
    {
      id: 'expense-breakdown',
      name: 'Expense Breakdown',
      description: 'Categorized expense analysis and trends',
      icon: '📈',
      category: 'financial',
      estimatedTime: '1 minute',
      aiPowered: true,
      customizable: true
    }
  ];

  // Recent Reports
  const [recentReports, setRecentReports] = useState<Report[]>([
    {
      id: '1',
      title: 'Monthly Financial Summary',
      description: 'Complete overview of January 2024 finances',
      category: 'financial',
      type: 'summary',
      lastGenerated: '2 hours ago',
      status: 'ready',
      size: '2.3 MB',
      format: 'pdf',
      aiInsights: 12,
      accuracy: 98,
      dataPoints: 1247
    },
    {
      id: '2',
      title: 'AI Tax Optimization Report',
      description: 'AI-powered tax deduction recommendations',
      category: 'tax',
      type: 'analysis',
      lastGenerated: '1 day ago',
      status: 'ready',
      size: '1.8 MB',
      format: 'pdf',
      aiInsights: 8,
      accuracy: 96,
      dataPoints: 892
    },
    {
      id: '3',
      title: 'Q4 Business Intelligence',
      description: 'Strategic insights and growth analysis',
      category: 'business',
      type: 'detailed',
      lastGenerated: '3 days ago',
      status: 'ready',
      size: '4.1 MB',
      format: 'excel',
      aiInsights: 15,
      accuracy: 94,
      dataPoints: 2156
    },
    {
      id: '4',
      title: 'Expense Pattern Analysis',
      description: 'AI-detected spending patterns and anomalies',
      category: 'ai',
      type: 'analysis',
      lastGenerated: '1 week ago',
      status: 'ready',
      size: '1.2 MB',
      format: 'pdf',
      aiInsights: 6,
      accuracy: 97,
      dataPoints: 634
    }
  ]);

  // Report Metrics
  const [reportMetrics, setReportMetrics] = useState<ReportMetrics>({
    totalReports: 47,
    aiGenerated: 32,
    accuracy: 96.5,
    timeSaved: 127,
    insightsGenerated: 156,
    lastUpdated: '2 minutes ago'
  });

  const reportSections = [
    { key: 'overview', label: 'Report Overview', icon: BarChart3, color: 'from-blue-500 to-cyan-500' },
    { key: 'templates', label: 'Report Templates', icon: FileText, color: 'from-green-500 to-emerald-500' },
    { key: 'recent', label: 'Recent Reports', icon: Clock, color: 'from-purple-500 to-pink-500' },
    { key: 'ai', label: 'AI Reports', icon: Bot, color: 'from-orange-500 to-red-500' },
    { key: 'financial', label: 'Financial Reports', icon: DollarSign, color: 'from-yellow-500 to-amber-500' },
    { key: 'tax', label: 'Tax Reports', icon: Shield, color: 'from-indigo-500 to-blue-500' },
    { key: 'business', label: 'Business Intelligence', icon: Target, color: 'from-pink-500 to-rose-500' },
    { key: 'custom', label: 'Custom Reports', icon: Settings, color: 'from-gray-500 to-slate-500' }
  ];

  const handleGenerateReport = async (templateId: string) => {
    setIsGenerating(true);
    // Simulate report generation
    setTimeout(() => {
      const newReport: Report = {
        id: Date.now().toString(),
        title: reportTemplates.find(t => t.id === templateId)?.name || 'New Report',
        description: reportTemplates.find(t => t.id === templateId)?.description || '',
        category: reportTemplates.find(t => t.id === templateId)?.category as any || 'custom',
        type: 'summary',
        lastGenerated: 'Just now',
        status: 'ready',
        size: '1.5 MB',
        format: 'pdf',
        aiInsights: Math.floor(Math.random() * 20) + 5,
        accuracy: 95 + Math.random() * 4,
        dataPoints: Math.floor(Math.random() * 2000) + 500
      };
      setRecentReports(prev => [newReport, ...prev]);
      setIsGenerating(false);
    }, 2000);
  };

  const handleDownloadReport = (reportId: string) => {
    console.log('Downloading report:', reportId);
    // Download logic here
  };

  const handleShareReport = (reportId: string) => {
    console.log('Sharing report:', reportId);
    // Share logic here
  };

  const handleSelectReport = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-400';
      case 'generating': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return CheckCircle;
      case 'generating': return RefreshCw;
      case 'error': return AlertTriangle;
      default: return Clock;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pt-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">📊 Reports & Analytics</h1>
            <p className="text-white/70 text-sm sm:text-base">Comprehensive insights and end results for your business</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">AI Reports Active</span>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-3 mb-8"
      >
        {reportSections.map(({ key, label, icon: Icon, color }) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === key
                ? 'bg-indigo-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </motion.button>
        ))}
      </motion.div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Report Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Reports</p>
                  <p className="text-2xl font-bold text-white">{reportMetrics.totalReports}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">AI Generated</p>
                  <p className="text-2xl font-bold text-white">{reportMetrics.aiGenerated}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Bot className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Accuracy Rate</p>
                  <p className="text-2xl font-bold text-white">{reportMetrics.accuracy}%</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Time Saved</p>
                  <p className="text-2xl font-bold text-white">{reportMetrics.timeSaved}h</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center gap-3 p-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors">
                <Bot className="w-5 h-5 text-indigo-400" />
                <div className="text-left">
                  <p className="text-white font-medium">Generate AI Report</p>
                  <p className="text-white/60 text-sm">Create intelligent analysis</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-colors">
                <Download className="w-5 h-5 text-green-400" />
                <div className="text-left">
                  <p className="text-white font-medium">Export All Reports</p>
                  <p className="text-white/60 text-sm">Download in bulk</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <p className="text-white font-medium">Custom Report</p>
                  <p className="text-white/60 text-sm">Build your own</p>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Report Templates Section */}
      {activeSection === 'templates' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Report Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reportTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/5 rounded-lg border border-white/10 p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-2xl">{template.icon}</div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{template.name}</h4>
                      <p className="text-white/60 text-sm">{template.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-3 h-3 text-white/60" />
                    <span className="text-white/60 text-xs">{template.estimatedTime}</span>
                    {template.aiPowered && (
                      <div className="flex items-center gap-1">
                        <Bot className="w-3 h-3 text-purple-400" />
                        <span className="text-purple-400 text-xs">AI Powered</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60 capitalize">{template.category}</span>
                    <button
                      onClick={() => handleGenerateReport(template.id)}
                      disabled={isGenerating}
                      className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded text-sm transition-colors"
                    >
                      {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Reports Section */}
      {activeSection === 'recent' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Recent Reports</h3>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition-colors">
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </button>
                <button className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm transition-colors">
                  <Download className="w-4 h-4 mr-1" />
                  Export All
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {recentReports.map((report) => {
                const StatusIcon = getStatusIcon(report.status);
                return (
                  <motion.div
                    key={report.id}
                    whileHover={{ scale: 1.01 }}
                    className={`bg-white/5 rounded-lg border border-white/10 p-4 ${
                      selectedReports.includes(report.id) ? 'ring-2 ring-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedReports.includes(report.id)}
                          onChange={() => handleSelectReport(report.id)}
                          className="w-4 h-4 text-indigo-600 bg-white/10 border-white/20 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-medium">{report.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded ${
                              report.category === 'financial' ? 'bg-blue-500/20 text-blue-400' :
                              report.category === 'ai' ? 'bg-purple-500/20 text-purple-400' :
                              report.category === 'tax' ? 'bg-green-500/20 text-green-400' :
                              'bg-orange-500/20 text-orange-400'
                            }`}>
                              {report.category}
                            </span>
                          </div>
                          <p className="text-white/60 text-sm mb-2">{report.description}</p>
                          <div className="flex items-center gap-4 text-xs text-white/60">
                            <span>Generated: {report.lastGenerated}</span>
                            <span>Size: {report.size}</span>
                            <span className="uppercase">{report.format}</span>
                            {report.aiInsights && <span>AI Insights: {report.aiInsights}</span>}
                            {report.accuracy && <span>Accuracy: {report.accuracy}%</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <StatusIcon className={`w-4 h-4 ${getStatusColor(report.status)}`} />
                          <span className={`text-xs ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDownloadReport(report.id)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            <Download className="w-4 h-4 text-white/60" />
                          </button>
                          <button
                            onClick={() => handleShareReport(report.id)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            <Share2 className="w-4 h-4 text-white/60" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Reports Section */}
      {activeSection === 'ai' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">AI-Powered Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Bot className="w-6 h-6 text-purple-400" />
                  <h4 className="text-white font-medium">AI Insights Report</h4>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  Comprehensive AI analysis of your financial data with intelligent recommendations and pattern recognition.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-400">156 insights generated</span>
                  <button className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm transition-colors">
                    Generate
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Brain className="w-6 h-6 text-blue-400" />
                  <h4 className="text-white font-medium">Predictive Analytics</h4>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  Future forecasting and trend analysis powered by advanced AI algorithms and machine learning.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-400">94% accuracy rate</span>
                  <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors">
                    Generate
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Target className="w-6 h-6 text-green-400" />
                  <h4 className="text-white font-medium">Optimization Report</h4>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  AI-driven recommendations for cost reduction, revenue optimization, and process improvement.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-400">$3,200 potential savings</span>
                  <button className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors">
                    Generate
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                  <h4 className="text-white font-medium">Anomaly Detection</h4>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  AI-powered detection of unusual patterns, potential fraud, and data inconsistencies.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-orange-400">3 anomalies detected</span>
                  <button className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm transition-colors">
                    Generate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Other sections placeholder */}
      {!['overview', 'templates', 'recent', 'ai'].includes(activeSection) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8 text-center"
        >
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {activeSection === 'financial' && 'Financial Reports Coming Soon'}
            {activeSection === 'tax' && 'Tax Reports Coming Soon'}
            {activeSection === 'business' && 'Business Intelligence Coming Soon'}
            {activeSection === 'custom' && 'Custom Reports Coming Soon'}
          </h3>
          <p className="text-white/70">
            This section is being enhanced with advanced reporting capabilities. Stay tuned!
          </p>
        </motion.div>
      )}
    </div>
  );
}
