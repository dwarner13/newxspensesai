import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  DollarSign, 
  Mic, 
  MicOff, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Building, 
  User, 
  Tag, 
  FileText, 
  Sparkles, 
  Zap, 
  Lightbulb, 
  TrendingUp, 
  Shield, 
  Star,
  Edit3,
  RotateCcw,
  Save,
  Plus,
  ChevronDown,
  ChevronRight,
  Volume2,
  VolumeX,
  Settings,
  HelpCircle,
  Info,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  DollarSign as DollarSignIcon,
  Building as BuildingIcon,
  User as UserIcon,
  Tag as TagIcon,
  FileText as FileTextIcon,
  Sparkles as SparklesIcon,
  Zap as ZapIcon,
  Lightbulb as LightbulbIcon,
  TrendingUp as TrendingUpIcon,
  Shield as ShieldIcon,
  Star as StarIcon,
  Edit3 as Edit3Icon,
  RotateCcw as RotateCcwIcon,
  Save as SaveIcon,
  Plus as PlusIcon,
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  Volume2 as Volume2Icon,
  VolumeX as VolumeXIcon,
  Settings as SettingsIcon,
  HelpCircle as HelpCircleIcon,
  Info as InfoIcon,
  Target as TargetIcon,
  BarChart3 as BarChart3Icon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Award as AwardIcon,
  CheckCircle2 as CheckCircle2Icon,
  AlertTriangle as AlertTriangleIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IncomeData {
  amount: number;
  source: string;
  category: string;
  date: string;
  notes: string;
  recurring: boolean;
  frequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  confidence: {
    amount: number;
    source: number;
    category: number;
    date: number;
  };
}

interface AIParsedResult {
  amount: number;
  source: string;
  category: string;
  date: string;
  notes: string;
  recurring: boolean;
  frequency?: string;
  confidence: {
    amount: number;
    source: number;
    category: number;
    date: number;
  };
  suggestions: {
    category: string[];
    source: string[];
  };
  warnings: string[];
  insights: string[];
}

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncomeAdded: (income: IncomeData) => void;
}

const incomeCategories = [
  { 
    value: 'salary', 
    label: 'Salary', 
    icon: <BuildingIcon className="h-4 w-4" />,
    description: 'Regular employment income',
    taxImplication: 'Subject to income tax and payroll deductions'
  },
  { 
    value: 'freelance', 
    label: 'Freelance', 
    icon: <UserIcon className="h-4 w-4" />,
    description: 'Contract or gig work income',
    taxImplication: 'Self-employment tax applies, track expenses'
  },
  { 
    value: 'investment', 
    label: 'Investment', 
    icon: <TrendingUpIcon className="h-4 w-4" />,
    description: 'Dividends, interest, capital gains',
    taxImplication: 'Different tax rates for different investment types'
  },
  { 
    value: 'rental', 
    label: 'Rental Income', 
    icon: <BuildingIcon className="h-4 w-4" />,
    description: 'Property rental income',
    taxImplication: 'Report rental income, deduct expenses'
  },
  { 
    value: 'business', 
    label: 'Business', 
    icon: <TargetIcon className="h-4 w-4" />,
    description: 'Business revenue or profit',
    taxImplication: 'Business income tax, track all business expenses'
  },
  { 
    value: 'other', 
    label: 'Other', 
    icon: <PlusIcon className="h-4 w-4" />,
    description: 'Other income sources',
    taxImplication: 'May be taxable depending on source'
  }
];

