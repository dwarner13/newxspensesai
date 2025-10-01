import { Helmet } from 'react-helmet-async';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

const FinancialStoryPage = () => {

  return (
    <WebsiteLayout>
      <Helmet>
        <title>Financial Story - XspensesAI</title>
        <meta name="description" content="Transform boring bank statements into Netflix-worthy financial narratives. Our AI podcasters turn your spending into engaging stories that actually make you want to check your finances." />
        <meta name="keywords" content="financial storytelling, AI podcast, money stories, financial entertainment, personal finance podcast, AI storyteller" />
      </Helmet>
      
      <div className="min-h-screen bg-[#0a0e27] text-white">

        {/* Hero Section */}
        <section className="min-h-screen flex flex-col justify-center items-center px-5 pt-20 pb-20 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e27] to-[#1a1f3a]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(102,126,234,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_50%,rgba(118,75,162,0.1)_0%,transparent_50%)]"></div>
          
          <div
            className="text-center max-w-6xl mx-auto relative z-10"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#667eea]/10 border border-[#667eea]/30 px-5 py-2.5 rounded-full mb-10 text-sm">
              🎭 Prime's Story Division
            </div>
            
            {/* Main Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              <div className="block mb-2">Your Money Has A</div>
              <div className="block">
                <span 
                  className="text-[#667eea]"
                  style={{
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    display: 'inline-block'
                  }}
                >
                  Story To Tell
                </span>
              </div>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/70 max-w-4xl mx-auto mb-12 leading-relaxed">
              Transform boring bank statements into Netflix-worthy financial narratives. 
              Our AI podcasters turn your spending into engaging stories that actually 
              make you want to check your finances.
            </p>
            
            {/* Stats Row */}
            <div
              className="flex flex-wrap gap-12 justify-center mb-12"
            >
              <div className="text-center p-5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-1">
                <div className="text-4xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent mb-2">
                  🎙️ 12
                </div>
                <div className="text-white/60 text-sm">AI Storytellers</div>
              </div>
              <div className="text-center p-5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-1">
                <div className="text-4xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent mb-2">
                  📖 Weekly
                </div>
                <div className="text-white/60 text-sm">Episode Releases</div>
              </div>
              <div className="text-center p-5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-1">
                <div className="text-4xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent mb-2">
                  🎧 15 min
                </div>
                <div className="text-white/60 text-sm">Average Episode</div>
              </div>
            </div>
            
            {/* CTA Button */}
            <button
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-9 py-4 rounded-xl font-semibold text-lg hover:scale-105 transition-all shadow-[0_10px_30px_rgba(102,126,234,0.3)] hover:shadow-[0_15px_40px_rgba(102,126,234,0.4)]"
            >
              📖 Create My First Story
              <span className="bg-[#00ff88] text-[#0a0e27] px-2 py-1 rounded text-xs font-bold">
                FREE
              </span>
            </button>
            
            {/* Security Badges */}
            <div
              className="flex flex-wrap gap-6 justify-center mt-8 text-white/50 text-sm"
            >
              <span>🔒 Bank-level security</span>
              <span>📊 Your data stays private</span>
              <span>⚡ Setup in 2 minutes</span>
            </div>
          </div>
        </section>

        {/* The Story Behind Our Stories Section */}
        <section className="py-20 px-5 bg-gradient-to-b from-[#0a0e27] to-[#1a1f3a]">
          <div className="max-w-7xl mx-auto">
            <div
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                The Story Behind <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent inline-block">Our Stories</span>
              </h2>
              <p className="text-white/60 text-lg max-w-3xl mx-auto">
                How we turned the most boring part of personal finance into the most entertaining
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
              <div
              >
                <h3 className="text-3xl font-bold mb-6">The Problem We Solved</h3>
                <div className="space-y-4 text-white/70">
                  <p className="text-lg">
                    <span className="text-[#667eea] font-semibold">The Challenge:</span> People hate checking their finances. 
                    Bank statements are boring, confusing, and anxiety-inducing. Most people avoid looking at their money 
                    until it's too late.
                  </p>
                  <p className="text-lg">
                    <span className="text-[#667eea] font-semibold">The Insight:</span> What if we could make financial 
                    data as engaging as your favorite podcast? What if your spending habits became characters in a story 
                    you actually wanted to follow?
                  </p>
                  <p className="text-lg">
                    <span className="text-[#667eea] font-semibold">The Solution:</span> We created AI storytellers who 
                    transform your financial data into compelling narratives, making money management entertaining and 
                    educational.
                  </p>
                </div>
              </div>

              <div
                className="bg-white/5 border border-white/10 rounded-2xl p-8"
              >
                <div className="text-center">
                  <div className="text-6xl mb-4">💡</div>
                  <h4 className="text-xl font-semibold mb-4">The "Aha!" Moment</h4>
                  <p className="text-white/60">
                    "What if your coffee addiction wasn't just a bad habit, but the plot of a mystery novel? 
                    What if your savings account was the hero of an epic adventure?"
                  </p>
                  <div className="mt-4 text-sm text-white/40">
                    — Prime, Chief Story Officer
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Meet Our AI Storytellers Section */}
        <section className="py-20 px-5 bg-[#0a0e27]">
          <div className="max-w-7xl mx-auto">
            <div
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Meet Our <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent inline-block">AI Storytellers</span>
              </h2>
              <p className="text-white/60 text-lg max-w-3xl mx-auto">
                Each AI has a unique personality and storytelling style, creating diverse narratives from your financial data
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {/* Spark */}
              <div
                className="bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-2xl p-6 hover:bg-gradient-to-br hover:from-[#667eea]/20 hover:to-[#764ba2]/20 transition-all"
              >
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                    ⚡
                  </div>
                  <h3 className="text-xl font-bold">Spark</h3>
                  <p className="text-[#667eea] text-sm">The Energetic Detective</p>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  Loves solving financial mysteries and uncovering hidden patterns. Always excited to dig into your spending data and find the "why" behind every transaction.
                </p>
                <div className="text-xs text-white/50">
                  <strong>Specialty:</strong> Spending pattern analysis, budget mysteries
                </div>
              </div>

              {/* Wisdom */}
              <div
                className="bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-2xl p-6 hover:bg-gradient-to-br hover:from-[#667eea]/20 hover:to-[#764ba2]/20 transition-all"
              >
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                    🧠
                  </div>
                  <h3 className="text-xl font-bold">Wisdom</h3>
                  <p className="text-[#667eea] text-sm">The Wise Advisor</p>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  Provides thoughtful insights and long-term financial wisdom. Great at connecting your current spending to your future goals and dreams.
                </p>
                <div className="text-xs text-white/50">
                  <strong>Specialty:</strong> Financial planning, goal setting, investment advice
                </div>
              </div>

              {/* Roast Master */}
              <div
                className="bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-2xl p-6 hover:bg-gradient-to-br hover:from-[#667eea]/20 hover:to-[#764ba2]/20 transition-all"
              >
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                    🔥
                  </div>
                  <h3 className="text-xl font-bold">Roast Master</h3>
                  <p className="text-[#667eea] text-sm">The Brutally Honest</p>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  Calls out your bad financial habits with humor and tough love. Not afraid to point out when you're being financially irresponsible.
                </p>
                <div className="text-xs text-white/50">
                  <strong>Specialty:</strong> Reality checks, habit breaking, tough love
                </div>
              </div>

              {/* Fortune */}
              <div
                className="bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-2xl p-6 hover:bg-gradient-to-br hover:from-[#667eea]/20 hover:to-[#764ba2]/20 transition-all"
              >
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                    💰
                  </div>
                  <h3 className="text-xl font-bold">Fortune</h3>
                  <p className="text-[#667eea] text-sm">The Optimistic Investor</p>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  Always sees the silver lining and potential for growth. Great at finding opportunities in your financial situation and celebrating wins.
                </p>
                <div className="text-xs text-white/50">
                  <strong>Specialty:</strong> Investment opportunities, positive reinforcement, growth mindset
                </div>
              </div>

              {/* Nova */}
              <div
                className="bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-2xl p-6 hover:bg-gradient-to-br hover:from-[#667eea]/20 hover:to-[#764ba2]/20 transition-all"
              >
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                    🌱
                  </div>
                  <h3 className="text-xl font-bold">Nova</h3>
                  <p className="text-[#667eea] text-sm">The Growth Catalyst</p>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  Focuses on personal growth and transformation. Helps you understand how your financial habits reflect your personal development journey.
                </p>
                <div className="text-xs text-white/50">
                  <strong>Specialty:</strong> Personal growth, habit formation, life transitions
                </div>
              </div>

              {/* Serenity */}
              <div
                className="bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-2xl p-6 hover:bg-gradient-to-br hover:from-[#667eea]/20 hover:to-[#764ba2]/20 transition-all"
              >
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                    🌙
                  </div>
                  <h3 className="text-xl font-bold">Serenity</h3>
                  <p className="text-[#667eea] text-sm">The Calm Guide</p>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  Provides gentle guidance and emotional support around money. Great for reducing financial anxiety and building confidence.
                </p>
                <div className="text-xs text-white/50">
                  <strong>Specialty:</strong> Financial therapy, anxiety reduction, mindful spending
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-5 bg-gradient-to-b from-[#0a0e27] to-[#1a1f3a]">
          <div className="max-w-7xl mx-auto">
            <div
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                How Your <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent inline-block">Stories Come to Life</span>
              </h2>
              <p className="text-white/60 text-lg max-w-3xl mx-auto">
                From raw financial data to engaging narratives in just a few steps
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                  1️⃣
                </div>
                <h3 className="text-xl font-bold mb-3">Upload Your Data</h3>
                <p className="text-white/70 text-sm">
                  Connect your bank accounts or upload statements. Our AI securely processes your financial data.
                </p>
              </div>

              <div
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                  2️⃣
                </div>
                <h3 className="text-xl font-bold mb-3">AI Analysis</h3>
                <p className="text-white/70 text-sm">
                  Our AI storytellers analyze your spending patterns, identify themes, and create character profiles.
                </p>
              </div>

              <div
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                  3️⃣
                </div>
                <h3 className="text-xl font-bold mb-3">Story Creation</h3>
                <p className="text-white/70 text-sm">
                  Each AI storyteller creates their unique narrative based on your data, complete with characters and plot.
                </p>
              </div>

              <div
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                  4️⃣
                </div>
                <h3 className="text-xl font-bold mb-3">Listen & Learn</h3>
                <p className="text-white/70 text-sm">
                  Enjoy your personalized financial podcast episodes and gain insights about your money habits.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sample Episodes Section */}
        <section className="py-20 px-5 bg-[#0a0e27]">
          <div className="max-w-7xl mx-auto">
            <div
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Sample <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">Episodes</span>
              </h2>
              <p className="text-white/60 text-lg max-w-2xl mx-auto">
                Listen to how we transform financial data into compelling stories
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Episode 1 */}
              <div
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:-translate-y-1 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-[#667eea]/20 text-[#667eea] px-2 py-1 rounded text-xs font-semibold">
                    EP. 03
                  </span>
                  <span className="text-white/50 text-sm">12 min</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-[#667eea] transition-colors">
                  The Mystery of the Missing Savings
                </h3>
                <p className="text-white/60 text-sm leading-relaxed mb-4">
                  Spark and Wisdom investigate where your money went this month, uncovering surprising patterns in your late-night spending.
                </p>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-sm">
                    ⚡
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-sm">
                    🧠
                  </div>
                </div>
              </div>

              {/* Episode 2 */}
              <div
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:-translate-y-1 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-[#667eea]/20 text-[#667eea] px-2 py-1 rounded text-xs font-semibold">
                    EP. 02
                  </span>
                  <span className="text-white/50 text-sm">18 min</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-[#667eea] transition-colors">
                  The Great Coffee Shop Conspiracy
                </h3>
                <p className="text-white/60 text-sm leading-relaxed mb-4">
                  Roast Master exposes your $247 monthly coffee addiction while Fortune finds the silver lining in your loyalty rewards.
                </p>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-sm">
                    🔥
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-sm">
                    💰
                  </div>
                </div>
              </div>

              {/* Episode 3 */}
              <div
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all hover:-translate-y-1 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-[#667eea]/20 text-[#667eea] px-2 py-1 rounded text-xs font-semibold">
                    EP. 01
                  </span>
                  <span className="text-white/50 text-sm">15 min</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-[#667eea] transition-colors">
                  New Beginnings & Old Habits
                </h3>
                <p className="text-white/60 text-sm leading-relaxed mb-4">
                  Your first financial story! Nova and Serenity explore your spending personality and create your money mission statement.
                </p>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-sm">
                    🌱
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-sm">
                    🌙
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Story Types Section */}
        <section className="py-20 px-5 bg-gradient-to-b from-[#0a0e27] to-[#1a1f3a]">
          <div className="max-w-7xl mx-auto">
            <div
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Types of <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">Financial Stories</span>
              </h2>
              <p className="text-white/60 text-lg max-w-3xl mx-auto">
                From mysteries to adventures, your financial data becomes the foundation for engaging narratives
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
              >
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold mb-3">Financial Mysteries</h3>
                <p className="text-white/70 text-sm mb-4">
                  "The Case of the Disappearing Savings" - Spark investigates where your money went and uncovers hidden spending patterns.
                </p>
                <div className="text-xs text-white/50">
                  Perfect for: Budget analysis, spending pattern discovery
                </div>
              </div>

              <div
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
              >
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-xl font-bold mb-3">Success Adventures</h3>
                <p className="text-white/70 text-sm mb-4">
                  "The Quest for Financial Freedom" - Follow your journey from debt to wealth with Fortune as your guide.
                </p>
                <div className="text-xs text-white/50">
                  Perfect for: Goal tracking, milestone celebrations
                </div>
              </div>

              <div
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
              >
                <div className="text-4xl mb-4">💔</div>
                <h3 className="text-xl font-bold mb-3">Financial Dramas</h3>
                <p className="text-white/70 text-sm mb-4">
                  "The Great Coffee Shop Conspiracy" - Roast Master exposes your expensive habits with humor and tough love.
                </p>
                <div className="text-xs text-white/50">
                  Perfect for: Habit awareness, reality checks
                </div>
              </div>

              <div
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
              >
                <div className="text-4xl mb-4">🌱</div>
                <h3 className="text-xl font-bold mb-3">Growth Journeys</h3>
                <p className="text-white/70 text-sm mb-4">
                  "The Transformation of a Spender" - Nova chronicles your evolution from impulse buyer to mindful consumer.
                </p>
                <div className="text-xs text-white/50">
                  Perfect for: Personal development, habit changes
                </div>
              </div>

              <div
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
              >
                <div className="text-4xl mb-4">🧘</div>
                <h3 className="text-xl font-bold mb-3">Mindful Moments</h3>
                <p className="text-white/70 text-sm mb-4">
                  "The Art of Conscious Spending" - Serenity guides you through mindful financial decisions and peace of mind.
                </p>
                <div className="text-xs text-white/50">
                  Perfect for: Stress reduction, mindful spending
                </div>
              </div>

              <div
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
              >
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-bold mb-3">Strategic Plans</h3>
                <p className="text-white/70 text-sm mb-4">
                  "The Master Plan for Wealth" - Wisdom creates a comprehensive strategy for your financial future.
                </p>
                <div className="text-xs text-white/50">
                  Perfect for: Long-term planning, investment strategy
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 px-5 bg-[#0a0e27]">
          <div className="max-w-4xl mx-auto text-center">
            <div
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Turn Your <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">Money Into Stories?</span>
              </h2>
              <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of users who've transformed their financial anxiety into entertainment and education. 
                Your money has a story to tell - let our AI storytellers help you discover it.
              </p>
              <button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-9 py-4 rounded-xl font-semibold text-lg hover:shadow-[0_15px_40px_rgba(102,126,234,0.4)] transition-all"
              >
                📖 Start Your Financial Story Today
                <span className="bg-[#00ff88] text-[#0a0e27] px-2 py-1 rounded text-xs font-bold">
                  FREE
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </WebsiteLayout>
  );
};

export default FinancialStoryPage;




