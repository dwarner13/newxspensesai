# XspensesAI - Complete src/ Directory Structure

Generated: $(date)

## 1. Directory Tree Overview

```
src/
├── __tests__/                    # Test files
├── agent/                       # Agent system (50+ tool implementations)
├── agents/                      # Legacy agent implementations
├── ai/                          # AI-specific code (Prime, Tag SDK)
├── ai-knowledge/                # Knowledge bases for Byte & Crystal
├── archived/                    # Archived/legacy pages
├── client/                      # Client-side services (PDF, OCR)
├── components/                  # React components (200+ files)
│   ├── access/                  # Access control components
│   ├── ai/                      # AI assistant components
│   ├── Analytics/               # Analytics components
│   ├── chat/                    # Chat interface components (32 files)
│   ├── dashboard/               # Dashboard cards/components (48 files)
│   ├── transactions/            # Transaction components (12 files) ✅
│   ├── prime/                   # Prime-specific components (17 files)
│   └── workspace/               # Workspace panels (50 files)
├── config/                      # Configuration files
├── constants/                   # Constants
├── contexts/                    # React contexts (8 files)
├── data/                        # Mock data & employee configs
├── database/                    # Database schemas
├── employees/                   # Employee registry
├── hooks/                       # Custom React hooks (36 files) ✅
├── layouts/                     # Page layouts (2 files)
├── lib/                         # Utility libraries (70 files) ✅
├── navigation/                  # Navigation configs
├── orchestrator/                # AI orchestrator system
├── pages/                       # Page components (201 files)
│   └── dashboard/               # Dashboard pages (50+ files) ✅
├── routes/                      # API routes
├── server/                      # Server-side utilities
├── services/                    # Service layer
├── settings/                    # Settings components
├── store/                       # State management
├── styles/                      # Global styles
├── systems/                     # System modules
├── theme/                       # Theme configuration
├── types/                       # TypeScript types (11 files) ✅
├── ui/                          # UI primitives (12 files)
└── utils/                       # Utility functions (42 files)
```

---

## 2. Key Directories - Complete File Lists

### 2.1 `src/hooks/` - All Custom Hooks (36 files)

✅ **Transaction-Related Hooks (EXIST):**
- `useTransactions.ts` ✅
- `usePendingTransactions.ts` ✅
- `useTransactionFilters.ts` ✅

**Chat-Related Hooks:**
- `usePrimeChat.ts` ✅
- `useChat.ts` ✅
- `useChatHistory.ts` ✅
- `useChatSessions.ts` ✅

**Other Hooks:**
- `useActivityFeed.ts`
- `useAdminAccess.ts`
- `useAIEmployees.ts`
- `useAIMemory.ts`
- `useByteQueueStats.ts`
- `useCreateExpenseModal.ts`
- `useDesktopRevolution.ts`
- `useEventTap.ts`
- `useHeadersDebug.ts`
- `useLocalStorage.ts`
- `useLowConfidenceQueue.ts`
- `useMetrics.ts`
- `useMobileRevolution.ts`
- `useMockData.ts`
- `useMonthSelection.ts`
- `useNotifications.ts`
- `useNotificationSpacing.ts`
- `usePagePersistence.ts`
- `usePrimeAutoGreet.ts`
- `usePrimeIntro.ts`
- `usePrimeLiveStats.ts`
- `usePullToRefresh.ts`
- `useScrollToTop.ts`
- `useSmartHandoff.ts`
- `useSmartImport.ts`
- `useSyncStatus.ts`
- `useUnifiedChatLauncher.ts`
- `useXpSystem.ts`

**Legacy:**
- `_legacy/useChat.ts`

---

### 2.2 `src/components/transactions/` - Transaction Components (12 files)

