import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { ArrowRight, Sparkles, CheckCircle, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const testimonials = [
  {
    name: 'Samantha R.',
    quote: 'I uploaded 5 years of messy PDFs and the AI sorted everything in minutes. No more manual entry!'
  },
  {
    name: 'David K.',
    quote: 'Smart Import AI handled my credit union’s weird CSV format perfectly. It even learned my custom categories.'
  },
  {
    name: 'Priya S.',
    quote: 'I imported statements from 4 banks and the AI reconciled everything. This is a game changer for my business.'
  }
];

const faqs = [
  {
    question: 'What formats does Smart Import AI support?',
    answer: 'PDF, CSV, images, scans – any bank statement format from any institution.'
  },
  {
    question: 'Is my financial data secure?',
    answer: 'Yes. All uploads are encrypted with bank-level security and never shared or sold.'
  },
  {
    question: 'Can it handle multiple banks and years of data?',
    answer: 'Absolutely. Upload as many statements as you want – Smart Import AI reconciles and learns from all of them.'
  },
  {
    question: 'How does the AI learn?',
    answer: 'It remembers formatting quirks, categorization preferences, and gets smarter with every document you upload.'
  }
];

const SmartImportAIPage = () => {
  // Simulated file upload demo
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<null | string>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setProcessing(true);
      setResult(null);
      setTimeout(() => {
        setProcessing(false);
        setResult('Success! 1,234 transactions imported, 99% auto-categorized. AI learned 3 new bank formats.');
      }, 2000);
    }
  };

  return (
    <WebsiteLayout>
      <Helmet>
        <title>Smart Import AI – AI Bank Statement Reader | XspensesAI</title>
        <meta name="description" content="Upload any bank statement – PDF, CSV, image. Smart Import AI reads, categorizes, and learns from every format. Try the breakthrough AI bank statement parser free!" />
        <meta property="og:title" content="Smart Import AI – AI Bank Statement Reader | XspensesAI" />
        <meta property="og:description" content="Upload any bank statement – PDF, CSV, image. Smart Import AI reads, categorizes, and learns from every format. Try the breakthrough AI bank statement parser free!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://xspensesai.com/features/smart-import-ai" />
        <meta property="og:image" content="/public/assets/xspensesai-logo.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Smart Import AI – AI Bank Statement Reader | XspensesAI" />
        <meta name="twitter:description" content="Upload any bank statement – PDF, CSV, image. Smart Import AI reads, categorizes, and learns from every format. Try the breakthrough AI bank statement parser free!" />
        <meta name="twitter:image" content="/public/assets/xspensesai-logo.svg" />
        {/* SoftwareApplication Schema */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "XspensesAI Smart Import AI",
            "operatingSystem": "All",
            "applicationCategory": "FinanceApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "featureList": [
              "AI-powered document parsing",
              "Reads any bank statement format (PDF, CSV, image)",
              "Auto-categorizes transactions",
              "Learns user and bank preferences",
              "Multi-bank reconciliation",
              "Advanced OCR and error correction"
            ],
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "10000"
            },
            "publisher": {
              "@type": "Organization",
              "name": "XspensesAI",
              "url": "https://xspensesai.com"
            }
          }
        `}</script>
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Finally, AI That Actually Reads Your Bank Statements</h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto mb-8">
            Upload any bank statement – PDF, CSV, or image. Smart Import AI parses, categorizes, and learns from every format. No more manual entry. No more errors. Just instant, intelligent import.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link to="/signup" className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:from-pink-500 hover:to-orange-500 transition-all duration-300">
              Try Smart Import Free
            </Link>
            <Link to="/ai-demo" className="inline-block border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all duration-300">
              See AI Demo
            </Link>
          </div>
        </div>
      </section>
      {/* Multi-Method Import Section */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Every Way to Get Your Data Into XspensesAI
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Bank Statement Upload */}
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">📄</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Bank Statements</h3>
              <p className="text-sm text-gray-600">PDF or CSV from any bank worldwide</p>
            </div>
            {/* Receipt Scanner */}
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">📸</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Receipt Scanner</h3>
              <p className="text-sm text-gray-600">Snap photos - AI extracts everything</p>
            </div>
            {/* Email Forwarding */}
            <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">📧</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Forwarding</h3>
              <p className="text-sm text-gray-600">Forward receipts to your AI assistant</p>
            </div>
            {/* Manual Entry */}
            <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">✍️</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Quick Entry</h3>
              <p className="text-sm text-gray-600">AI learns as you type</p>
            </div>
          </div>
        </div>
      </div>
      {/* Interactive Receipt Demo */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Receipt Scanner + AI Learning Demo
          </h2>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Receipt Upload Area */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Snap Any Receipt</h3>
                <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center bg-purple-50">
                  <div className="text-4xl mb-3">📸</div>
                  <p className="text-gray-600 mb-4">Take a photo or upload image</p>
                  <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg">
                    Try Demo Upload
                  </button>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  ✓ Works with crumpled receipts  ✓ Any lighting  ✓ Multiple languages
                </div>
              </div>
              {/* AI Processing Results */}
              <div>
                <h3 className="text-lg font-semibold mb-4">AI Extracts Everything</h3>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Uber Eats</span>
                    <span className="text-green-600">$24.99</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    📅 Dec 15, 2024  📍 Downtown location
                  </div>
                  <div className="bg-white rounded p-3">
                    <div className="text-sm font-medium text-purple-600 mb-1">
                      🤖 AI Categorized as "Meals"
                    </div>
                    <div className="text-xs text-gray-600">
                      "Want me to tag all Uber Eats as Meals?"
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <button className="bg-purple-600 text-white px-3 py-1 rounded text-xs">
                        Yes, Remember This
                      </button>
                      <button className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs">
                        No Thanks
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Email Forwarding Setup */}
      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Email Forwarding Made Simple
          </h2>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white">1</span>
                </div>
                <h4 className="font-semibold mb-2">Get Your AI Email</h4>
                <p className="text-sm text-gray-600">yourname@xspensesai.com</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white">2</span>
                </div>
                <h4 className="font-semibold mb-2">Forward Receipts</h4>
                <p className="text-sm text-gray-600">From any email provider</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white">3</span>
                </div>
                <h4 className="font-semibold mb-2">AI Processes</h4>
                <p className="text-sm text-gray-600">Automatically categorized</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Interactive File Upload Demo */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-purple-900">Try Smart Import AI</h2>
          <p className="text-lg text-gray-700 mb-8">Upload a sample bank statement and watch the AI work its magic.</p>
          <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center mx-auto max-w-lg">
            <input
              type="file"
              accept=".pdf,.csv,.jpg,.jpeg,.png"
              className="mb-4"
              onChange={handleFileChange}
              aria-label="Upload bank statement"
            />
            {processing && (
              <div className="flex flex-col items-center">
                <Sparkles className="w-8 h-8 text-purple-500 animate-spin mb-2" />
                <span className="text-purple-700 font-semibold">Processing your document...</span>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse" style={{ width: '80%' }}></div>
                </div>
              </div>
            )}
            {result && (
              <div className="mt-4 text-green-700 font-semibold flex flex-col items-center">
                <CheckCircle className="w-8 h-8 mb-2" />
                {result}
              </div>
            )}
            {!processing && !result && (
              <div className="text-gray-500 text-sm">Supported: PDF, CSV, JPG, PNG. Bank-level security.</div>
            )}
          </div>
        </div>
      </section>
      {/* Before/After Example */}
      <section className="py-16 bg-white">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-purple-900">Messy PDFs? Complex CSVs? No Problem.</h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 shadow-lg text-center">
              <h3 className="text-xl font-bold mb-2 text-gray-700">Before: Manual Entry</h3>
              <img src="/public/assets/before-import.png" alt="Messy bank statement PDF" className="rounded-lg mx-auto mb-4" />
              <p className="text-gray-600">Hours spent copying, pasting, and fixing errors. Missed transactions. Frustration.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-8 shadow-lg text-center">
              <h3 className="text-xl font-bold mb-2 text-purple-900">After: Smart Import AI</h3>
              <img src="/public/assets/after-import.png" alt="Cleaned, categorized transactions" className="rounded-lg mx-auto mb-4" />
              <p className="text-purple-900">Instant, accurate import. Clean data. Auto-categorized. Ready for analysis and goal planning.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Bank Compatibility Showcase */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-purple-900">Works With Any Bank, Credit Union, or Format</h2>
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <span className="bg-white rounded-lg px-4 py-2 shadow text-purple-700 font-semibold">Chase</span>
            <span className="bg-white rounded-lg px-4 py-2 shadow text-purple-700 font-semibold">Bank of America</span>
            <span className="bg-white rounded-lg px-4 py-2 shadow text-purple-700 font-semibold">Wells Fargo</span>
            <span className="bg-white rounded-lg px-4 py-2 shadow text-purple-700 font-semibold">Citi</span>
            <span className="bg-white rounded-lg px-4 py-2 shadow text-purple-700 font-semibold">Capital One</span>
            <span className="bg-white rounded-lg px-4 py-2 shadow text-purple-700 font-semibold">Credit Unions</span>
            <span className="bg-white rounded-lg px-4 py-2 shadow text-purple-700 font-semibold">International Banks</span>
            <span className="bg-white rounded-lg px-4 py-2 shadow text-purple-700 font-semibold">More...</span>
          </div>
          <p className="text-gray-700">Smart Import AI learns and remembers each bank’s unique format for perfect imports every time.</p>
        </div>
      </section>
      {/* Learning & Memory Capabilities */}
      <section className="py-16 bg-white">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-purple-900">AI That Gets Smarter With Every Document</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4" role="img" aria-label="Pattern recognition">🔍</span>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">Pattern Recognition</h3>
              <p className="text-gray-700">Learns bank-specific quirks, recurring vendors, and your categorization style.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4" role="img" aria-label="Memory">💾</span>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">Memory & Adaptation</h3>
              <p className="text-gray-700">Remembers your corrections and gets more accurate with every upload.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4" role="img" aria-label="Speed">⚡</span>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">Speed & Scale</h3>
              <p className="text-gray-700">Processes years of history in minutes. Handles thousands of transactions at once.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Competitive Comparison */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-purple-900">How Smart Import AI Compares</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
              <h3 className="text-xl font-bold mb-2 text-gray-700">Manual Entry</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 text-left">
                <li>Hours of tedious work</li>
                <li>Prone to errors</li>
                <li>Missed transactions</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
              <h3 className="text-xl font-bold mb-2 text-gray-700">Other Apps</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 text-left">
                <li>Limited bank API connections</li>
                <li>Generic OCR misses financial context</li>
                <li>Manual CSV formatting required</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-lg p-8 text-center border border-purple-200">
              <h3 className="text-xl font-bold mb-2 text-purple-900">Smart Import AI</h3>
              <ul className="list-disc pl-6 text-purple-900 space-y-2 text-left">
                <li>Reads any format, any bank</li>
                <li>Auto-categorizes and learns</li>
                <li>Processes years of data in minutes</li>
                <li>Bank-level security</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {/* CTAs and Social Proof */}
      <section className="py-16 bg-white">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-purple-900">Ready to Replace Manual Entry With AI Magic?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/signup" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center justify-center gap-2">
              Try Smart Import Free <ArrowRight className="inline-block ml-2 w-5 h-5" />
            </Link>
            <Link to="/pricing" className="border-2 border-purple-500 text-purple-700 px-8 py-4 rounded-lg font-semibold hover:bg-purple-50 transition-all duration-300">
              View Pricing
            </Link>
            <Link to="/ai-demo" className="border-2 border-pink-500 text-pink-700 px-8 py-4 rounded-lg font-semibold hover:bg-pink-50 transition-all duration-300">
              See AI Demo
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mt-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-lg p-8 border border-gray-100 flex flex-col items-center text-center">
                <Play className="w-8 h-8 text-pink-500 mb-4 animate-pulse" aria-label="Testimonial audio" />
                <p className="italic text-gray-700 mb-4">"{t.quote}"</p>
                <div className="font-semibold text-purple-900">{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4 text-center">Smart Import AI FAQ</h2>
          <p className="text-purple-700 text-center mb-10">Everything you need to know about the breakthrough AI bank statement reader.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default SmartImportAIPage; 