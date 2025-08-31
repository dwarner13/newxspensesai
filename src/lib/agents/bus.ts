import { AgentMessage } from './protocol';

type Listener = (msg: AgentMessage) => void;

// Very small in-memory pub/sub
class AgentBus {
  private listeners = new Set<Listener>();

  publish(msg: AgentMessage) {
    this.listeners.forEach(l => l(msg));
  }
  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const agentBus = new AgentBus();

// helper to create messages
export function makeMsg(partial: Partial<AgentMessage>): AgentMessage {
  return {
    id: crypto.randomUUID(),
    from: partial.from ?? 'boss',
    to: partial.to ?? 'boss',
    timestamp: Date.now(),
    text: partial.text ?? '',
    intent: partial.intent,
    handoff: partial.handoff,
    context: partial.context,
  };
}