✅ **EXISTING Components:**
1. `AIConfidenceIndicator.tsx`
2. `CategoryBreakdownChart.tsx`
3. `ConfidenceBar.tsx` ✅ (from Phase 2.2)
4. `HighlightAIAssistant.tsx`
5. `LowConfidenceQueue.tsx`
6. `TransactionCard.tsx`
7. `TransactionCards.tsx`
8. `TransactionCategorizer.tsx`
9. `TransactionDetailModal.tsx`
10. `TransactionDetailPanel.tsx` ✅ (from Phase 1.2)
11. `TransactionList.tsx` ✅ (from Phase 1.2)
12. `TransactionRow.tsx` ✅ (from Phase 1.2)

**MISSING Components (from spec):**
- `PendingReviewCard.tsx` (Phase 3)
- `BulkActionsBar.tsx` (Phase 2.4)
- `SuggestionChips.tsx` (Phase 2.3)
- `DuplicateWarning.tsx` (Phase 2.1)
- `ReceiptPreview.tsx` (Phase 2.5)
- `SplitTransactionModal.tsx` (Phase 2.7)
- `SemanticSearch.tsx` (Phase 2.8)
- `RecurringBadge.tsx` (Phase 2.9)
- `ProgressIndicator.tsx` (Phase 2.10)

---

### 2.3 `src/pages/dashboard/` - Dashboard Pages (50+ files)

**Key Pages:**
- `TransactionsPage.tsx` ✅ (Current implementation exists)
- `PrimeChatPage.tsx`
- `SmartImportChatPage.tsx`
- `SmartImportAIPage.tsx`
- `AnalyticsPage.tsx`
- `AnalyticsAIPage.tsx`
- `AIChatAssistantPage.tsx`
- `AICategorizationPage.tsx`
- `AIFinancialAssistantPage.tsx`
- `AIFinancialFreedomPage.tsx`
- `AIFinancialTherapist.tsx`
- `AIGoalConcierge.tsx`
- `BankAccountsPage.tsx`
- `BillRemindersPage.tsx`
- `BusinessIntelligence.tsx`
- `BusinessPage.tsx`
- `DashboardTransactionsPage.tsx`
- `DebtPayoffPlannerPage.tsx`
- `EmployeeChatPage.tsx`
- `EntertainmentPage.tsx`
- `FinancialStoryPage.tsx`
- `FinancialTherapistPage.tsx`
- `GoalConciergePage.tsx`
- `OverviewPage.tsx`
- `PersonalPodcast.tsx`
- `PersonalPodcastPage.tsx`
- `PlanningPage.tsx`
- `Reports.tsx`
- `ReportsPage.tsx`
- `SecurityCompliance.tsx`
- `Settings.tsx`
- `SettingsPage.tsx`
- `SmartAutomation.tsx`
- `SmartCategoriesPage.tsx`
- `SpendingPredictionsPage.tsx`
- `SpotifyIntegrationDashboard.tsx`
- `SpotifyIntegrationPage.tsx`
- `TaxAssistant.tsx`
- `TaxAssistantPage.tsx`
- `TeamRoom.tsx`
- `TestPage.tsx`
- `TherapistDemoPage.tsx`
- `WellnessStudioPage.tsx`
- `WorkflowAutomation.tsx`
- `WorkspacePage.tsx`

---

### 2.4 `src/lib/` - Utility Libraries (70 files)

✅ **Transaction-Related Utilities (EXIST):**
- `confidenceScoring.ts` ✅ (from Phase 2.2)
- `duplicateDetection.ts` ✅ (from Phase 2.1)

**MISSING Utilities (from spec):**
- `smartSuggestions.ts` (Phase 2.3)
- `bulkOperations.ts` (Phase 2.4)
- `userLearning.ts` (Phase 2.6)
- `splitDetection.ts` (Phase 2.7)
- `semanticSearch.ts` (Phase 2.8)
- `recurringDetection.ts` (Phase 2.9)
- `gamification.ts` (Phase 2.10)

**Other Utilities:**
- `advancedOCRService.ts`
- `ai-employees.ts`
- `aiEmployeeDocumentProcessor.ts`
- `aiEmployeeProcessor.ts`
- `aiEmployeeTasks.ts`
- `aiMemorySystem.ts`
- `api/chat.ts`
- `api/history.ts`
- `api/summary.ts`
- `boss/actions.ts`
- `boss/intents.ts`
- `boss/openaiClient.ts`
- `boss/prompt.ts`
- `bus.ts`
- `categories.ts`
- `categoryLearningSystem.ts`
- `chat-api.ts`
- `chatEndpoint.ts`
- `cleanText.js`
- `cloudStorageService.ts`
- `comprehensiveFinancialAutomation.ts`
- `documentHandler.ts`
- `documentProcessingPipeline.ts`
- `employeeDataAccess.ts`
- `employeeSpecificIntelligence.ts`
- `enhancedBlitzAutomation.ts`
- `enhancedCrystalAutomation.ts`
- `enhancedWisdomAutomation.ts`
- `financial-story.ts`
- `flags.ts`
- `mobileNavBus.ts`
- `multiDocumentAnalysisEngine.ts`
- `multiEmployeeCollaboration.ts`
- `multiLayerCategorizationEngine.ts`
- `notifications-client.ts`
- `notify.ts`
- `ocrSpace.js`
- `openaiParse.js`
- `podcast.ts`
- `podcastAudioProcessor.ts`
- `podcastContentGenerator.ts`
- `podcastGenerator.ts`
- `primeBossSystem.ts`
- `security/registry.ts`
- `security/withSecurity.tsx`
- `sharedFinancialData.ts`
- `smartCategoriesSummarizer.ts`
- `smartHandoff.ts`
- `supabase.ts`
- `taskRouter.ts`
- `team-api.ts`
- `uiStore.ts`
- `universalAIEmployeeConnection.ts`
- `universalAIEmployeeIntelligenceSystem.ts`
- `universalIntelligenceFramework.ts`
- `universalPromptTemplate.ts`
- `universalResponseRequirements.ts`
- `user-status.test.ts`
- `user-status.ts`
- `user-usage.ts`
- `utils.ts`

---

### 2.5 `src/types/` - TypeScript Type Definitions (11 files)

✅ **Transaction Types (EXIST):**
- `transactions.ts` ✅ (Complete type definitions)

**Other Types:**
- `ai-employees.types.ts`
- `ai.ts`
- `database.types.ts`
- `finance/recurringObligations.ts`
- `podcast.types.ts`
- `prime.ts`
- `processedDocument.ts`
- `result.ts`
- `smartImport.ts`
- `tag.ts`

---

### 2.6 `src/contexts/` - React Contexts (8 files)

- `AIFinancialAssistantContext.tsx`
- `AudioContext.tsx`
- `AuthContext.tsx` ✅ (Used by transaction hooks)
- `DevToolsContext.tsx`
- `PersonalPodcastContext.tsx`
- `PrimeChatContext.tsx`
- `UserContext.tsx`
- `WorkspaceContext.tsx`

---

### 2.7 `src/components/chat/` - Chat Components (32 files)

**Main Chat Components:**
- `ByteChatCentralized.tsx`
- `ByteChatPopUp.tsx`
- `ByteChatStickyBar.tsx`
- `ByteDocumentChat_backup.tsx`
- `ByteDocumentChat_clean.tsx`
- `ByteWorkspaceOverlay.tsx`
- `ChatHistorySidebar.tsx`
- `ChatPageRedirect.tsx`
- `DesktopChatSideBar.tsx`
- `DocumentUploadZone.tsx`
- `EmployeeChatWorkspace.tsx`
- `EnhancedChatInterface.tsx`
- `FinancialStoryAI.tsx`
- `FloatingPrimeButton.tsx`
- `MobileChatInterface.tsx`
- `PersonalityHeader.tsx`
- `PrimeChatCentralized.tsx`
- `PrimeChatWindow.tsx`
- `PrimeChatWorkspace.tsx`
- `PrimeFloatingButton.tsx`
- `PrimeSidebarChat.tsx`
- `PrimeUpload.tsx`
- `QuickActionButtons.tsx`
- `SharedChatInterface.tsx`
- `ToolExecution.tsx`
- `UnifiedAssistantChat.tsx`
- `UniversalChatInterface.tsx`
- `AIEmployeeTestInterface.tsx`

