# Unified Smart Import AI Page Template

This document describes the complete unified template structure for the Smart Import AI page, which serves as the standard layout for all AI specialist pages.

## Overview

The unified Smart Import AI page uses a **3-column grid layout** that provides:
- **Left Column (33%)**: Workspace Panel with status cards
- **Center Column (42%)**: Unified presentation card
- **Right Column (25%)**: Activity Feed

## File Structure

```
src/
├── pages/dashboard/
│   └── SmartImportChatPage.tsx          # Main page component
├── components/smart-import/
│   ├── ByteWorkspacePanel.tsx           # Left column workspace panel
│   └── ByteUnifiedCard.tsx              # Center column presentation card
└── components/dashboard/
    └── ActivityPanel.tsx                 # Right column activity feed
```

## Component Breakdown

### 1. Main Page: `SmartImportChatPage.tsx`

**Purpose**: Orchestrates the 3-column layout and manages workspace overlay state.

**Key Features**:
- 3-column grid layout (`grid-cols-12` with `lg:col-span-4`, `lg:col-span-5`, `lg:col-span-3`)
- Workspace overlay state management (open/close/minimize)
- No inline chat UI (chat only appears in popup overlay)

**Structure**:
```tsx
<DashboardSection>
  <div className="grid grid-cols-12 gap-0 items-stretch">
    {/* LEFT: ByteWorkspacePanel */}
    <section className="col-span-12 lg:col-span-4">
      <ByteWorkspacePanel />
    </section>
    
    {/* CENTER: ByteUnifiedCard */}
    <section className="col-span-12 lg:col-span-5">
      <ByteUnifiedCard 
        onExpandClick={openByteWorkspace}
        onChatInputClick={openByteWorkspace}
      />
    </section>
    
    {/* RIGHT: ActivityPanel */}
    <aside className="col-span-12 lg:col-span-3">
      <ActivityPanel />
    </aside>
  </div>
</DashboardSection>

{/* Workspace Overlay */}
<ByteWorkspaceOverlay 
  open={isByteWorkspaceOpen}
  onClose={closeByteWorkspace}
  minimized={isMinimized}
  onMinimize={minimizeByteWorkspace}
/>
```

### 2. Left Column: `ByteWorkspacePanel.tsx`

**Purpose**: Displays workspace status cards and metrics.

**Contains**:
1. **Header**: "BYTE WORKSPACE" with emoji icon
2. **Card 1**: Processing Queue Status (with progress bar)
3. **Card 2**: Monthly Statistics (with trend indicator)
4. **Card 3**: Import Health & Alerts (flex-1 to fill remaining space)
   - Small metrics row (Error rate, Failed docs, Manual reviews)
   - Scrollable alerts list

**Styling**:
- Background: `bg-slate-900`
- Border: `border-slate-800`
- Padding: `p-6`
- Rounded: `rounded-xl`
- Full height: `h-full flex flex-col`

### 3. Center Column: `ByteUnifiedCard.tsx`

**Purpose**: Centered presentation card showcasing Byte's information.

**Contains**:
- **Large Avatar Circle**: 128px (`w-32 h-32`) with 📄 emoji
- **Title Section**:
  - "Byte" (text-4xl, bold, white)
  - Horizontal separator line (blue-500, w-12 h-1)
  - "Smart Import AI" (text-3xl, bold, white)
- **Role Description**: "Data Processing Specialist" (text-lg, gray-300)
- **Guardrails Badge**: Green badge with Shield icon
- **Feature Description**: Text about capabilities (text-base, gray-400)
- **Background Gradients**: Top and bottom decorative overlays

**Styling**:
- Background: `bg-gradient-to-br from-gray-900 to-gray-800`
- Border: `border-gray-800`
- Padding: `p-8`
- Centered: `flex flex-col items-center justify-center text-center`
- Full height: `h-full`
- Relative positioning for gradient overlays

### 4. Right Column: `ActivityPanel.tsx`

**Purpose**: Displays recent AI team activity feed.

**Contains**:
- Header: "ACTIVITY FEED"
- Scrollable list of activity items
- Timestamps for each activity

