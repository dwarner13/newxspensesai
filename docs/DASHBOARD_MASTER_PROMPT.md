# XspensesAI Dashboard - Master Prompt Guide

Save this file in your project at: `docs/DASHBOARD_MASTER_PROMPT.md` or `prompts/DASHBOARD_MASTER_PROMPT.md`

Use this prompt whenever you need to create or fix dashboard pages.

---

## ⚠️ CRITICAL RULES FOR ALL DASHBOARD PAGES

### Rule 1: Exactly 3 Columns

Every dashboard page must have EXACTLY 3 columns:

- **Left** (`col-span-4` = 33%): WorkspacePanel
- **Center** (`col-span-5` = 42%): UnifiedCard
- **Right** (`col-span-3` = 25%): ActivityPanel

### Rule 2: NO Duplicate Activity Feeds

- ActivityPanel appears **ONLY ONCE** per page
- ActivityPanel goes **ONLY** in the right column (`col-span-3`)
- **NEVER** add ActivityFeed inside UnifiedCard components
- **NEVER** add a 4th column for ActivityFeed

### Rule 3: Consistent Structure

All pages must follow the same layout pattern as `SmartImportChatPage.tsx`

---

## 📐 Standard Page Layout Template

```tsx
import React, { useState } from 'react';
import { [Agent]WorkspacePanel } from '../../components/[agent]/[Agent]WorkspacePanel';
import { [Agent]UnifiedCard } from '../../components/[agent]/[Agent]UnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
import { [Agent]WorkspaceOverlay } from '../../components/chat/[Agent]WorkspaceOverlay';

export function [PageName]Page() {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openWorkspace = () => {
    setIsWorkspaceOpen(true);
    setIsMinimized(false);
  };

  const closeWorkspace = () => {
    setIsWorkspaceOpen(false);
    setIsMinimized(false);
  };

  const minimizeWorkspace = () => {
    setIsWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          
          {/* LEFT COLUMN (col-span-4 = 33%): Workspace Panel */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <[Agent]WorkspacePanel />
          </section>
          
          {/* CENTER COLUMN (col-span-5 = 42%): Unified Card ONLY */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <[Agent]UnifiedCard 
              onExpandClick={openWorkspace} 
              onChatInputClick={openWorkspace} 
            />
          </section>
          
          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed - ONLY ONE */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
          
        </div>
      </DashboardSection>

      {/* Workspace Overlay - Floating centered chatbot */}
      <[Agent]WorkspaceOverlay 
        open={isWorkspaceOpen} 
        onClose={closeWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeWorkspace}
      />
    </>
  );
}
```

---

## 🎨 UnifiedCard Component Template

```tsx
import React, { useState, useCallback } from 'react';
import { Send, [Icon1], [Icon2], [Icon3] } from 'lucide-react';
import { Button } from '../ui/button';
import { EmployeeChatWorkspace } from '../chat/EmployeeChatWorkspace';

interface [Agent]UnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function [Agent]UnifiedCard({ onExpandClick, onChatInputClick }: [Agent]UnifiedCardProps) {
  const [inputValue, setInputValue] = useState('');
  const [sendFunction, setSendFunction] = useState<((message: string) => Promise<void>) | null>(null);

  // IMPORTANT: Wrap in useCallback to prevent infinite re-renders
  const handleSendFunctionReady = useCallback((fn: (message: string) => Promise<void>) => {
    setSendFunction(() => fn);
  }, []);

  const handleSend = async () => {
    if (inputValue.trim() && sendFunction) {
      await sendFunction(inputValue);
      setInputValue('');
    }
  };

  const hasText = inputValue.trim().length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-full">
      
      {/* Header Section with Gradient */}
      <div className="bg-gradient-to-br from-[THEME]-900/40 to-slate-900/10 border-b border-slate-800 pb-6 flex-shrink-0 -mx-6 -mt-6 px-6 pt-6">
        
        {/* Avatar and Title */}
        <div className="flex items-center gap-4 mb-3">
          <div className="w-16 h-16 bg-[THEME]-600 rounded-full flex items-center justify-center shadow-lg shadow-[THEME]-500/50 flex-shrink-0">
            <span className="text-3xl">[EMOJI]</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white">
              [Agent Name] — [Agent Title]
            </h2>
            <p className="text-sm text-slate-400">
              [Agent subtitle description]
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-[COLOR1]-400">[STAT1]</div>
            <div className="text-xs text-slate-500">[Label 1]</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-[COLOR2]-400">[STAT2]</div>
            <div className="text-xs text-slate-500">[Label 2]</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-[COLOR3]-400">[STAT3]</div>
            <div className="text-xs text-slate-500">[Label 3]</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-[THEME]-500/30 text-white"
          >
            <[Icon1] className="w-4 h-4 mr-2" />
            [Button 1 Text]
          </Button>
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-[THEME]-500/30 text-white"
          >
            <[Icon2] className="w-4 h-4 mr-2" />
            [Button 2 Text]
          </Button>
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-[THEME]-500/30 text-white"
          >
            <[Icon3] className="w-4 h-4 mr-2" />
            [Button 3 Text]
          </Button>
        </div>
      </div>

      {/* Chat Workspace */}
      <div className="flex-1 min-h-0 overflow-hidden -mx-6">
        <EmployeeChatWorkspace
          employeeSlug="[agent-slug]"
          className="h-full px-6"
          showHeader={false}
          showComposer={false}
          onSendFunctionReady={handleSendFunctionReady}
        />
      </div>

      {/* Footer - Guardrails Badge */}
      <div className="pt-3 pb-0 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300/80 border-t border-slate-800/50 flex-shrink-0 -mx-6 px-6">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300 border border-emerald-500/20">
            🔒 Guardrails + PII Protection Active
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Secure • Always Supporting
        </div>
      </div>

      {/* Chat Input */}
      <div className="flex-shrink-0 -mx-6 px-6">
        <div 
          className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2 border border-slate-700 focus-within:border-[THEME]-500 transition-all duration-200 cursor-pointer"
          onClick={onChatInputClick}
        >
          <input
            type="text"
            placeholder="Ask [Agent] about [topic]..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && hasText) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 outline-none cursor-pointer"
            readOnly={!!onChatInputClick}
          />
          <button
            onClick={handleSend}
            className="w-10 h-10 bg-gradient-to-br from-[THEME]-500 to-[THEME]-600 rounded-full flex items-center justify-center shadow-lg shadow-[THEME]-500/30 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={!hasText || !sendFunction}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🗂️ WorkspacePanel Component Template

```tsx
import React from 'react';
import { [Icons] } from 'lucide-react';

