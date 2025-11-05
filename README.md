# 🚀 XspensesAI - Enterprise-Grade Financial AI Platform

> **AI-Powered Financial Management with Privacy-First Guardrails**

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-38B2AC.svg)](https://tailwindcss.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-purple.svg)](https://openai.com/)
[![Netlify](https://img.shields.io/badge/Netlify-Functions-orange.svg)](https://netlify.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)](https://supabase.com/)

---

## 🎯 **Vision**

XspensesAI is an enterprise-grade financial AI platform that combines cutting-edge AI technology with robust security guardrails, PII protection, and intelligent document processing. Built for production with privacy-first design and comprehensive audit trails.

---

## 🌟 **Key Features**

### 🤖 **AI-Powered Document Processing**
- **OCR Pipeline**: Multi-provider OCR (local, OCR.Space, Google Vision)
- **Intelligent Parsing**: Automatic invoice/receipt/bank statement parsing
- **Transaction Normalization**: Structured data extraction with deduplication
- **Auto-Categorization**: Rule-based + LLM fallback categorization

### 🛡️ **Enterprise Security**
- **Guardrails System**: 40+ PII patterns, OpenAI moderation, jailbreak detection
- **PII Masking**: Real-time masking during streaming (SSE)
- **Audit Trail**: Complete logging with SHA256 hashing
- **GDPR/CCPA/HIPAA Compliant**: Full regulatory compliance

### 🧠 **Long-Term Memory (RAG)**
- **Semantic Recall**: Vector embeddings with pgvector
- **Session Summaries**: Automatic conversation summarization
- **Vendor Aliases**: Canonical vendor name matching
- **Memory Facts**: User-specific fact storage and recall

### 🎯 **AI Employee Routing**
- **Intent Detection**: Deterministic + LLM fallback routing
- **4 Employees**: Prime (chat), Crystal (analytics), Tag (categorization), Byte (OCR/tools)
- **Confidence Scoring**: Transparent routing decisions
- **Orchestration Logging**: Complete routing audit trail

### 🎮 **Gamification**
- **XP System**: Points for scans, categorizations, corrections
- **Vendor Matching**: Confidence-based alias reinforcement
- **Memory Teaching**: User corrections improve accuracy

---

## 🏗️ **Architecture**

### **Frontend**
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Server-Sent Events (SSE)** for streaming

### **Backend**
- **Netlify Functions** (serverless)
- **Supabase** (PostgreSQL + pgvector)
- **OpenAI API** (GPT-4o-mini, text-embedding-3-large)
- **Node.js 20** with TypeScript

### **Core Modules**

```
netlify/functions/
├── chat.ts                    # Main chat endpoint (SSE streaming)
├── ocr.ts                      # OCR processing endpoint
├── transactions.ts             # Transaction listing API
├── teach-category.ts           # Category correction API
└── _shared/
    ├── guardrails.ts          # Guardrails engine
    ├── pii-patterns.ts        # 40+ PII detectors
    ├── memory.ts              # RAG memory system
    ├── prime_router.ts        # Employee routing
    ├── ocr_providers.ts       # OCR provider abstraction
    ├── ocr_parsers.ts         # Document parsing
    ├── ocr_normalize.ts       # Transaction normalization
    ├── ocr_memory.ts          # Vendor matching
    ├── xp.ts                  # XP engine
    └── sql/                   # Idempotent migrations
```

---

## 📋 **Response Headers Contract**

All API endpoints return standardized headers for transparency:

### **Core Headers (8)**
- `X-Guardrails`: `active` | `inactive` | `blocked`
- `X-PII-Mask`: `enabled` | `disabled`
- `X-Memory-Hit`: `0.00` - `1.00` (top similarity score)
- `X-Memory-Count`: `0` - `N` (facts recalled)
- `X-Session-Summary`: `present` | `absent`
- `X-Session-Summarized`: `yes` | `no` | `async`
- `X-Employee`: `prime` | `crystal` | `tag` | `byte`
- `X-Route-Confidence`: `0.00` - `1.00` (routing confidence)

### **OCR-Specific Headers**
- `X-OCR-Provider`: `local` | `ocrspace` | `vision` | `none`
- `X-OCR-Parse`: `invoice` | `receipt` | `bank` | `none`
- `X-Transactions-Saved`: `0` - `N`
- `X-Categorizer`: `rules` | `tag` | `none`
- `X-Vendor-Matched`: `yes` | `no`
- `X-XP-Awarded`: `0` - `N`

**See**: [`docs/HEADERS.md`](docs/HEADERS.md) for complete documentation.

---

## 🗄️ **Database Schema**

All migrations use **idempotent** patterns (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`):

### **Core Tables**
- `user_memory_facts` - Memory facts for RAG recall
- `memory_embeddings` - Vector embeddings (pgvector)
- `chat_convo_summaries` - Session summaries
- `orchestration_events` - Employee routing logs
- `transactions` - Normalized transactions
- `transaction_items` - Transaction line items
- `vendor_aliases` - Vendor canonicalization
- `user_xp_ledger` - XP points ledger
- `guardrail_events` - Guardrails audit trail

**See**: [`docs/DB.md`](docs/DB.md) for complete schema documentation.

---

## 🎯 **Employee Routing**

Requests are automatically routed to the appropriate AI employee:

- **Prime** 👑: General chat, orchestration, planning
- **Crystal** 🔍: Analytics, insights, metrics, SEO
- **Tag** 🏷️: Categorization, transactions, receipts, PII
- **Byte** 💻: Code, tools, OCR, ingestion, parsing

**See**: [`docs/ROUTING.md`](docs/ROUTING.md) for routing rules and examples.

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 20+
- pnpm (enabled via corepack)
- Supabase account
- OpenAI API key

### **Installation**

```bash
# Clone repository
git clone https://github.com/dwarner13/newxspensesai.git
cd newxspensesai

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your keys (see Environment Variables below)
```

### **Run Migrations**

1. Open Supabase Dashboard → SQL Editor
2. Run migrations in order:
   - `netlify/functions/_shared/sql/day4_memory.sql`
   - `netlify/functions/_shared/sql/day5_session_summaries.sql`
   - `netlify/functions/_shared/sql/day6_orchestration_events.sql`
   - `netlify/functions/_shared/sql/day9_transactions.sql`
   - `netlify/functions/_shared/sql/day10_memory_xp.sql`

### **Start Development**

```bash
# Start Netlify Dev (includes functions + frontend)
npx netlify dev

# Or start separately:
# Terminal 1: Frontend
npm run dev

# Terminal 2: Functions (via Netlify Dev)
npx netlify dev
```

---

## 🔧 **Environment Variables**

### **Required**

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...
```

### **Optional**

```env
# OCR Providers
OCRSPACE_API_KEY=your-ocrspace-key          # For OCR.Space API
GOOGLE_APPLICATION_CREDENTIALS=path/to/json # For Google Vision API

# Feature Flags
ENABLE_GUARDRAILS=true                      # Enable guardrails (default: true)
ENABLE_PII_MASKING=true                    # Enable PII masking (default: true)
ENABLE_MEMORY=true                         # Enable memory/RAG (default: true)
ENABLE_XP=true                             # Enable XP system (default: true)
```

---

## 📚 **Documentation**

### **Core Docs**
- [`docs/HEADERS.md`](docs/HEADERS.md) - Response headers contract
- [`docs/DB.md`](docs/DB.md) - Database schema and migrations
- [`docs/ROUTING.md`](docs/ROUTING.md) - Employee routing system

### **Implementation Reports**

#### **Days 1-4: Foundation**
- [`reports/DAYS1-4_STATUS.md`](reports/DAYS1-4_STATUS.md) - Status audit
- [`reports/DAYS1-4_GAPS.md`](reports/DAYS1-4_GAPS.md) - Gap analysis
- [`reports/DAYS1-4_NEXT_ACTIONS.md`](reports/DAYS1-4_NEXT_ACTIONS.md) - Next steps

#### **Day 4: Memory Unification**
- [`reports/DAY4_PLAN.md`](reports/DAY4_PLAN.md) - Implementation plan
- [`reports/DAY4_CHANGELOG.md`](reports/DAY4_CHANGELOG.md) - Changes summary
- [`reports/DAY4_VALIDATION.md`](reports/DAY4_VALIDATION.md) - Testing guide
- [`reports/DAY4_RESULTS.md`](reports/DAY4_RESULTS.md) - Test results

#### **Day 5: Session Summaries**
- [`reports/DAY5_PLAN.md`](reports/DAY5_PLAN.md) - Implementation plan
- [`reports/DAY5_CHANGELOG.md`](reports/DAY5_CHANGELOG.md) - Changes summary
- [`reports/DAY5_VALIDATION.md`](reports/DAY5_VALIDATION.md) - Testing guide
- [`reports/DAY5_RESULTS.md`](reports/DAY5_RESULTS.md) - Test results

#### **Day 6: Employee Routing**
- [`reports/DAY6_PLAN.md`](reports/DAY6_PLAN.md) - Implementation plan
- [`reports/DAY6_CHANGELOG.md`](reports/DAY6_CHANGELOG.md) - Changes summary
- [`reports/DAY6_VALIDATION.md`](reports/DAY6_VALIDATION.md) - Testing guide
- [`reports/DAY6_RESULTS.md`](reports/DAY6_RESULTS.md) - Test results

#### **Day 7: Streaming Polish**
- [`reports/DAY7_PLAN.md`](reports/DAY7_PLAN.md) - Implementation plan
- [`reports/DAY7_CHANGELOG.md`](reports/DAY7_CHANGELOG.md) - Changes summary
- [`reports/DAY7_VALIDATION.md`](reports/DAY7_VALIDATION.md) - Testing guide
- [`reports/DAY7_RESULTS.md`](reports/DAY7_RESULTS.md) - Test results

#### **Day 8: OCR & Ingestion (Phase 1)**
- [`reports/DAY8_PLAN.md`](reports/DAY8_PLAN.md) - Implementation plan
- [`reports/DAY8_CHANGELOG.md`](reports/DAY8_CHANGELOG.md) - Changes summary
- [`reports/DAY8_VALIDATION.md`](reports/DAY8_VALIDATION.md) - Testing guide
- [`reports/DAY8_RESULTS.md`](reports/DAY8_RESULTS.md) - Test results

#### **Day 9: OCR & Ingestion (Phase 2)**
- [`reports/DAY9_PLAN.md`](reports/DAY9_PLAN.md) - Implementation plan
- [`reports/DAY9_CHANGELOG.md`](reports/DAY9_CHANGELOG.md) - Changes summary
- [`reports/DAY9_VALIDATION.md`](reports/DAY9_VALIDATION.md) - Testing guide
- [`reports/DAY9_RESULTS.md`](reports/DAY9_RESULTS.md) - Test results

#### **Day 10: OCR ↔ Memory ↔ XP**
- [`reports/DAY10_PLAN.md`](reports/DAY10_PLAN.md) - Implementation plan
- [`reports/DAY10_CHANGELOG.md`](reports/DAY10_CHANGELOG.md) - Changes summary
- [`reports/DAY10_VALIDATION.md`](reports/DAY10_VALIDATION.md) - Testing guide
- [`reports/DAY10_RESULTS.md`](reports/DAY10_RESULTS.md) - Test results

#### **Day 11: Transactions Page**
- [`reports/DAY11_PLAN.md`](reports/DAY11_PLAN.md) - Implementation plan
- [`reports/DAY11_CHANGELOG.md`](reports/DAY11_CHANGELOG.md) - Changes summary
- [`reports/DAY11_VALIDATION.md`](reports/DAY11_VALIDATION.md) - Testing guide
- [`reports/DAY11_RESULTS.md`](reports/DAY11_RESULTS.md) - Test results

---

## 🧪 **Testing**

### **Run Tests**

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test netlify/functions/_shared/__tests__/memory.test.ts

# Run tests in watch mode
pnpm test --watch
```

### **Test Coverage**

- ✅ Memory system (recall, store, deduplication)
- ✅ PII patterns (40+ detectors, URL masking)
- ✅ Guardrails (moderation, logging)
- ✅ Employee routing (intent detection, confidence)
- ✅ OCR providers (fallback logic)
- ✅ OCR parsers (invoice, receipt, bank)
- ✅ Transaction normalization
- ✅ Vendor matching
- ✅ XP engine (idempotency)

---

## 🔒 **Security & Privacy**

### **Guardrails System**
- **40+ PII Patterns**: Comprehensive detection
- **OpenAI Moderation**: Content moderation API
- **Jailbreak Detection**: LLM-based attack detection
- **Audit Trail**: Complete logging with SHA256 hashing

### **PII Masking**
- **Real-time Masking**: On-the-fly during SSE streaming
- **Strategy Options**: Full mask, last-4, selective
- **URL Query Masking**: PII in URL parameters
- **Unicode-Safe**: Proper handling of multi-byte characters

### **Privacy-First Design**
- **PII Masked Before Storage**: No raw PII in database
- **Hash-Based Deduplication**: SHA256 hashing for facts
- **User Isolation**: All queries scoped by `user_id`
- **GDPR/CCPA/HIPAA Compliant**: Full regulatory compliance

---

## 🚀 **Deployment**

### **Netlify Deployment**

1. Connect GitHub repository to Netlify
2. Set build command: `pnpm build`
3. Set publish directory: `dist`
4. Configure environment variables (see above)
5. Deploy!

### **Supabase Setup**

1. Create Supabase project
2. Run migrations (see Database Schema above)
3. Enable pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Configure RLS policies (if needed)

---

## 📊 **Monitoring**

### **Response Headers**
Monitor headers for system health:
- `X-Guardrails`: Should always be `active`
- `X-PII-Mask`: Should always be `enabled`
- `X-Memory-Hit`: Track memory recall effectiveness
- `X-Route-Confidence`: Track routing accuracy

### **Database Queries**

```sql
-- Guardrails blocks (last 24h)
SELECT COUNT(*) FROM guardrail_events 
WHERE blocked = true AND created_at > NOW() - INTERVAL '24 hours';

-- Memory recall effectiveness
SELECT AVG(CAST(meta->>'memory_hit' AS numeric)) 
FROM guardrail_events 
WHERE stage = 'chat' AND created_at > NOW() - INTERVAL '24 hours';

-- Employee routing distribution
SELECT employee, COUNT(*) 
FROM orchestration_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY employee;
```

---

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### **Development Setup**

```bash
# Fork the repository
# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes
# Test thoroughly
pnpm test

# Commit with conventional commits
git commit -m "feat: add amazing new feature"

# Push and create a pull request
```

### **Code Style**

- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- Test coverage required for new features

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 **Contact & Support**

- **GitHub**: [dwarner13/newxspensesai](https://github.com/dwarner13/newxspensesai)
- **Issues**: [GitHub Issues](https://github.com/dwarner13/newxspensesai/issues)

---

## 🙏 **Acknowledgments**

- OpenAI for GPT-4 and embeddings
- Supabase for backend infrastructure
- Netlify for serverless hosting
- The open-source community for amazing tools

---

**Made with ❤️ by the XspensesAI Team**

*Enterprise-grade financial AI with privacy-first design.*
