# Agent Protocol System

The Agent Protocol enables intelligent communication between the AI Boss and Employee agents throughout the XspensesAI dashboard.

## Overview

- **Boss**: Central AI that receives user requests and delegates to appropriate employees
- **Employees**: Specialized AI tools (Smart Import, Financial Assistant, etc.)
- **Protocol**: Shared message format and routing system
- **Bus**: In-memory event system for Boss ↔ Employee communication

## Key Components

### 1. Protocol (`src/lib/agents/protocol.ts`)
Defines the shared message structure:
- `AgentMessage`: Envelope for all communication
- `RouteSlug`: Identifies target employee routes
- `Capability`: Describes what each employee can do
- `UserContext`: Supabase user profile and stats

### 2. Registry (`src/lib/agents/registry.ts`)
Central mapping of employees:
- Route slugs → Dashboard paths
- Capabilities for each employee
- Helper functions for navigation

### 3. Event Bus (`src/lib/agents/bus.ts`)
Lightweight pub/sub system:
- `agentBus.publish()`: Send messages
- `agentBus.subscribe()`: Listen for messages
- `makeMsg()`: Helper to create messages

### 4. Context (`src/lib/agents/context.ts`)
Supabase user context provider:
- Automatically injects user profile into messages
- Provides `useBossContext()` hook
- Wraps app with `<BossProvider>`

## Usage Examples

### Boss Delegating to Employee

```tsx
import { agentBus, makeMsg } from '@/lib/agents/bus';
import { useBossContext } from '@/lib/agents/context';

function handoffTo(slug: RouteSlug, text: string, payload?: Record<string,any>) {
  const ctx = useBossContext();
  agentBus.publish(makeMsg({
    from: 'boss',
    to: slug,
    text,
    handoff: { slug, payload },
    context: ctx ?? undefined
  }));
}
```

### Employee Listening for Handoffs

```tsx
import { useEffect } from 'react';
import { agentBus } from '@/lib/agents/bus';
import { AgentMessage } from '@/lib/agents/protocol';

export default function SmartImportAI() {
  useEffect(() => {
    const unsub = agentBus.subscribe((msg: AgentMessage) => {
      if (msg.to !== 'dashboard.smartImport') return;
      
      // Boss handed off; handle the task
      if (msg.handoff?.payload?.prefillFileUrl) {
        // Auto-load file, open modal, etc.
      }
    });
    return unsub;
  }, []);

  return <div>Smart Import AI Component</div>;
}
```

### Using the Reusable Listener

```tsx
import EmployeeListener from '@/components/agents/EmployeeListener';

export default function SmartImportAI() {
  const handleHandoff = (message: AgentMessage) => {
    console.log('Received handoff:', message);
    // Handle the task based on message.handoff.payload
  };

  return (
    <>
      <EmployeeListener 
        slug="dashboard.smartImport" 
        onHandoff={handleHandoff} 
      />
      <div>Smart Import AI Component</div>
    </>
  );
}
```

### Employee Asking Boss for Help

```tsx
import { agentBus, makeMsg } from '@/lib/agents/bus';
import { useBossContext } from '@/lib/agents/context';

function askBoss(question: string) {
  const ctx = useBossContext();
  agentBus.publish(makeMsg({
    from: 'employee',
    to: 'boss',
    text: question,
    context: ctx ?? undefined
  }));
}
```

## Testing the System

1. **From BossBubble**: Ask "Import a bank PDF" → Should route to Smart Import AI
2. **Check Console**: Look for handoff messages being published/received
3. **Navigation**: Should automatically navigate to the correct employee page
4. **Context**: Messages should include user profile information

## File Structure

```
src/lib/agents/
├── protocol.ts      # Shared types and interfaces
├── registry.ts      # Employee mapping and capabilities
├── bus.ts          # Event bus for communication
├── context.ts      # Supabase user context provider
├── nav.ts          # Navigation helpers
└── README.md       # This documentation

src/components/agents/
└── EmployeeListener.tsx  # Reusable listener component
```

## Adding New Employees

1. Add route slug to `RouteSlug` type in `protocol.ts`
2. Add employee to `EMPLOYEES` array in `registry.ts`
3. Define capabilities for the employee
4. Use `EmployeeListener` component in the employee page

## Troubleshooting

- **No handoffs**: Check that `BossProvider` wraps your app
- **Wrong routes**: Verify paths in `registry.ts` match your actual routes
- **Missing context**: Ensure Supabase environment variables are set
- **Console errors**: Look for handoff parsing failures in `openaiClient.ts`
