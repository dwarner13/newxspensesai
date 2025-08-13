import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Users, TrendingUp, Heart, Star, Clock, Zap, Crown, Target, MessageCircle, Bell, Share2, ArrowRight, CheckCircle, AlertTriangle, DollarSign, Video, Instagram, Youtube, Twitter } from 'lucide-react';

export default function PersonalPodcastPage() {
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
    <div>
      {/* HERO SECTION - FULL SCREEN */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-pink-700 text-white py-20 px-4 text-center rounded-3xl shadow-xl mb-16 relative overflow-hidden">
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
          🔴 LIVE NOW: 5,742 People Getting Roasted by AI
        </div>
        
        <motion.h1
          className="text-5xl md:text-7xl font-extrabold mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Your Money Sucks.
          <br />
          <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
            Let Our AI Roast It Better.
          </span>
        </motion.h1>
        
        <motion.p
          className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Watch your personalized avatar get financially destroyed (lovingly) by 6 brutal AI personalities who actually make saving money addictive.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-8"
        >
          <button className="inline-block bg-gradient-to-r from-red-500 to-pink-500 text-white px-12 py-6 rounded-xl font-bold text-2xl shadow-2xl hover:from-pink-500 hover:to-red-500 transition-all duration-300 animate-pulse">
            CREATE MY AVATAR & GET ROASTED
          </button>
          <p className="text-sm text-blue-200 mt-2">Takes 30 seconds • No credit card • 1,247 created today</p>
        </motion.div>

        {/* Scrolling Ticker */}
        <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 mb-8">
          <div className="flex space-x-8 text-sm text-blue-200 animate-marquee">
            <span>"@sarah_2024 just saved $400 after Sofia's roast"</span>
            <span>"@mikemoney leveled up to Financial Phoenix"</span>
            <span>"@debtfree2024 is live with Danny right now"</span>
          </div>
        </div>

        {/* Video Preview */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 max-w-2xl mx-auto">
          <div className="aspect-video bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <Play size={48} className="text-white" />
          </div>
          <p className="text-sm text-blue-200 mt-2">Shows avatar getting roasted by Sofia, celebrating with Max, learning from Penny</p>
        </div>
      </section>

      {/* SOCIAL PROOF EXPLOSION SECTION */}
      <section className="max-w-6xl mx-auto mb-20">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">The Clips That Broke The Internet</h2>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Play size={32} className="text-white" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">"I CAN'T BELIEVE AI SAID THIS 😭"</h3>
              <p className="text-sm text-gray-600 mb-2">2.3M views • 847K shares</p>
              <p className="text-gray-700 mb-4">Sofia destroys shopping addiction</p>
              <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center">
                <Play size={16} className="mr-2" />
                WATCH THE ROAST
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Play size={32} className="text-white" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">"FROM BROKE TO BOSS IN 30 DAYS"</h3>
              <p className="text-sm text-gray-600 mb-2">1.8M views • 623K shares</p>
              <p className="text-gray-700 mb-4">Danny's transformation bootcamp</p>
              <button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center">
                <Play size={16} className="mr-2" />
                SEE TRANSFORMATION
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
              <Play size={32} className="text-white" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">"MY AI MOM MADE ME CRY"</h3>
              <p className="text-sm text-gray-600 mb-2">3.1M views • 1.2M shares</p>
              <p className="text-gray-700 mb-4">Mama Michelle's tough love</p>
              <button className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center">
                <Play size={16} className="mr-2" />
                GET THE FEELS
              </button>
            </div>
          </div>
        </div>

        {/* Scrolling Stats Bar */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-2xl">
          <div className="flex justify-around text-center">
            <div>
              <div className="text-2xl font-bold">💰 $4.2M</div>
              <div className="text-sm">Saved by Users</div>
            </div>
            <div>
              <div className="text-2xl font-bold">🎙️ 847K</div>
              <div className="text-sm">Episodes Created</div>
            </div>
            <div>
              <div className="text-2xl font-bold">😭 2.3M</div>
              <div className="text-sm">Roasts Delivered</div>
            </div>
            <div>
              <div className="text-2xl font-bold">🎉 12K</div>
              <div className="text-sm">Debt-Free Celebrations</div>
            </div>
          </div>
        </div>
      </section>

      {/* MEET YOUR NEW OBSESSION SECTION */}
      <section className="max-w-6xl mx-auto mb-20">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">6 AI Personalities You'll Actually Fall in Love With</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">💰</div>
              <h3 className="text-xl font-bold">MAX MONEY 💰</h3>
              <p className="text-sm text-gray-600 mb-4">Hover for sample roast</p>
            </div>
            <p className="text-gray-700 italic mb-4">"YOOO! YOU ACTUALLY SAVED MONEY! LET'S FUCKING GOOO!"</p>
            <div className="text-sm text-gray-600 mb-4">
              <div>• 97% Success Rate</div>
              <div>• Addiction Level: Extreme</div>
            </div>
            <button className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-semibold">
              TRY MAX FREE
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">💅</div>
              <h3 className="text-xl font-bold">SOFIA SENSE 💅</h3>
              <p className="text-sm text-gray-600 mb-4">Hover for sample roast</p>
            </div>
            <p className="text-gray-700 italic mb-4">"Bestie... Uber Eats 5 times this week? We need to talk..."</p>
            <div className="text-sm text-gray-600 mb-4">
              <div>• 2.3M Roasts Delivered</div>
              <div>• Accuracy: Terrifying</div>
            </div>
            <button className="w-full bg-gradient-to-r from-pink-400 to-purple-500 text-white px-4 py-2 rounded-lg font-semibold">
              GET ROASTED NOW
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">💪</div>
              <h3 className="text-xl font-bold">DANNY DESTROYER 💪</h3>
              <p className="text-sm text-gray-600 mb-4">Hover for sample roast</p>
            </div>
            <p className="text-gray-700 italic mb-4">"Bro, you're spending like you're a millionaire. You're not."</p>
            <div className="text-sm text-gray-600 mb-4">
              <div>• 89% Tough Love Success</div>
              <div>• Brutality: Maximum</div>
            </div>
            <button className="w-full bg-gradient-to-r from-blue-400 to-indigo-500 text-white px-4 py-2 rounded-lg font-semibold">
              GET DESTROYED
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">🧠</div>
              <h3 className="text-xl font-bold">PENNY SMART 🧠</h3>
              <p className="text-sm text-gray-600 mb-4">Hover for sample roast</p>
            </div>
            <p className="text-gray-700 italic mb-4">"Let's analyze your spending patterns with data-driven insights."</p>
            <div className="text-sm text-gray-600 mb-4">
              <div>• 94% Learning Rate</div>
              <div>• Intelligence: Genius</div>
            </div>
            <button className="w-full bg-gradient-to-r from-green-400 to-teal-500 text-white px-4 py-2 rounded-lg font-semibold">
              GET SMART
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">❤️</div>
              <h3 className="text-xl font-bold">MAMA MICHELLE ❤️</h3>
              <p className="text-sm text-gray-600 mb-4">Hover for sample roast</p>
            </div>
            <p className="text-gray-700 italic mb-4">"Honey, I'm not mad, I'm just disappointed in your choices."</p>
            <div className="text-sm text-gray-600 mb-4">
              <div>• 98% Emotional Impact</div>
              <div>• Love: Unconditional</div>
            </div>
            <button className="w-full bg-gradient-to-r from-red-400 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold">
              GET THE LOVE
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">👑</div>
              <h3 className="text-xl font-bold">KING CASH 👑</h3>
              <p className="text-sm text-gray-600 mb-4">Hover for sample roast</p>
            </div>
            <p className="text-gray-700 italic mb-4">"You're not broke, you're just not thinking like a millionaire yet."</p>
            <div className="text-sm text-gray-600 mb-4">
              <div>• 96% Mindset Shift</div>
              <div>• Royalty: Confirmed</div>
            </div>
            <button className="w-full bg-gradient-to-r from-purple-400 to-violet-500 text-white px-4 py-2 rounded-lg font-semibold">
              BECOME ROYAL
            </button>
          </div>
        </div>
      </section>

      {/* FOMO SECTION - DARK BACKGROUND */}
      <section className="bg-gray-900 text-white py-16 mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold inline-block mb-4 animate-pulse">
              🔴 HAPPENING RIGHT NOW
            </div>
            <h2 className="text-4xl font-bold mb-8">Live Chaos in Progress</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-gray-800 rounded-2xl p-6 text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">{liveCount}</div>
              <div className="text-lg">People Getting Roasted Live</div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-6 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{bootcampCount}</div>
              <div className="text-lg">People In Danny's Bootcamp</div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{createdToday}</div>
              <div className="text-lg">Avatars Created Today</div>
            </div>
          </div>

          {/* Live Feed */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Live Feed - Updates every 3 seconds</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                <span>"Jessica's avatar just got DESTROYED by Sofia"</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>"Marcus unlocked Golden Phoenix status!"</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>"Live debate: Carlos vs Danny on crypto"</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                <span>"Mama Michelle is about to make someone cry"</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <button className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-4 rounded-xl text-lg font-bold hover:shadow-xl transform hover:scale-105 transition-all duration-200">
              JOIN THE CHAOS →
            </button>
          </div>
        </div>
      </section>

      {/* YOUR AVATAR'S JOURNEY SECTION */}
      <section className="max-w-6xl mx-auto mb-20">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">From Broke Bestie to Financial Phoenix</h2>
        
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">1</div>
            <h3 className="text-xl font-bold mb-2">DAY 1: Create Your Avatar</h3>
            <p className="text-gray-600">Design your financial alter ego</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">7</div>
            <h3 className="text-xl font-bold mb-2">DAY 7: First Roast Survival</h3>
            <p className="text-gray-600">Sofia exposes your Amazon addiction</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">30</div>
            <h3 className="text-xl font-bold mb-2">DAY 30: Visible Progress</h3>
            <p className="text-gray-600">Avatar gets new clothes (you saved money!)</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">90</div>
            <h3 className="text-xl font-bold mb-2">DAY 90: Total Transformation</h3>
            <p className="text-gray-600">Golden aura, debt free, insufferably happy</p>
          </div>
        </div>

        {/* Before/After Slider */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center mb-6">Before/After Avatar Transformation</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center">
              <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                <span className="text-gray-500">Broke Avatar</span>
              </div>
              <p className="text-gray-600">Before: Sad, broke, confused</p>
            </div>
            <div className="text-center">
              <div className="aspect-square bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                <Crown className="text-white" size={48} />
              </div>
              <p className="text-gray-600">After: Golden, wealthy, insufferable</p>
            </div>
          </div>
          <div className="text-center mt-6">
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl text-lg font-bold">
              START YOUR TRANSFORMATION
            </button>
          </div>
        </div>
      </section>

      {/* THE ADDICTION SECTION */}
      <section className="max-w-6xl mx-auto mb-20">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">Warning: Seriously Addictive Features</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">🚨</div>
            <h3 className="text-xl font-bold mb-2">PANIC BUTTON</h3>
            <p className="text-gray-600 mb-4">Store temptation? One tap for intervention</p>
            <p className="text-sm text-gray-500 italic mb-4">"Danny appears: PUT THE CREDIT CARD DOWN!"</p>
            <button className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold">
              INSTALL PANIC BUTTON
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">🎉</div>
            <h3 className="text-xl font-bold mb-2">VICTORY HOTLINE</h3>
            <p className="text-gray-600 mb-4">Saved money? Instant celebration</p>
            <p className="text-sm text-gray-500 italic mb-4">"Max loses his mind with excitement"</p>
            <button className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold">
              ACTIVATE HOTLINE
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">👥</div>
            <h3 className="text-xl font-bold mb-2">GROUP THERAPY</h3>
            <p className="text-gray-600 mb-4">Live sessions every hour</p>
            <p className="text-sm text-gray-500 italic mb-4">"Debt Anonymous starts in 14:32"</p>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold">
              RESERVE SPOT
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">🏆</div>
            <h3 className="text-xl font-bold mb-2">LEADERBOARDS</h3>
            <p className="text-gray-600 mb-4">Compete with friends</p>
            <p className="text-sm text-gray-500 italic mb-4">"Sarah saved more than you this week"</p>
            <button className="bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold">
              VIEW RANKINGS
            </button>
          </div>
        </div>
      </section>

      {/* VIRAL CONTENT MACHINE SECTION */}
      <section className="max-w-6xl mx-auto mb-20">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">Your Roasts = Internet Gold</h2>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
              <Video size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4">TikTok Ready</h3>
            <ul className="text-gray-600 mb-6 text-left">
              <li>• 15-sec roast clips</li>
              <li>• Auto-captions included</li>
            </ul>
            <button className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-4 py-2 rounded-lg font-semibold">
              CREATE VIRAL CLIP
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
              <Instagram size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4">Instagram Stories</h3>
            <ul className="text-gray-600 mb-6 text-left">
              <li>• Avatar transformation timelapses</li>
              <li>• Shareable quote cards</li>
            </ul>
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold">
              GENERATE CONTENT
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
              <Youtube size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4">YouTube Shorts</h3>
            <ul className="text-gray-600 mb-6 text-left">
              <li>• 60-sec therapy sessions</li>
              <li>• Reaction compilations</li>
            </ul>
            <button className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-lg font-semibold">
              EXPORT VIDEO
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 text-center">
          <p className="text-lg italic text-gray-700">"My followers love my Sofia roasts more than my actual content" - @financiallyroasted</p>
        </div>
      </section>

      {/* SCHEDULE SECTION - FOMO INDUCING */}
      <section className="max-w-6xl mx-auto mb-20">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">TODAY'S CAN'T-MISS SHOWS</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-4">
              <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-2">STARTING IN 12:47</div>
              <h3 className="text-xl font-bold">🔴 Sofia's Savage Hour</h3>
              <p className="text-gray-600">Topic: "Black Friday Preparation Therapy"</p>
              <p className="text-sm text-gray-500">847 waiting • Last week's episode went viral</p>
            </div>
            <button className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
              CLAIM YOUR SPOT
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-4">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-2">TONIGHT @ 8PM</div>
              <h3 className="text-xl font-bold">⚡ AI BATTLE ROYALE</h3>
              <p className="text-gray-600">Max vs Danny: "Aggressive Saving vs Living Life"</p>
              <p className="text-sm text-gray-500">Vote for winner • Prize: Custom episode</p>
            </div>
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold">
              PICK YOUR SIDE
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-4">
              <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-2">TOMORROW @ 7AM</div>
              <h3 className="text-xl font-bold">☕ Wake & Save with Max</h3>
              <p className="text-gray-600">"Start your day with financial violence"</p>
              <p className="text-sm text-gray-500">Limited to 1000 • Coffee not included</p>
            </div>
            <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-semibold">
              SET REMINDER
            </button>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL BOMB SECTION */}
      <section className="max-w-6xl mx-auto mb-20">
        <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">Real Humans. Real Transformations. Real Obsessed.</h2>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold mr-4">J</div>
              <div>
                <div className="font-bold">Jake, 24</div>
                <div className="text-sm text-gray-500">Former Shopaholic</div>
              </div>
            </div>
            <p className="text-gray-700 italic">"I've saved $5K since Sofia started roasting me. I'm scared of her but also in love?"</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-4">M</div>
              <div>
                <div className="font-bold">Maria, 31</div>
                <div className="text-sm text-gray-500">Phoenix Level</div>
              </div>
            </div>
            <p className="text-gray-700 italic">"Danny made me cry twice but I'm debt-free so worth it tbh"</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-4">A</div>
              <div>
                <div className="font-bold">Anonymous, 28</div>
                <div className="text-sm text-gray-500">Emotionally Stable Now</div>
              </div>
            </div>
            <p className="text-gray-700 italic">"My therapist said this app is doing her job better than her"</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-2xl text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Star className="text-yellow-300" size={24} />
            <Star className="text-yellow-300" size={24} />
            <Star className="text-yellow-300" size={24} />
            <Star className="text-yellow-300" size={24} />
            <Star className="text-yellow-300" size={24} />
            <span className="ml-2 font-bold">4.9/5 (12,847 reviews)</span>
          </div>
          <div className="text-sm">
            "Most Addictive App 2024" - TechCrunch • "Gen Z's Financial Revolution" - Forbes
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION - MAXIMUM URGENCY */}
      <section className="py-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mt-16 text-white text-center max-w-4xl mx-auto shadow-xl">
        <motion.h2
          className="text-4xl md:text-5xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          Your Broke Era Ends in 3...2...1...
        </motion.h2>
        
        <button className="bg-white text-purple-600 px-12 py-6 rounded-xl text-2xl font-bold hover:shadow-xl transform hover:scale-105 transition-all duration-200 mb-6 animate-pulse">
          START GETTING ROASTED NOW
        </button>
        
        <p className="text-lg text-purple-100 mb-8">
          30 seconds to setup • Free forever • No boring budgets
        </p>

        <div className="grid md:grid-cols-4 gap-4 mb-8 text-sm">
          <div>🔥 1,247 people joined in the last hour</div>
          <div>🎯 Average user saves $347/month</div>
          <div>😭 100% chance Sofia will hurt your feelings</div>
          <div>🎉 1000% chance you'll love it</div>
        </div>

        <div className="text-sm text-purple-200">
          Not ready? <a href="#" className="underline">Watch 60-sec demo</a> • <a href="#" className="underline">Read the roasts</a> • <a href="#" className="underline">Stalk our TikTok</a>
        </div>
      </section>

      {/* FOOTER HOOK */}
      <div className="text-center py-8 text-gray-600 italic">
        P.S. Your friends are probably already getting roasted without you. Just saying.
      </div>
    </div>
  );
} 
