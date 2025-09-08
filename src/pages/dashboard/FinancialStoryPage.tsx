import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  BarChart3, 
  Download, 
  FileText, 
  TrendingUp, 
  Target, 
  DollarSign,
  Calendar,
  Users,
  Zap,
  ArrowRight,
  Play,
  Mic,
  Headphones
} from 'lucide-react';
import { FinancialStoryAI } from '../../components/chat/FinancialStoryAI';
import { financialStoryAPI, FinancialStoryData } from '../../lib/financial-story';

const FinancialStoryPage: React.FC = () => {
  const [stories, setStories] = useState<FinancialStoryData[]>([]);
  const [selectedStory, setSelectedStory] = useState<FinancialStoryData | null>(null);
  const [showStoryAI, setShowStoryAI] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      setIsLoading(true);
      // In a real app, this would get the actual user ID
      const userId = 'demo-user';
      const userStories = financialStoryAPI.getUserStories(userId);
      setStories(userStories);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewStory = async () => {
    try {
      setIsLoading(true);
      const userId = 'demo-user';
      const newStory = await financialStoryAPI.collectEmployeeData(userId);
      setStories(prev => [newStory, ...prev]);
      setSelectedStory(newStory);
    } catch (error) {
      console.error('Error generating story:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportStory = (story: FinancialStoryData) => {
    const jsonData = financialStoryAPI.exportStory(story.storyId);
    const blogData = financialStoryAPI.exportBlogPost(story.storyId);

    if (jsonData && blogData) {
      // Download JSON
      const jsonBlob = new Blob([jsonData], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `financial-story-${story.storyId}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      // Download Blog
      const blogBlob = new Blob([blogData], { type: 'text/markdown' });
      const blogUrl = URL.createObjectURL(blogBlob);
      const blogLink = document.createElement('a');
      blogLink.href = blogUrl;
      blogLink.download = `financial-story-blog-${story.storyId}.md`;
      document.body.appendChild(blogLink);
      blogLink.click();
      document.body.removeChild(blogLink);
      URL.revokeObjectURL(blogUrl);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-400 bg-green-400/10';
      case 'analyzing': return 'text-yellow-400 bg-yellow-400/10';
      case 'collecting': return 'text-blue-400 bg-blue-400/10';
      case 'published': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Financial Story Center</h1>
              <p className="text-white/70 text-sm">AI-powered financial narratives for podcasters</p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center gap-3 mb-6"
        >
          <button
            onClick={generateNewStory}
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            <Zap className="w-4 h-4" />
            {isLoading ? 'Generating...' : 'Generate Story'}
          </button>
          <button
            onClick={() => setShowStoryAI(true)}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
          >
            <BookOpen className="w-4 h-4" />
            AI Assistant
          </button>
        </motion.div>

        {/* Stories Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {stories.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Financial Stories Yet</h3>
              <p className="text-white/70 mb-4 text-sm">Generate your first financial story to get started</p>
              <button
                onClick={generateNewStory}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
              >
                Create First Story
              </button>
            </div>
          ) : (
            stories.map((story, index) => (
              <motion.div
                key={story.storyId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer group"
                onClick={() => setSelectedStory(story)}
              >
                {/* Story Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-blue-300" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Financial Story</h3>
                      <p className="text-white/60 text-xs">ID: {story.storyId.slice(-8)}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(story.status)}`}>
                    {story.status}
                  </span>
                </div>

                {/* Story Stats */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{story.employees.byte.totalTransactions}</div>
                    <div className="text-white/60 text-xs">Transactions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{story.insights.length}</div>
                    <div className="text-white/60 text-xs">Insights</div>
                  </div>
                </div>

                {/* Story Hooks */}
                <div className="mb-3">
                  <h4 className="text-white font-medium mb-1 text-sm">Story Hooks</h4>
                  <div className="space-y-1">
                    {story.storyHooks.slice(0, 2).map((hook, hookIndex) => (
                      <div key={hookIndex} className="text-white/70 text-xs truncate">
                        {hook.hook}
                      </div>
                    ))}
                    {story.storyHooks.length > 2 && (
                      <div className="text-blue-400 text-xs">+{story.storyHooks.length - 2} more...</div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportStory(story);
                    }}
                    className="flex-1 px-2 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStory(story);
                    }}
                    className="flex-1 px-2 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                  >
                    <ArrowRight className="w-3 h-3" />
                    View
                  </button>
                </div>

                {/* Date */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1 text-white/60 text-xs">
                    <Calendar className="w-3 h-3" />
                    {new Date(story.timestamp).toLocaleDateString()}
                  </div>
                </div>
            </motion.div>
            ))
          )}
        </motion.div>

        {/* Selected Story Modal */}
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Financial Story Details</h2>
                    <p className="text-white/70">ID: {selectedStory.storyId}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStory(null)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
                >
                  <span className="text-white text-xl">×</span>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Executive Summary */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-400/20">
                  <h3 className="text-xl font-bold text-white mb-4">Executive Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400">{selectedStory.employees.byte.totalTransactions}</div>
                      <div className="text-white/70 text-sm">Transactions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400">{selectedStory.insights.length}</div>
                      <div className="text-white/70 text-sm">Insights</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-400">{selectedStory.storyHooks.length}</div>
                      <div className="text-white/70 text-sm">Story Hooks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-400">{selectedStory.employees.goalie.activeGoals}</div>
                      <div className="text-white/70 text-sm">Active Goals</div>
                    </div>
                  </div>
                </div>

                {/* AI Employee Contributions */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">AI Employee Contributions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedStory.employees).map(([employee, data]) => (
                      <div key={employee} className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{employee.charAt(0).toUpperCase()}</span>
                          </div>
                          <h4 className="text-white font-semibold capitalize">{employee}</h4>
                        </div>
                        <div className="text-white/70 text-sm">
                          {employee === 'byte' && `Processed ${data.totalTransactions} transactions`}
                          {employee === 'goalie' && `Active goals: ${data.activeGoals}`}
                          {employee === 'tag' && `Categories: ${data.totalCategories}`}
                          {employee === 'crystal' && `Budget status: ${data.budgetStatus.status}`}
                          {employee === 'ledger' && `Health score: ${data.financialHealth.overall}/100`}
                          {employee === 'finley' && `Recommendations: ${data.recommendations.length}`}
                          {employee === 'prime' && `Strategic decisions: ${data.strategicDecisions.length}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Story Hooks */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Story Hooks for Podcasters</h3>
                  <div className="space-y-3">
                    {selectedStory.storyHooks.map((hook, index) => (
                      <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Mic className="w-4 h-4 text-green-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium mb-1">{hook.hook}</h4>
                            <p className="text-white/70 text-sm mb-2">{hook.context}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              hook.podcastPotential === 'high' ? 'text-green-400 bg-green-400/10' :
                              hook.podcastPotential === 'medium' ? 'text-yellow-400 bg-yellow-400/10' :
                              'text-red-400 bg-red-400/10'
                            }`}>
                              {hook.podcastPotential} potential
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={() => exportStory(selectedStory)}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Export Story
                  </button>
                  <button
                    onClick={() => setShowStoryAI(true)}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" />
                    AI Analysis
            </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Financial Story AI Modal */}
        {showStoryAI && (
          <FinancialStoryAI
            userId="demo-user"
            onClose={() => setShowStoryAI(false)}
          />
        )}
      </div>
    </div>
  );
};

export default FinancialStoryPage;