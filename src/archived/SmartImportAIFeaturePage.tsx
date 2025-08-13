import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Upload, FileText, Camera, Bot, Shield, Zap, Brain, MessageCircle, ArrowRight, CheckCircle, Users, Award, Clock, Star, TrendingUp, Lock, Sparkles, Target, BarChart3, PieChart, CreditCard, Receipt, FileSpreadsheet, Download, Share2, Eye, Search, Filter, Calendar, DollarSign, Percent, ArrowUpRight, CheckCircle2, XCircle, AlertCircle, Info, Play, Pause, RotateCcw, Settings, Bell, User, ChevronRight, ChevronLeft, Plus, Minus, Maximize2, Minimize2, Volume2, VolumeX, SkipBack, SkipForward, Repeat, Shuffle, Heart, ThumbsUp, ThumbsDown, MessageSquare, Phone, Mail, MapPin, Globe, Shield as ShieldIcon, Zap as ZapIcon, Award as AwardIcon, Clock as ClockIcon, Star as StarIcon, TrendingUp as TrendingUpIcon, Lock as LockIcon, Sparkles as SparklesIcon, Target as TargetIcon, BarChart3 as BarChart3Icon, PieChart as PieChartIcon, CreditCard as CreditCardIcon, Receipt as ReceiptIcon, FileSpreadsheet as FileSpreadsheetIcon, Download as DownloadIcon, Share2 as Share2Icon, Eye as EyeIcon, Search as SearchIcon, Filter as FilterIcon, Calendar as CalendarIcon, DollarSign as DollarSignIcon, Percent as PercentIcon, ArrowUpRight as ArrowUpRightIcon, CheckCircle2 as CheckCircle2Icon, XCircle as XCircleIcon, AlertCircle as AlertCircleIcon, Info as InfoIcon, Play as PlayIcon, Pause as PauseIcon, RotateCcw as RotateCcwIcon, Settings as SettingsIcon, Bell as BellIcon, User as UserIcon, ChevronRight as ChevronRightIcon, ChevronLeft as ChevronLeftIcon, Plus as PlusIcon, Minus as MinusIcon, Maximize2 as Maximize2Icon, Minimize2 as Minimize2Icon, Volume2 as Volume2Icon, VolumeX as VolumeXIcon, SkipBack as SkipBackIcon, SkipForward as SkipForwardIcon, Repeat as RepeatIcon, Shuffle as ShuffleIcon, Heart as HeartIcon, ThumbsUp as ThumbsUpIcon, ThumbsDown as ThumbsDownIcon, MessageSquare as MessageSquareIcon, Phone as PhoneIcon, Mail as MailIcon, MapPin as MapPinIcon, Globe as GlobeIcon } from 'lucide-react';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const SmartImportAIPage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Smart Import AI - Upload & Auto-Categorize Bank Documents | XspensesAI</title>
        <meta name="description" content="Upload any bank statement. Our AI categorizes with 99.7% accuracy, learns your patterns, and processes years of data in minutes. Zero storage." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 text-white py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mr-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Smart Import AI
            </h1>
          </div>
          
          <p className="text-xl lg:text-2xl text-purple-100 mb-8 max-w-4xl mx-auto leading-relaxed">
            Upload any bank statement, receipt, or financial document. Our AI instantly categorizes with 
            <span className="text-yellow-300 font-bold"> 99.7% accuracy</span> and learns your spending patterns.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link 
              to="/dashboard/smart-import-ai"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              Try Smart Import AI
            </Link>
            <button className="border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-300">
              Watch Demo
            </button>
          </div>
          
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-purple-200">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span>Bank-Level Security</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span>2.3s Average Processing</span>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-blue-400" />
              <span>99.7% Accuracy Rate</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-purple-400" />
              <span>Zero Data Storage</span>
            </div>
          </div>
        </div>
      </section>

      {/* Three Feature Cards Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Upload Anything, Get Everything
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From messy CSV exports to scanned receipts, our AI handles any format and instantly organizes your financial data.
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="flex-1 bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-6 lg:p-8 rounded-2xl flex flex-col justify-between shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 min-h-[480px]">
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Bank Statements & PDFs</h3>
                <p className="text-blue-100 mb-6 leading-relaxed">
                  Upload PDFs from any bank. Our AI extracts transactions even from scanned documents and messy formats.
                </p>
                <ul className="space-y-3 text-blue-100">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                    <span>500+ banks supported</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                    <span>Scanned document OCR</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                    <span>Handles messy formats</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing Time</span>
                    <span className="font-semibold">2.3s average</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-gradient-to-br from-purple-500 to-pink-600 text-white p-6 lg:p-8 rounded-2xl flex flex-col justify-between shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 min-h-[480px]">
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Receipts & Invoices</h3>
                <p className="text-purple-100 mb-6 leading-relaxed">
                  Snap photos of receipts or upload invoices. AI extracts vendor, amount, and category automatically.
                </p>
                <ul className="space-y-3 text-purple-100">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                    <span>Photo to text conversion</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                    <span>Vendor recognition</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                    <span>Automatic categorization</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Accuracy Rate</span>
                    <span className="font-semibold">99.7%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-gradient-to-br from-green-500 to-teal-600 text-white p-6 lg:p-8 rounded-2xl flex flex-col justify-between shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 min-h-[480px]">
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">CSV & Excel Files</h3>
                <p className="text-green-100 mb-6 leading-relaxed">
                  Import from any financial app or export. AI maps columns and standardizes your data format.
                </p>
                <ul className="space-y-3 text-green-100">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                    <span>Any CSV format</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                    <span>Column mapping</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                    <span>Data standardization</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>File Support</span>
                    <span className="font-semibold">50+ formats</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              How Smart Import AI Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Three simple steps to transform your financial documents into organized, categorized data.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Upload</h3>
              <p className="text-gray-600">
                Drag and drop any financial document. Our AI supports PDFs, images, CSVs, and more.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Process</h3>
              <p className="text-gray-600">
                AI extracts text, identifies transactions, and categorizes with 99.7% accuracy.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Organize</h3>
              <p className="text-gray-600">
                Get clean, categorized data ready for analysis, budgeting, and tax preparation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Transform Your Financial Data?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join thousands of users who've saved hours of manual work with Smart Import AI.
          </p>
          <Link 
            to="/dashboard/smart-import-ai"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-2xl inline-block"
          >
            Start Free Trial
          </Link>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default SmartImportAIPage; 