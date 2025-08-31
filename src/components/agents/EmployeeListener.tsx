import { useEffect } from 'react';
import { agentBus } from '../../lib/agents/bus';
import { AgentMessage, RouteSlug } from '../../lib/agents/protocol';

interface EmployeeListenerProps {
  slug: RouteSlug;
  onHandoff: (message: AgentMessage) => void;
}

export default function EmployeeListener({ slug, onHandoff }: EmployeeListenerProps) {
  useEffect(() => {
    const unsubscribe = agentBus.subscribe((message: AgentMessage) => {
      if (message.to !== slug) return;
      
      console.log(`🔄 ${slug} received handoff:`, message);
      onHandoff(message);
    });

    return unsubscribe;
  }, [slug, onHandoff]);

  return null; // This component doesn't render anything
}