const AddIncomeModal: React.FC<AddIncomeModalProps> = ({ isOpen, onClose, onIncomeAdded }) => {
  const [step, setStep] = useState<'input' | 'review' | 'manual'>('input');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<AIParsedResult | null>(null);
  const [incomeData, setIncomeData] = useState<IncomeData>({
    amount: 0,
    source: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    recurring: false,
    confidence: { amount: 0, source: 0, category: 0, date: 0 }
  });
  const [useAISuggestions, setUseAISuggestions] = useState(true);
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNaturalLanguageInput(transcript);
        setIsListening(false);
        handleAIParsing(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error('Voice input failed. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
      toast.success('Listening... Speak now!');
    } else {
      toast.error('Voice input not supported in this browser');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleAIParsing = async (input: string) => {
    setIsProcessing(true);
    try {
      // Simulate AI processing with realistic parsing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const parsed = parseNaturalLanguage(input);
      setAiResult(parsed);
      
      if (useAISuggestions) {
        setIncomeData({
          amount: parsed.amount,
          source: parsed.source,
          category: parsed.category,
          date: parsed.date,
          notes: parsed.notes,
          recurring: parsed.recurring,
          frequency: parsed.frequency as any,
          confidence: parsed.confidence
        });
      }
      
      setStep('review');
    } catch (error) {
      console.error('AI parsing error:', error);
      toast.error('Failed to parse input. Please try manual entry.');
      setStep('manual');
    } finally {
      setIsProcessing(false);
    }
  };

  const parseNaturalLanguage = (input: string): AIParsedResult => {
    const lowerInput = input.toLowerCase();
    
    // Extract amount
    const amountMatch = input.match(/\$?([\d,]+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
    
    // Extract date
    const dateMatch = input.match(/(?:on|received|paid|payment)\s+([a-zA-Z]+\s+\d{1,2}(?:st|nd|rd|th)?)/i);
    let date = new Date().toISOString().split('T')[0];
    if (dateMatch) {
      const dateStr = dateMatch[1];
      // Simple date parsing - in real app, use a proper date library
      const monthMap: { [key: string]: number } = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
      };
      const monthMatch = dateStr.match(/([a-zA-Z]+)/);
      const dayMatch = dateStr.match(/(\d{1,2})/);
      if (monthMatch && dayMatch) {
        const month = monthMap[monthMatch[1].toLowerCase()];
        const day = parseInt(dayMatch[1]);
        const year = new Date().getFullYear();
        date = new Date(year, month, day).toISOString().split('T')[0];
      }
    }
    
    // Extract source
    const sourcePatterns = [
      /(?:from|by|received from)\s+([A-Z][a-zA-Z\s&]+?)(?:\s+on|\s+for|\s*$)/i,
      /(?:payment from)\s+([A-Z][a-zA-Z\s&]+?)(?:\s+on|\s+for|\s*$)/i,
      /([A-Z][a-zA-Z\s&]+?)\s+(?:payment|income|salary)/i
    ];
    let source = '';
    for (const pattern of sourcePatterns) {
      const match = input.match(pattern);
      if (match) {
        source = match[1].trim();
        break;
      }
    }
    
    // Determine category
    let category = 'other';
    if (lowerInput.includes('salary') || lowerInput.includes('payroll') || lowerInput.includes('employment')) {
      category = 'salary';
    } else if (lowerInput.includes('freelance') || lowerInput.includes('contract') || lowerInput.includes('gig')) {
      category = 'freelance';
    } else if (lowerInput.includes('investment') || lowerInput.includes('dividend') || lowerInput.includes('interest')) {
      category = 'investment';
    } else if (lowerInput.includes('rental') || lowerInput.includes('property')) {
      category = 'rental';
    } else if (lowerInput.includes('business') || lowerInput.includes('revenue') || lowerInput.includes('profit')) {
      category = 'business';
    }
    
    // Detect recurring patterns
    const recurring = lowerInput.includes('recurring') || 
                     lowerInput.includes('monthly') || 
                     lowerInput.includes('weekly') || 
                     lowerInput.includes('bi-weekly') ||
                     lowerInput.includes('quarterly') ||
                     lowerInput.includes('yearly');
    
    let frequency: string | undefined;
    if (lowerInput.includes('weekly')) frequency = 'weekly';
    else if (lowerInput.includes('bi-weekly')) frequency = 'bi-weekly';
    else if (lowerInput.includes('monthly')) frequency = 'monthly';
    else if (lowerInput.includes('quarterly')) frequency = 'quarterly';
    else if (lowerInput.includes('yearly')) frequency = 'yearly';
    
    // Generate confidence scores
    const confidence = {
      amount: amount > 0 ? 0.95 : 0.1,
      source: source ? 0.85 : 0.3,
      category: category !== 'other' ? 0.9 : 0.5,
      date: dateMatch ? 0.8 : 0.6
    };
    
    // Generate warnings and insights
    const warnings: string[] = [];
    const insights: string[] = [];
    
    if (amount > 10000) {
      warnings.push('Large amount detected - consider tax implications');
    }
    
    if (category === 'freelance') {
      insights.push('Freelance income may require quarterly tax payments');
    }
    
    if (recurring) {
      insights.push('Recurring income detected - consider setting up automation');
    }
    
    return {
      amount,
      source,
      category,
      date,
      notes: input,
      recurring,
      frequency,
      confidence,
      suggestions: {
        category: [category, 'salary', 'freelance'],
        source: source ? [source, 'Unknown Company', 'Personal'] : ['Unknown Company', 'Personal']
      },
      warnings,
      insights
    };
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="h-4 w-4" />;
    if (confidence >= 0.6) return <AlertCircle className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const handleSubmit = () => {
    if (!incomeData.amount || !incomeData.source || !incomeData.category) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    onIncomeAdded(incomeData);
    toast.success('Income added successfully! 💰');
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setStep('input');
    setNaturalLanguageInput('');
    setIncomeData({
      amount: 0,
      source: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      recurring: false,
      confidence: { amount: 0, source: 0, category: 0, date: 0 }
    });
    setAiResult(null);
    setUseAISuggestions(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Add New Income</h2>
                  <p className="text-sm text-gray-600">AI-powered income tracking with voice and text input</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[60vh]">
              {step === 'input' && (
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">How would you like to add income?</h3>
                    <p className="text-gray-600">Use natural language or voice input for intelligent parsing</p>
                  </div>

                  {/* Input Mode Toggle */}
                  <div className="flex items-center gap-4 mb-6">
                    <button
                      onClick={() => setInputMode('text')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        inputMode === 'text' 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      Text Input
                    </button>
                    <button
                      onClick={() => setInputMode('voice')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        inputMode === 'voice' 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Mic className="h-4 w-4" />
                      Voice Input
                    </button>
                  </div>

                  {/* Natural Language Input */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Describe your income (AI will parse automatically)
                      </label>
                      <div className="relative">
                        <textarea
                          ref={textareaRef}
                          value={naturalLanguageInput}
                          onChange={(e) => setNaturalLanguageInput(e.target.value)}
                          placeholder="e.g., 'Received $2,500 freelance payment from Acme Corp on July 15th' or 'Monthly salary from TechCorp $5,000'"
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                        />
                        {inputMode === 'voice' && (
                          <button
                            onClick={isListening ? stopListening : startListening}
                            className={`absolute right-3 top-3 p-2 rounded-full transition-colors ${
                              isListening 
                                ? 'bg-red-500 text-white animate-pulse' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Try: "Salary $5,000 from Company Inc", "Freelance payment $1,200 from Client ABC", etc.
                      </p>
                    </div>

                    {/* AI Processing Button */}
                    <button
                      onClick={() => handleAIParsing(naturalLanguageInput)}
                      disabled={!naturalLanguageInput.trim() || isProcessing}
                      className="w-full btn-primary flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          AI Processing...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4" />
                          Parse with AI
                        </>
                      )}
                    </button>

                    {/* Manual Entry Option */}
                    <div className="text-center">
                      <button
                        onClick={() => setStep('manual')}
                        className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                      >
                        Or enter manually →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 'review' && aiResult && (
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary-600" />
                      AI Parsing Results
                    </h3>
                    <p className="text-gray-600">Review and adjust the AI-suggested data</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* AI Results */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Parsed Information</h4>
                      
                      {/* Amount */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">Amount</label>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(aiResult.confidence.amount)}`}>
                            {getConfidenceIcon(aiResult.confidence.amount)}
                            {Math.round(aiResult.confidence.amount * 100)}%
                          </div>
                        </div>
                        <input
                          type="number"
                          value={incomeData.amount}
                          onChange={(e) => setIncomeData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {formatCurrency(aiResult.amount)}
                        </p>
                      </div>

                      {/* Source */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">Source</label>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(aiResult.confidence.source)}`}>
                            {getConfidenceIcon(aiResult.confidence.source)}
                            {Math.round(aiResult.confidence.source * 100)}%
                          </div>
                        </div>
                        <input
                          type="text"
                          value={incomeData.source}
                          onChange={(e) => setIncomeData(prev => ({ ...prev, source: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Income source"
                        />
                        {aiResult.suggestions.source.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {aiResult.suggestions.source.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => setIncomeData(prev => ({ ...prev, source: suggestion }))}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Category */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">Category</label>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(aiResult.confidence.category)}`}>
                            {getConfidenceIcon(aiResult.confidence.category)}
                            {Math.round(aiResult.confidence.category * 100)}%
                          </div>
                        </div>
                        <select
                          value={incomeData.category}
                          onChange={(e) => setIncomeData(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Select category</option>
                          {incomeCategories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                        {incomeData.category && (
                          <button
                            onClick={() => setShowCategoryDetails(!showCategoryDetails)}
                            className="text-xs text-primary-600 hover:text-primary-700 mt-1 flex items-center gap-1"
                          >
                            {showCategoryDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            Category details
                          </button>
                        )}
                        {showCategoryDetails && incomeData.category && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                            {(() => {
                              const cat = incomeCategories.find(c => c.value === incomeData.category);
                              return cat ? (
                                <div>
                                  <p className="text-sm text-blue-800 mb-1">{cat.description}</p>
                                  <p className="text-xs text-blue-600">{cat.taxImplication}</p>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">Date</label>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(aiResult.confidence.date)}`}>
                            {getConfidenceIcon(aiResult.confidence.date)}
                            {Math.round(aiResult.confidence.date * 100)}%
                          </div>
                        </div>
                        <input
                          type="date"
                          value={incomeData.date}
                          onChange={(e) => setIncomeData(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(incomeData.date)}
                        </p>
                      </div>
                    </div>

                    {/* AI Insights */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">AI Insights</h4>
                      
                      {/* Warnings */}
                      {aiResult.warnings.length > 0 && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h5 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Warnings
                          </h5>
                          <ul className="space-y-1">
                            {aiResult.warnings.map((warning, index) => (
                              <li key={index} className="text-sm text-yellow-700">• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Insights */}
                      {aiResult.insights.length > 0 && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h5 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Smart Insights
                          </h5>
                          <ul className="space-y-1">
                            {aiResult.insights.map((insight, index) => (
                              <li key={index} className="text-sm text-blue-700">• {insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recurring Detection */}
                      {aiResult.recurring && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <h5 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Recurring Income Detected
                          </h5>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={incomeData.recurring}
                                onChange={(e) => setIncomeData(prev => ({ ...prev, recurring: e.target.checked }))}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-green-700">Mark as recurring income</span>
                            </label>
                            {incomeData.recurring && (
                              <select
                                value={incomeData.frequency || ''}
                                onChange={(e) => setIncomeData(prev => ({ ...prev, frequency: e.target.value as any }))}
                                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              >
                                <option value="">Select frequency</option>
                                <option value="weekly">Weekly</option>
                                <option value="bi-weekly">Bi-weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="yearly">Yearly</option>
                              </select>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea
                          value={incomeData.notes}
                          onChange={(e) => setIncomeData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                          placeholder="Additional notes about this income"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'manual' && (
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Manual Income Entry</h3>
                    <p className="text-gray-600">Enter your income details manually</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <input
                            type="number"
                            value={incomeData.amount}
                            onChange={(e) => setIncomeData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Source *</label>
                        <input
                          type="text"
                          value={incomeData.source}
                          onChange={(e) => setIncomeData(prev => ({ ...prev, source: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="e.g., Company Inc, Client ABC"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                        <select
                          value={incomeData.category}
                          onChange={(e) => setIncomeData(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Select category</option>
                          {incomeCategories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <input
                          type="date"
                          value={incomeData.date}
                          onChange={(e) => setIncomeData(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={incomeData.recurring}
                            onChange={(e) => setIncomeData(prev => ({ ...prev, recurring: e.target.checked }))}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">Recurring income</span>
                        </label>
                      </div>

                      {incomeData.recurring && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                          <select
                            value={incomeData.frequency || ''}
                            onChange={(e) => setIncomeData(prev => ({ ...prev, frequency: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="">Select frequency</option>
                            <option value="weekly">Weekly</option>
                            <option value="bi-weekly">Bi-weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea
                          value={incomeData.notes}
                          onChange={(e) => setIncomeData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                          placeholder="Additional notes"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  if (step === 'review') setStep('input');
                  else if (step === 'manual') setStep('input');
                }}
                className="btn-outline"
              >
                Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="btn-outline"
                >
                  Cancel
                </button>
                
                {(step === 'review' || step === 'manual') && (
                  <button
                    onClick={handleSubmit}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Add Income
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddIncomeModal; 