/**
 * AI Employee Document Processing Demo Page
 * Showcases the complete AI Employee Document Processing & Categorization System
 */

import React, { useState } from 'react';
import { 
  Brain, 
  FileText, 
  Zap, 
  Target, 
  TrendingUp, 
  MessageSquare,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import AIEmployeeDocumentProcessor from '../components/ai/AIEmployeeDocumentProcessor';
import { PipelineResult } from '../lib/documentProcessingPipeline';

const AIEmployeeDocumentProcessingDemo: React.FC = () => {
  const [showProcessor, setShowProcessor] = useState(false);
  const [lastResult, setLastResult] = useState<PipelineResult | null>(null);

  const handleProcessingComplete = (result: PipelineResult) => {
    setLastResult(result);
    setShowProcessor(false);
  };

  const features = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Multi-Format Support",
      description: "Process PDF, CSV, JPG, PNG, XLS, XLSX, and TXT files with intelligent parsing",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Advanced OCR",
      description: "Multiple OCR providers including Tesseract.js, Google Cloud Vision, and AWS Textract",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Smart Categorization",
      description: "Multi-layer categorization with rule-based, AI semantic, and adaptive learning",
      color: "from-green-500 to-green-600"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Learning System",
      description: "Continuously learns from user feedback to improve categorization accuracy",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "AI Employee Personality",
      description: "Byte, your enthusiastic document processing wizard with personality-driven responses",
      color: "from-pink-500 to-pink-600"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Real-time Processing",
      description: "Live progress tracking with detailed stage-by-stage updates and error handling",
      color: "from-indigo-500 to-indigo-600"
    }
  ];

  const processingStages = [
    {
      stage: "Upload & Validation",
      description: "File validation and format detection",
      icon: <FileText className="w-6 h-6" />
    },
    {
      stage: "OCR Processing",
      description: "Text extraction from images and PDFs",
      icon: <Brain className="w-6 h-6" />
    },
    {
      stage: "Document Parsing",
      description: "Intelligent parsing of document structure",
      icon: <Target className="w-6 h-6" />
    },
    {
      stage: "Categorization",
      description: "Multi-layer AI categorization",
      icon: <TrendingUp className="w-6 h-6" />
    },
    {
      stage: "Learning Application",
      description: "Apply learned patterns and preferences",
      icon: <MessageSquare className="w-6 h-6" />
    },
    {
      stage: "AI Response",
      description: "Generate Byte's personality-driven response",
      icon: <Sparkles className="w-6 h-6" />
    }
  ];

  if (showProcessor) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <AIEmployeeDocumentProcessor
            onComplete={handleProcessingComplete}
            onClose={() => setShowProcessor(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div
            className="text-center"
          >
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  AI Employee Document Processing
                </h1>
                <p className="text-xl text-gray-600">
                  Powered by Byte - Your Document Processing Wizard
                </p>
              </div>
            </div>
            
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
              Experience the future of document processing with our comprehensive AI Employee system. 
              Upload any financial document and watch Byte analyze, categorize, and organize your data 
              with personality-driven insights and continuous learning.
            </p>

            <button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProcessor(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-3 mx-auto"
            >
              <Zap className="w-6 h-6" />
              <span>Start Processing with Byte</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Comprehensive Document Processing System
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our AI Employee system combines cutting-edge technology with personality-driven interactions 
            to deliver the most advanced document processing experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center text-white mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Processing Pipeline */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Intelligent Processing Pipeline
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our system processes documents through multiple intelligent stages, 
              each optimized for maximum accuracy and user experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {processingStages.map((stage, index) => (
              <div
                key={index}
                className="flex items-start space-x-4 p-6 bg-gray-50 rounded-xl"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
                  {stage.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {stage.stage}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {stage.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Byte Personality Section */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Meet Byte - Your AI Employee
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Byte is your enthusiastic document processing wizard, combining technical expertise 
              with a friendly personality to make data organization fun and engaging.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg max-w-4xl mx-auto">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Byte's Personality</h3>
                <p className="text-gray-600">Energetic, detail-oriented, and enthusiastic about data organization</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Communication Style</h4>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Friendly and encouraging</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Technical but accessible</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Uses emojis and personality</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Provides detailed insights</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Expertise Areas</h4>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>OCR and text extraction</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>PDF and CSV parsing</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Smart categorization</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Pattern recognition</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Last Result Summary */}
      {lastResult && (
        <div className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="text-center mb-8"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Last Processing Result
              </h2>
              <p className="text-lg text-gray-600">
                Here's what Byte discovered in your last document
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{lastResult.metadata.totalTransactions}</div>
                  <div className="text-sm text-gray-600">Transactions Found</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{lastResult.metadata.categoriesFound}</div>
                  <div className="text-sm text-gray-600">Categories Identified</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {(lastResult.metadata.averageConfidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Average Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{lastResult.metadata.flaggedForReview}</div>
                  <div className="text-sm text-gray-600">Need Review</div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowProcessor(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Process Another Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Experience the Future?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of users who are already using Byte to organize their financial data 
              with AI-powered precision and personality.
            </p>
            <button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProcessor(true)}
              className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center space-x-3 mx-auto"
            >
              <Sparkles className="w-6 h-6" />
              <span>Start with Byte Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIEmployeeDocumentProcessingDemo;
