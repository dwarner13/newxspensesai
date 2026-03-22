Create src/pages/dashboard/TransactionsPageV2.tsx — a complete rewrite of the Transactions page.

## CRITICAL: Read these files FIRST before writing any code:
- src/hooks/useTransactions.ts (returns { transactions: CommittedTransaction[], isLoading, isError, errorMessage, refetch })
- src/hooks/useImportList.ts (returns { imports: ImportListItem[], isLoading, refetch } — each item has id, status, created_at, label, statementLabel, docName)
- src/types/transactions.ts (CommittedTransaction: id, user_id, posted_at, merchant_name, amount, category, subcategory, import_id, document_id, created_at, updated_at)
- src/components/transactions/TransactionInsightDrawer.tsx (existing detail drawer — reuse it)
- src/components/layout/DashboardPageShell.tsx (page wrapper)
- src/contexts/AuthContext.tsx (useAuth for userId)

## DESIGN SPEC (match EXACTLY — this has been approved by the product owner):

Background: inherits #0b1220 from DashboardLayout — do NOT set background on this page
Font: Plus Jakarta Sans (add Google Fonts link in component JSX)
Cards: bg-slate-900/50 border border-slate-700/50 rounded-xl
Text: slate-100 primary, slate-400 labels, slate-500 muted

### LAYOUT (single column, max-w-[1100px] mx-auto, px-6 py-8, NO overflow:hidden anywhere):

1. HEADER ROW (flex justify-between)
- Left: "Transactions" (text-[24px] font-extrabold text-white tracking-tight)
- Below title: subtitle text-[12px] text-slate-400 showing statement count + transaction count
- Right: "Export" ghost button (bg-slate-800/50 border-slate-700/50) + "Upload" amber gradient button (from-amber-500 to-orange-500)

2. STAT CARDS (grid grid-cols-4 gap-3 mb-6)
Cards have: 11px uppercase tracking-[0.14em] text-slate-400 label, 26px font-extrabold value, 7x7 icon in bg-slate-800/60 rounded-lg
- Total Spent: text-red-400, sum of Math.abs(amount) where amount < 0, icon "?"
- Total Income: text-emerald-400, sum of amount where amount > 0, icon "?"  
- Net Flow: text-amber-400 if negative / text-emerald-400 if positive, icon "?"
- Transactions: text-white, count, icon "="
Each card: rounded-xl border border-slate-700/50 bg-slate-900/50 p-5 hover:border-slate-600/50 transition-all

3. TWO-COLUMN ROW (grid grid-cols-2 gap-3 mb-8)

LEFT — Category Donut:
- Same card styling
- Header: 10px font-bold uppercase tracking-[0.18em] text-slate-400 "Spending by category"
- Use recharts: PieChart, Pie (innerRadius=46, outerRadius=68, paddingAngle=3, strokeWidth=0), Cell
- Compute from transactions: group by category, sum Math.abs(amount) for expenses only
- Center of donut: total in 17px font-extrabold, "total" in 9px uppercase
- Right legend: colored dots + category name (12px slate-400) + amount (12px font-bold slate-300)
- Category colors: Personal Care=#ec4899, Subscriptions=#818cf8, Shopping=#a78bfa, Groceries=#fbbf24, Food & Dining=#fb923c, Transportation=#38bdf8, Healthcare=#f87171, Bank Fees=#94a3b8, Income=#34d399, Other=#475569

RIGHT — AI Insights:
- Same card styling
- Header: star icon in amber bg + "AI insights" label
- 3 computed insights, each in p-3 rounded-lg bg-slate-800/30 border border-slate-700/30:
  - Colored left bar (w-1 rounded-full)
  - Agent badge: 10px uppercase bold with agent color bg
  - Title: 13px font-semibold slate-200
  - Detail: 11px slate-500
- Insight 1 (Tag, green #34d399): Count categorized vs uncategorized
- Insight 2 (Crystal, pink #ec4899): Find top spending category and its percentage
- Insight 3 (Chime, amber #fbbf24): Find any merchant appearing 2+ times, show as recurring

4. FILTER BAR (flex justify-between mb-5)
- Left: All/Expenses/Income toggle in p-1 rounded-lg bg-slate-800/40 border border-slate-700/30
  - Active: bg-slate-700/60 text-white, inactive: text-slate-500 hover:text-slate-300
  - 13px font-bold, px-5 py-2
- Right: Statement pills from useImportList
  - "All" + unique statementLabels (deduplicate)
  - Active: bg-indigo-500/15 text-indigo-300 border border-indigo-500/30
  - Inactive: text-slate-600 border-transparent
  - Sanitize: if statementLabel length > 30 or contains "nsaction", show "Unknown"
  - 11px font-bold uppercase tracking-wider

5. TRANSACTION LIST (rounded-xl border border-slate-700/50 bg-slate-900/30 overflow-hidden)

SEARCH BAR: flex items-center gap-3 px-5 py-3.5 border-b border-slate-800/60
- Magnifying glass icon + text input, bg-transparent, 14px, placeholder "Search merchants, categories, amounts..."

REVIEW BANNER (only if uncategorized exist): mx-4 mt-4, amber bg, pulsing dot, "Tag found N transactions that need review", Review button

DATE GROUPS:
- Group transactions by posted_at date, sort descending
- Header: 11px font-bold uppercase tracking-[0.14em] text-slate-500, date formatted as "Monday, December 15, 2025", divider line, count
- pt-6 pb-2 spacing

TRANSACTION ROWS:
- button, full width, flex items-center gap-4 px-5 py-4
- border-b border-slate-800/50, hover:bg-slate-800/30
- Left: 44px rounded-xl icon with category color at 18% opacity, symbol in category color, 1px border at 25% opacity
- Icons: Personal Care=?, Subscriptions=?, Shopping=?, Groceries=?, Food & Dining=?, Transportation=?, Healthcare=?, Bank Fees=¦, Income=?, Other=?, Uncategorized=? with amber pulse dot
- Center: merchant (15px font-semibold slate-100 truncate), category below (12px slate-500) or "Needs category" (amber-400 with pulse dot) if uncategorized
- Right: amount (16px font-bold tabular-nums, emerald-400 for income with +, slate-200 for expense with -), source below (11px slate-600)
- Far right: chevron icon (3.5px slate-700)
- On click: setSelectedTx(tx)

LOAD MORE: w-full py-3 rounded-lg border-slate-700/40 ghost button, "Load more transactions"

6. FLOATING PRIME BUBBLE (fixed bottom-6 right-6 z-40)
- 56px rounded-2xl, bg-gradient-to-br from-amber-400 to-orange-500
- Star/crown SVG icon white
- Green dot (emerald-400) top-right with #0b1220 border

### STATE:
- filter: 'all' | 'expenses' | 'income'
- statementFilter: 'all' | importId
- searchQuery: string
- selectedTx: CommittedTransaction | null
- visibleCount: number (start 30, increment by 30 on load more)

### FILTERING LOGIC:
1. Start with all transactions from useTransactions
2. Filter by type (all/expenses/income based on amount sign)
3. Filter by statement (import_id match if not 'all')
4. Filter by search (merchant_name.toLowerCase().includes(query))
5. Sort by posted_at descending
6. Slice to visibleCount for display

### TransactionInsightDrawer:
- Import from src/components/transactions/TransactionInsightDrawer.tsx
- Read that file to understand its props
- Pass: transaction, isOpen, onClose, categories list, onCommittedCategorySaved={() => refetch()}

### ROUTE SWAP:
Update src/App.tsx:
- Change the /dashboard/transactions route to use TransactionsPageV2
- Keep old TransactionsPage.tsx (do not delete)

## ABSOLUTE RULES:
- MAX 450 lines total
- Tailwind classes only — NO custom CSS files
- Use existing hooks only — NO new API endpoints
- NO debug panels, diagnostic logging, or dev tools
- NO right sidebar, rail, or permanent side panel
- NO overflow:hidden on any div (parent layout handles scrolling)
- Wrap content in DashboardPageShell
- recharts is already installed — import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
- lucide-react is available for icons
