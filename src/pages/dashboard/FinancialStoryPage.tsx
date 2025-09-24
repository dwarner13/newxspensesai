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
  const [activeView, setActiveView] = useState('overview');
  const [messages, setMessages] = useState<any[]>([]);

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
    <>
      <div className="max-w-7xl mx-auto p-6 pt-32">
        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px]">
              {activeView === 'overview' ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-2xl">
                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl font-bold text-white mb-1"
                    >
                      Welcome to Your Financial Story Center
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-white/60 text-sm mb-3"
                    >
                      AI-powered financial narratives that turn your data into compelling stories
                    </motion.p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                      {[
                        { icon: Zap, title: "Generate Story", desc: "Create personalized financial narratives", color: "from-purple-500 to-pink-500", view: "generate_story" },
                        { icon: BookOpen, title: "AI Assistant", desc: "Get help with story creation", color: "from-green-500 to-emerald-500", view: "ai_assistant" },
                        { icon: BarChart3, title: "Story Analytics", desc: "Analyze your story performance", color: "from-blue-500 to-cyan-500", view: "analytics" },
                        { icon: FileText, title: "My Stories", desc: "View and manage your stories", color: "from-orange-500 to-yellow-500", view: "my_stories" },
                        { icon: Download, title: "Export Tools", desc: "Download and share stories", color: "from-red-500 to-pink-500", view: "export_tools" },
                        { icon: TrendingUp, title: "Story Insights", desc: "Discover trending story patterns", color: "from-indigo-500 to-purple-500", view: "insights" }
                      ].map((item, index) => (
                        <motion.button
                          key={item.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          onClick={() => {
                            if (item.view === 'ai_assistant') {
                              setShowStoryAI(true);
                            } else {
                              setActiveView(item.view);
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
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeView === 'generate_story' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Generate New Financial Story</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Create compelling financial narratives from your data</p>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Story Generator</h3>
                    <div className="space-y-4">
                      <button
                        onClick={generateNewStory}
                        disabled={isLoading}
                        className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                      >
                        <Zap className="w-6 h-6" />
                        {isLoading ? 'Generating Story...' : 'Generate New Financial Story'}
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <h4 className="text-white font-semibold mb-2">Story Types</h4>
                          <div className="space-y-2 text-sm text-white/70">
                            <div>• Personal Finance Journey</div>
                            <div>• Investment Success Stories</div>
                            <div>• Debt Payoff Narratives</div>
                            <div>• Budget Transformation Tales</div>
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <h4 className="text-white font-semibold mb-2">AI Features</h4>
                          <div className="space-y-2 text-sm text-white/70">
                            <div>• Data-driven insights</div>
                            <div>• Emotional storytelling</div>
                            <div>• Podcast-ready hooks</div>
                            <div>• Export capabilities</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : activeView === 'my_stories' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">My Financial Stories</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Your collection of AI-generated financial narratives</p>
                  </div>

                  {stories.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-purple-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">No Stories Yet</h3>
                      <p className="text-white/70 mb-4">Generate your first financial story to get started</p>
                      <button
                        onClick={generateNewStory}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                      >
                        Create First Story
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stories.map((story, index) => (
                        <motion.div
                          key={story.storyId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer group"
                          onClick={() => setSelectedStory(story)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-4 h-4 text-purple-300" />
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

                          <div className="mb-3">
                            <h4 className="text-white font-medium mb-1 text-sm">Story Hooks</h4>
                            <div className="space-y-1">
                              {story.storyHooks.slice(0, 2).map((hook, hookIndex) => (
                                <div key={hookIndex} className="text-white/70 text-xs truncate">
                                  {hook.hook}
                                </div>
                              ))}
                              {story.storyHooks.length > 2 && (
                                <div className="text-purple-400 text-xs">+{story.storyHooks.length - 2} more...</div>
                              )}
                            </div>
                          </div>

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
                              className="flex-1 px-2 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                            >
                              <ArrowRight className="w-3 h-3" />
                              View
                            </button>
                          </div>

                          <div className="pt-2 border-t border-white/10">
                            <div className="flex items-center gap-1 text-white/60 text-xs">
                              <Calendar className="w-3 h-3" />
                              {new Date(story.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : activeView === 'analytics' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Story Analytics</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Analyze the performance and impact of your financial stories</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/70 text-sm">Total Stories</p>
                          <p className="text-2xl font-bold text-purple-400">{stories.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-purple-400" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/70 text-sm">Story Hooks</p>
                          <p className="text-2xl font-bold text-blue-400">
                            {stories.reduce((sum, story) => sum + story.storyHooks.length, 0)}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Mic className="w-6 h-6 text-blue-400" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/70 text-sm">Total Insights</p>
                          <p className="text-2xl font-bold text-green-400">
                            {stories.reduce((sum, story) => sum + story.insights.length, 0)}
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-green-400" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/70 text-sm">AI Employees</p>
                          <p className="text-2xl font-bold text-orange-400">7</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-orange-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : activeView === 'export_tools' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Export Tools</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Download and share your financial stories in various formats</p>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Export Options</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button className="flex items-center gap-3 p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-white transition-colors">
                        <FileText className="w-5 h-5" />
                        <span>Export as JSON</span>
                      </button>
                      <button className="flex items-center gap-3 p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-white transition-colors">
                        <BookOpen className="w-5 h-5" />
                        <span>Export as Blog Post</span>
                      </button>
                      <button className="flex items-center gap-3 p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-white transition-colors">
                        <Mic className="w-5 h-5" />
                        <span>Export as Podcast Script</span>
                      </button>
                      <button className="flex items-center gap-3 p-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-white transition-colors">
                        <Download className="w-5 h-5" />
                        <span>Export All Stories</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : activeView === 'insights' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setActiveView('overview')}
                      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Overview
                    </button>
                    <h2 className="text-xl font-bold text-white">Story Insights</h2>
                  </div>
                  
                  <div className="text-center mb-6">
                    <p className="text-white/70">Discover trending patterns and insights from your financial stories</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <h3 className="text-lg font-semibold text-white mb-4">Trending Story Hooks</h3>
                      <div className="space-y-3">
                        <div className="text-sm text-white/70">• "From $0 to $10K: My Emergency Fund Journey"</div>
                        <div className="text-sm text-white/70">• "How I Paid Off $25K in Student Loans"</div>
                        <div className="text-sm text-white/70">• "The Investment That Changed My Life"</div>
                        <div className="text-sm text-white/70">• "Budgeting Hacks That Actually Work"</div>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                      <h3 className="text-lg font-semibold text-white mb-4">Popular Story Themes</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm">Debt Payoff</span>
                          <span className="text-purple-400 text-sm">45%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm">Investment Success</span>
                          <span className="text-blue-400 text-sm">30%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm">Budget Transformation</span>
                          <span className="text-green-400 text-sm">25%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-white/60">Content coming soon! Use the feature boxes to explore.</p>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="px-2 pt-1 pb-0.5 border-t border-white/10 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
              <div className="flex gap-1">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Ask about story generation, financial narratives, or data insights..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 pr-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-sm"
                    disabled
                  />
                </div>
                <button
                  disabled
                  className="px-2 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg opacity-50 cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 font-medium text-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Coming Soon</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
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
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-400/20">
                <h3 className="text-xl font-bold text-white mb-4">Executive Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">{selectedStory.employees.byte.totalTransactions}</div>
                    <div className="text-white/70 text-sm">Transactions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{selectedStory.insights.length}</div>
                    <div className="text-white/70 text-sm">Insights</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">{selectedStory.storyHooks.length}</div>
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
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-lg flex items-center justify-center">
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
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
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
    </>
  );
};

export default FinancialStoryPage;