**Legacy:**
- `_legacy/ByteDocumentChat.tsx`
- `_legacy/EnhancedPrimeChat.tsx`
- `_legacy/PrimeChat-page.tsx`
- `_legacy/PrimeChatInterface.tsx`

---

## 3. Transaction-Related Files Status

### ✅ EXISTING Files (Already Implemented)

**Hooks:**
- ✅ `src/hooks/useTransactions.ts` - Fetches committed transactions with real-time updates
- ✅ `src/hooks/usePendingTransactions.ts` - Fetches staging transactions with confidence scoring
- ✅ `src/hooks/useTransactionFilters.ts` - Manages filter state

**Components:**
- ✅ `src/components/transactions/TransactionList.tsx` - Main transaction table
- ✅ `src/components/transactions/TransactionRow.tsx` - Individual row component
- ✅ `src/components/transactions/TransactionDetailPanel.tsx` - Detail slide-in panel
- ✅ `src/components/transactions/ConfidenceBar.tsx` - Confidence visualization

**Utilities:**
- ✅ `src/lib/confidenceScoring.ts` - Confidence calculation logic
- ✅ `src/lib/duplicateDetection.ts` - Duplicate detection logic

**Types:**
- ✅ `src/types/transactions.ts` - Complete type definitions

**Pages:**
- ✅ `src/pages/dashboard/TransactionsPage.tsx` - Main transactions page (needs integration)

---

### ❌ MISSING Files (Need to be Created)

**Components (Phase 2 & 3):**
- ❌ `src/components/transactions/PendingReviewCard.tsx` (Phase 3)
- ❌ `src/components/transactions/BulkActionsBar.tsx` (Phase 2.4)
- ❌ `src/components/transactions/SuggestionChips.tsx` (Phase 2.3)
- ❌ `src/components/transactions/DuplicateWarning.tsx` (Phase 2.1)
- ❌ `src/components/transactions/ReceiptPreview.tsx` (Phase 2.5)
- ❌ `src/components/transactions/SplitTransactionModal.tsx` (Phase 2.7)
- ❌ `src/components/transactions/SemanticSearch.tsx` (Phase 2.8)
- ❌ `src/components/transactions/RecurringBadge.tsx` (Phase 2.9)
- ❌ `src/components/transactions/ProgressIndicator.tsx` (Phase 2.10)

**Utilities (Phase 2):**
- ❌ `src/lib/smartSuggestions.ts` (Phase 2.3)
- ❌ `src/lib/bulkOperations.ts` (Phase 2.4)
- ❌ `src/lib/userLearning.ts` (Phase 2.6)
- ❌ `src/lib/splitDetection.ts` (Phase 2.7)
- ❌ `src/lib/semanticSearch.ts` (Phase 2.8)
- ❌ `src/lib/recurringDetection.ts` (Phase 2.9)
- ❌ `src/lib/gamification.ts` (Phase 2.10)

**Database Migration:**
- ❌ `supabase/migrations/20250115_transaction_review_features.sql` ✅ (Already created)

---

## 4. Chat-Related Files Status

### ✅ EXISTING Files

**Hooks:**
- ✅ `src/hooks/usePrimeChat.ts` - Prime chat hook with streaming
- ✅ `src/hooks/useChat.ts` - Generic chat hook for employees
- ✅ `src/hooks/useChatHistory.ts` - Chat history management
- ✅ `src/hooks/useChatSessions.ts` - Session management

**Components:**
- ✅ `src/components/chat/` - 32 chat interface components
- ✅ `src/components/chat/UnifiedAssistantChat.tsx` - Unified chat interface
- ✅ `src/components/chat/PrimeChatCentralized.tsx` - Prime-specific chat
- ✅ `src/components/chat/ByteChatCentralized.tsx` - Byte-specific chat

**Utilities:**
- ✅ `src/lib/chat-api.ts` - Chat API client
- ✅ `src/lib/chatEndpoint.ts` - Endpoint configuration
- ✅ `src/lib/api/chat.ts` - Chat API utilities
- ✅ `src/lib/api/history.ts` - History API utilities

