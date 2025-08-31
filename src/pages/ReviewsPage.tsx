import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
// WebsiteLayout removed - navigation handled by MarketingLayout

const ReviewsPage = () => {
  const reviews = [
    {
      name: "Sarah M.",
      role: "Small Business Owner",
      avatar: "SM",
      rating: 5,
      content: "The personal podcasts are game-changing! I actually look forward to reviewing my expenses now. The AI insights helped me save $500 last month.",
      highlight: "AI Assistant User"
    },
    {
      name: "Mike R.",
      role: "Freelance Developer",
      avatar: "MR",
      rating: 5,
      content: "Finally, an expense app that doesn't feel like work! The Spotify integration means I can listen to my music while categorizing expenses. Brilliant!",
      highlight: "Podcast Lover"
    },
    {
      name: "Jennifer L.",
      role: "Marketing Consultant",
      avatar: "JL",
      rating: 5,
      content: "The AI assistant feels like having a personal financial advisor. It caught spending patterns I never noticed and helped me reach my savings goals faster.",
      highlight: "AI Insights User"
    },
    {
      name: "David K.",
      role: "Product Manager",
      avatar: "DK",
      rating: 5,
      content: "XspensesAI transformed my relationship with money. The personalized podcasts make me feel motivated about my financial future. Worth every penny!",
      highlight: "Goal Achiever"
    },
    {
      name: "Emily R.",
      role: "Teacher",
      avatar: "ER",
      rating: 5,
      content: "As someone who struggled with budgeting, this app made it fun and engaging. The AI insights helped me understand my spending habits better.",
      highlight: "Budget Master"
    },
    {
      name: "Alex T.",
      role: "Entrepreneur",
      avatar: "AT",
      rating: 5,
      content: "The combination of AI insights and audio entertainment is pure genius. I've never been so motivated to track my expenses!",
      highlight: "Early Adopter"
    }
  ];

  const stats = [
    { number: "4.9", label: "Average Rating", icon: <Star className="h-6 w-6" /> },
    { number: "10,000+", label: "Happy Users", icon: <Quote className="h-6 w-6" /> },
    { number: "98%", label: "Would Recommend", icon: <Star className="h-6 w-6" /> },
    { number: "2.1M+", label: "Money Saved", icon: <Quote className="h-6 w-6" /> }
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm mb-8"
          >
            <span className="mr-2">⭐</span>
            <span>Trusted by 10,000+ Users</span>
          </motion.div>
          
          <motion.h1 
            className="text-5xl md:text-7xl font-bold mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            What Our Users Are <span className="text-orange-400 drop-shadow-lg">Saying</span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Join thousands of satisfied users who've transformed their financial lives 
            with AI-powered insights and personalized audio experiences.
          </motion.p>
          
          {/* Stats */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-orange-400 mb-1">{stat.number}</div>
                <div className="text-gray-300 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {reviews.map((review, index) => (
              <motion.div 
                key={review.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {review.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{review.name}</h4>
                      <p className="text-sm text-gray-600">{review.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                
                <p className="text-gray-700 leading-relaxed mb-4">"{review.content}"</p>
                
                <div className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {review.highlight}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonial Highlight */}
      <section className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Quote className="h-16 w-16 mx-auto mb-8 text-orange-300" />
            <blockquote className="text-2xl md:text-3xl font-medium mb-8 leading-relaxed">
              "XspensesAI didn't just help me track expenses—it completely transformed my relationship with money. 
              The AI insights are like having a personal financial advisor, and the podcasts make financial planning enjoyable!"
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                SM
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">Sarah M.</div>
                <div className="text-orange-200">Small Business Owner</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.h2 
            className="text-4xl font-bold text-gray-900 mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Ready to Join Our Happy Users?
          </motion.h2>
          <motion.p 
            className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Start your journey to better financial management today with AI-powered insights and personalized experiences.
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <Link 
              to="/pricing" 
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link 
              to="/ai-demo" 
              className="bg-white text-purple-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 border border-purple-600"
            >
              Try AI Demo
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default ReviewsPage; 