export function [Agent]WorkspacePanel() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[THEME]-600/20 rounded-lg flex items-center justify-center">
          <[Icon] className="w-5 h-5 text-[THEME]-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">[AGENT] WORKSPACE</h3>
          <p className="text-sm text-slate-400">[Workspace description]</p>
        </div>
      </div>

      {/* Section 1 */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white">[Section 1 Title]</h4>
          <span className="text-xs bg-[THEME]-500/20 text-[THEME]-300 px-2 py-1 rounded-full">
            [Badge]
          </span>
        </div>
        <p className="text-sm text-slate-400">[Section 1 content]</p>
        <p className="text-xs text-slate-500 mt-1">[Timestamp]</p>
      </div>

      {/* Section 2 */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white">[Section 2 Title]</h4>
          <span className="text-xs bg-[THEME]-500/20 text-[THEME]-300 px-2 py-1 rounded-full">
            [Badge]
          </span>
        </div>
        <p className="text-sm text-slate-400">[Section 2 content]</p>
        <p className="text-xs text-slate-500 mt-1">[Timestamp]</p>
      </div>

      {/* Section 3 */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white">[Section 3 Title]</h4>
          <span className="text-xs bg-[THEME]-500/20 text-[THEME]-300 px-2 py-1 rounded-full">
            [Badge]
          </span>
        </div>
        <p className="text-sm text-slate-400">[Section 3 content]</p>
        <p className="text-xs text-slate-500 mt-1">[Timestamp]</p>
      </div>

      {/* Spacer to push content up */}
      <div className="flex-1" />

    </div>
  );
}
```

---

## 🎨 Color Themes by Agent

| Agent | Theme Color | Gradient From | Icon BG | Shadow |
|-------|------------|---------------|---------|--------|
| Byte (Smart Import) | Blue | `from-blue-900/40` | `bg-blue-600` | `shadow-blue-500/50` |
| Finley (AI Chat) | Orange | `from-orange-900/40` | `bg-orange-600` | `shadow-orange-500/50` |
| Tag (Categories) | Teal | `from-teal-900/40` | `bg-teal-600` | `shadow-teal-500/50` |
| Analytics | Cyan | `from-cyan-900/40` | `bg-cyan-600` | `shadow-cyan-500/50` |
| Goalie (Goals) | Amber | `from-amber-900/40` | `bg-amber-600` | `shadow-amber-500/50` |
| Crystal (Predictions) | Fuchsia | `from-fuchsia-900/40` | `bg-fuchsia-600` | `shadow-fuchsia-500/50` |
| Liberty (Freedom) | Rose | `from-rose-900/40` | `bg-rose-600` | `shadow-rose-500/50` |
| Dash (Business) | Indigo | `from-indigo-900/40` | `bg-indigo-600` | `shadow-indigo-500/50` |
| Tax | Blue/Navy | `from-blue-900/40` | `bg-blue-700` | `shadow-blue-500/50` |
| Podcast | Red | `from-red-900/40` | `bg-red-600` | `shadow-red-500/50` |
| Therapist | Emerald | `from-emerald-900/40` | `bg-emerald-600` | `shadow-emerald-500/50` |
| Wellness | Teal | `from-teal-900/40` | `bg-teal-600` | `shadow-teal-500/50` |
| Spotify | Green | `from-green-900/40` | `bg-green-600` | `shadow-green-500/50` |
| Settings | Slate | `from-slate-800/40` | `bg-slate-600` | `shadow-slate-500/50` |
| Reports | Violet | `from-violet-900/40` | `bg-violet-600` | `shadow-violet-500/50` |

---

## 📊 Stats Color Guidelines

Use these colors for the 3 metrics in each UnifiedCard:

- **Position**: Recommended Colors
- **Stat 1**: `text-blue-400`, `text-cyan-400`, `text-rose-400`, `text-[THEME]-400`
- **Stat 2**: `text-green-400`, `text-emerald-400` (usually for positive metrics)
- **Stat 3**: `text-purple-400`, `text-blue-400`, `text-amber-400`

---

## 📁 File Structure

```
src/
├── components/
│   ├── [agent]/
│   │   ├── [Agent]WorkspacePanel.tsx
│   │   └── [Agent]UnifiedCard.tsx
│   ├── chat/
│   │   ├── EmployeeChatWorkspace.tsx
│   │   └── [Agent]WorkspaceOverlay.tsx
│   ├── dashboard/
│   │   └── ActivityPanel.tsx
│   └── ui/
│       ├── DashboardSection.tsx
│       └── button.tsx
├── pages/
│   └── dashboard/
│       └── [PageName]Page.tsx
```

---

## ✅ Checklist for New Pages

When creating a new dashboard page, verify:

- [ ] Page uses `DashboardSection` wrapper
- [ ] Grid is `grid-cols-12` with `gap-0`
- [ ] Left column is `col-span-12 lg:col-span-4`
- [ ] Center column is `col-span-12 lg:col-span-5`
- [ ] Right column is `col-span-12 lg:col-span-3`
- [ ] Only **ONE** ActivityPanel exists (in right column)
- [ ] No ActivityPanel or ActivityFeed inside UnifiedCard
- [ ] UnifiedCard has header gradient with negative margins
- [ ] UnifiedCard has 3 stats with colored numbers
- [ ] UnifiedCard has 3 action buttons
- [ ] UnifiedCard has guardrails badge
- [ ] UnifiedCard has chat input at bottom
- [ ] WorkspacePanel has consistent section styling
- [ ] `handleSendFunctionReady` uses `useCallback` to prevent infinite loops
- [ ] Overlay component exists for expanded chat view

---

## 🐛 Common Issues & Fixes

### Issue: Duplicate Activity Feed

**Cause**: ActivityPanel added inside UnifiedCard or as 4th column

**Fix**: Remove ActivityPanel from UnifiedCard, ensure only in right column

### Issue: Infinite Re-render Loop

**Cause**: `onSendFunctionReady` callback not wrapped in `useCallback`

**Fix**:
```tsx
const handleSendFunctionReady = useCallback((fn: (message: string) => Promise<void>) => {
  setSendFunction(() => fn);
}, []);
```

### Issue: Text Truncated in Title/Buttons

**Cause**: Column too narrow or text too long

**Fix**: Use `truncate` class or shorter text labels

### Issue: Stats Not Aligned

**Cause**: Missing `flex-1` on stat containers

**Fix**: Use `flex-1 flex flex-col items-center text-center` for each stat

---

## 📚 Reference Files

Always use these as templates:

| Component Type | Reference File |
|----------------|----------------|
| Page Layout | `SmartImportChatPage.tsx` |
| UnifiedCard | `ByteUnifiedCard.tsx` |
| WorkspacePanel | `ByteWorkspacePanel.tsx` |
| Overlay | `ByteWorkspaceOverlay.tsx` |
| Activity Panel | `ActivityPanel.tsx` |

---

## 🚀 Quick Start Prompt

Copy this when asking Composer to create a new page:

```
Create a new dashboard page for [PAGE NAME] following the 3-column layout:

1. Create `[Agent]WorkspacePanel.tsx` with sections for:
   - [Section 1]
   - [Section 2]
   - [Section 3]

2. Create `[Agent]UnifiedCard.tsx` with:
   - Icon: [EMOJI]
   - Theme: [COLOR] (from-[color]-900/40, bg-[color]-600)
   - Title: "[Agent] — [Title]"
   - Subtitle: "[Description]"
   - Metrics: [STAT1] / [STAT2] / [STAT3]
   - Buttons: [BTN1] / [BTN2] / [BTN3]
   - Chat placeholder: "Ask [Agent] about..."

3. Create `[PageName]Page.tsx` with:
   - LEFT: col-span-4 → WorkspacePanel
   - CENTER: col-span-5 → UnifiedCard (NO ActivityFeed!)
   - RIGHT: col-span-3 → ActivityPanel (ONLY ONE)

Use ByteUnifiedCard.tsx and ByteWorkspacePanel.tsx as templates.
```

---

**Last updated**: November 2025  
**Reference**: XspensesAI Dashboard Standards v1.0