**Styling**:
- Background: `bg-slate-900`
- Border: `border-slate-800`
- Padding: `p-6`
- Rounded: `rounded-xl`
- Full height: `h-full flex flex-col`

## Layout Specifications

### Grid System
- **Total Columns**: 12 (Tailwind grid-cols-12)
- **Left Column**: `col-span-4` (33.33%)
- **Center Column**: `col-span-5` (41.67%)
- **Right Column**: `col-span-3` (25%)
- **Gap**: `gap-0` (no gaps between columns)
- **Responsive**: Stacks vertically on mobile (`col-span-12`)

### Height Management
- **Container**: `minHeight: 'calc(100vh - 200px)'`
- **All Columns**: `items-stretch` ensures equal heights
- **Flex Layout**: Each column uses `flex flex-col` for vertical stacking

## Workspace Overlay Integration

The page includes a workspace overlay that opens when users interact with Byte:

```tsx
const [isByteWorkspaceOpen, setIsByteWorkspaceOpen] = useState(false);
const [isMinimized, setIsMinimized] = useState(false);

const openByteWorkspace = () => {
  setIsByteWorkspaceOpen(true);
  setIsMinimized(false);
};

const closeByteWorkspace = () => {
  setIsByteWorkspaceOpen(false);
  setIsMinimized(false);
};

const minimizeByteWorkspace = () => {
  setIsByteWorkspaceOpen(false);
  setIsMinimized(true);
};
```

## Key Design Principles

1. **No Inline Chat**: Chat UI only appears in workspace overlay popup, never in the main dashboard grid
2. **Consistent Styling**: All cards use `slate-900` background, `slate-800` borders, `rounded-xl` corners
3. **Full Height**: All columns stretch to fill available vertical space
4. **Centered Presentation**: Middle column uses centered, presentation-style layout
5. **Status Cards**: Left column shows actionable status cards with badges and metrics
6. **Activity Feed**: Right column provides context about recent AI team activity

## Reusing This Template for Other AI Specialists

To create a similar page for another AI specialist (e.g., Tag, Liberty, Finley):

1. **Create Page Component**: Copy `SmartImportChatPage.tsx` and rename
2. **Create Workspace Panel**: Copy `ByteWorkspacePanel.tsx` and customize cards/content
3. **Create Unified Card**: Copy `ByteUnifiedCard.tsx` and update:
   - Avatar emoji
   - Title and subtitle
   - Role description
   - Feature description
   - Color scheme (blue → specialist's color)
4. **Update Overlay**: Use corresponding workspace overlay component
5. **Update Route**: Add route in `App.tsx` pointing to new page

## Example: Liberty Financial Freedom Page

The Liberty page (`AIFinancialFreedomPage.tsx`) follows this same template:
- Left: `LibertyWorkspacePanel`
- Center: `LibertyUnifiedCard`
- Right: `ActivityPanel`
- Overlay: `LibertyWorkspace`

## Files Reference

### Core Files
- `src/pages/dashboard/SmartImportChatPage.tsx` - Main page
- `src/components/smart-import/ByteWorkspacePanel.tsx` - Left column
- `src/components/smart-import/ByteUnifiedCard.tsx` - Center column
- `src/components/dashboard/ActivityPanel.tsx` - Right column
- `src/components/chat/ByteWorkspaceOverlay.tsx` - Chat overlay

### Supporting Files
- `src/components/ui/DashboardSection.tsx` - Section wrapper
- `src/components/workspace/AIWorkspaceOverlay.tsx` - Base overlay component
- `src/components/workspace/AIWorkspaceHeader.tsx` - Overlay header

## Current Status

✅ **Complete and Active**
- All components implemented
- Layout matches Liberty Financial Freedom style
- Workspace overlay integrated
- No inline chat in dashboard grid
- Responsive design (mobile-friendly)

## Notes

- The middle column presentation card matches the Liberty style exactly
- All chat interactions happen in the popup overlay, not inline
- The template is designed to be reusable for other AI specialists
- Grid layout uses `gap-0` for seamless column alignment



