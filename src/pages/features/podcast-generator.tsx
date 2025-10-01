import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { Play, Users, TrendingUp, Heart, Star, Clock, Zap, Crown, Target, MessageCircle, Bell, Share2, ArrowRight, CheckCircle, AlertTriangle, DollarSign, Video, Instagram, Youtube, Twitter } from 'lucide-react';

const PodcastGeneratorPage = () => {
  const [liveCount, setLiveCount] = useState(387);
  const [createdToday, setCreatedToday] = useState(1247);
  const [bootcampCount, setBootcampCount] = useState(52);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(prev => prev + Math.floor(Math.random() * 3) - 1);
      setCreatedToday(prev => prev + Math.floor(Math.random() * 5));
      setBootcampCount(prev => prev + Math.floor(Math.random() * 2) - 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <WebsiteLayout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div
              >
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  AI Podcast Generator
                </h1>
                <p className="text-xl md:text-2xl mb-8 text-blue-200">
                  Create engaging podcasts in minutes with AI-powered content generation
                </p>
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <span className="font-semibold">{liveCount.toLocaleString()}</span>
                      <span className="text-blue-200">Live Podcasts</span>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-semibold">{createdToday.toLocaleString()}</span>
                      <span className="text-blue-200">Created Today</span>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5" />
                      <span className="font-semibold">{bootcampCount}</span>
                      <span className="text-blue-200">Bootcamp Graduates</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/dashboard/personal-podcast"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Start Creating
                  </Link>
                  <button className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 flex items-center justify-center gap-2">
                    <Video className="w-5 h-5" />
                    Watch Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  AI-Powered Podcast Creation
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Transform your ideas into engaging podcast episodes with our advanced AI technology
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-xl"
                >
                  <div className="bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Instant Content Generation</h3>
                  <p className="text-gray-600">
                    Generate episode outlines, scripts, and talking points in seconds with our AI assistant
                  </p>
                </div>

                <div
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-xl"
                >
                  <div className="bg-purple-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Smart Topic Research</h3>
                  <p className="text-gray-600">
                    AI analyzes trending topics and suggests relevant content for your niche
                  </p>
                </div>

                <div
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-green-50 to-blue-50 p-8 rounded-xl"
                >
                  <div className="bg-green-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Interactive AI Host</h3>
                  <p className="text-gray-600">
                    Engage with AI hosts that adapt to your style and provide dynamic conversations
                  </p>
                </div>

                <div
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-xl"
                >
                  <div className="bg-orange-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Multi-Platform Publishing</h3>
                  <p className="text-gray-600">
                    Automatically publish to Spotify, Apple Podcasts, YouTube, and social media
                  </p>
                </div>

                <div
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-xl"
                >
                  <div className="bg-indigo-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Analytics & Insights</h3>
                  <p className="text-gray-600">
                    Track performance, audience engagement, and growth with detailed analytics
                  </p>
                </div>

                <div
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-pink-50 to-rose-50 p-8 rounded-xl"
                >
                  <div className="bg-pink-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Community Building</h3>
                  <p className="text-gray-600">
                    Build a loyal audience with interactive features and community engagement tools
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Why Choose AI Podcast Generator?
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Join thousands of creators who have transformed their content creation with AI
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-12">
                <div
                  viewport={{ once: true }}
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Save Time & Effort</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">10x Faster Creation</h4>
                        <p className="text-gray-600">Generate full episodes in minutes instead of hours</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Consistent Quality</h4>
                        <p className="text-gray-600">AI ensures high-quality content every time</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">No Creative Block</h4>
                        <p className="text-gray-600">Always have fresh ideas and topics to discuss</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  viewport={{ once: true }}
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Grow Your Audience</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Trending Topics</h4>
                        <p className="text-gray-600">Stay relevant with AI-curated trending content</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Multi-Platform Reach</h4>
                        <p className="text-gray-600">Reach audiences across all major platforms</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Engagement Analytics</h4>
                        <p className="text-gray-600">Understand what resonates with your audience</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Ready to Start Your Podcast Journey?
                </h2>
                <p className="text-xl mb-8 text-blue-200">
                  Join thousands of creators who are already using AI to build their podcast empire
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/dashboard/personal-podcast"
                    className="bg-white text-purple-900 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Start Creating Now
                  </Link>
                  <button className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 flex items-center justify-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Schedule Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </WebsiteLayout>
  );
};

export default PodcastGeneratorPage; 