**Contexts:**
- ✅ `src/contexts/PrimeChatContext.tsx` - Prime chat context

---

## 5. Current Transactions Page Implementation

**File:** `src/pages/dashboard/TransactionsPage.tsx`

**Current Structure:**
- Uses `TransactionsWorkspacePanel` (left column, 33%)
- Uses `TransactionsUnifiedCard` (center column, 67%)
- Activity Feed handled by `DashboardLayout` (right column)
- Basic layout with workspace overlay support

**Status:** ✅ Page exists but needs integration with new transaction components

---

## 6. Package Dependencies

### Key Dependencies:

```json
{
  "@supabase/supabase-js": "^2.39.3",        // Database client ✅
  "@tanstack/react-query": "^5.18.1",        // Data fetching ✅
  "react": "^18.2.0",                        // React core ✅
  "react-router-dom": "^6.21.3",             // Routing ✅
  "lucide-react": "^0.314.0",               // Icons ✅
  "date-fns": "^3.3.1",                     // Date utilities ✅
  "chart.js": "^4.4.1",                     // Charts ✅
  "recharts": "^2.12.7",                    // More charts ✅
  "framer-motion": "^11.0.8",               // Animations ✅
  "react-hot-toast": "^2.4.1",              // Notifications ✅
  "zod": "^3.25.76",                        // Validation ✅
  "zustand": "^4.5.5"                       // State management ✅
}
```

**All Required Dependencies Are Installed** ✅

---

## 7. Summary & Next Steps

### ✅ What's Already Built (Phase 1 Complete)

1. **Data Layer:**
   - ✅ `useTransactions` hook with real-time updates
   - ✅ `usePendingTransactions` hook with confidence scoring
   - ✅ `useTransactionFilters` hook
   - ✅ Complete TypeScript types

2. **Core Components:**
   - ✅ `TransactionList` component
   - ✅ `TransactionRow` component
   - ✅ `TransactionDetailPanel` component
   - ✅ `ConfidenceBar` component

3. **Utilities:**
   - ✅ Confidence scoring system
   - ✅ Duplicate detection system

4. **Database:**
   - ✅ Migration script created

---

### 🚧 What Needs to be Built (Phases 2-4)

**Phase 2: Advanced Features**
- ❌ Smart Suggestions (`smartSuggestions.ts` + `SuggestionChips.tsx`)
- ❌ Bulk Actions (`bulkOperations.ts` + `BulkActionsBar.tsx`)
- ❌ Receipt Preview (`ReceiptPreview.tsx`)
- ❌ User Learning (`userLearning.ts`)
- ❌ Split Detection (`splitDetection.ts` + `SplitTransactionModal.tsx`)
- ❌ Semantic Search (`semanticSearch.ts` + `SemanticSearch.tsx`)
- ❌ Recurring Detection (`recurringDetection.ts` + `RecurringBadge.tsx`)
- ❌ Gamification (`gamification.ts` + `ProgressIndicator.tsx`)
- ❌ Duplicate Warning UI (`DuplicateWarning.tsx`)

**Phase 3: Enhanced Left Column**
- ❌ `PendingReviewCard.tsx` (replace placeholder)

**Phase 4: Integration**
- ❌ Integrate all components into `TransactionsPage.tsx`
- ❌ Wire up real-time subscriptions
- ❌ Run database migration

---

## 8. File Count Summary

| Category | Count | Status |
|----------|-------|--------|
| **Transaction Hooks** | 3/3 | ✅ Complete |
| **Transaction Components** | 4/13 | 🚧 9 remaining |
| **Transaction Utilities** | 2/9 | 🚧 7 remaining |
| **Transaction Types** | 1/1 | ✅ Complete |
| **Chat Hooks** | 4/4 | ✅ Complete |
| **Chat Components** | 32/32 | ✅ Complete |
| **Database Migrations** | 1/1 | ✅ Created (needs running) |

---

**Total Progress: ~40% Complete** 🎯

**Next Priority:** Build remaining Phase 2 components and utilities, then integrate into `TransactionsPage.tsx`.







