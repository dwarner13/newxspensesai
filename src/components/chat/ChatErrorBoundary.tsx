/**
 * ChatErrorBoundary
 * 
 * Local error boundary specifically for chat components.
 * Prevents chat crashes from affecting the dashboard.
 * Shows minimal fallback UI when chat fails.
 */

import { Component, type ReactNode } from "react";

interface ChatErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ChatErrorBoundaryProps {
  children: ReactNode;
}

export class ChatErrorBoundary extends Component<ChatErrorBoundaryProps, ChatErrorBoundaryState> {
  state: ChatErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<ChatErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging (non-blocking)
    if (import.meta.env.DEV) {
      console.error('[ChatErrorBoundary] Chat component error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Minimal fallback - don't show error UI, just render nothing
      // This prevents chat crashes from affecting dashboard
      return null;
    }

    return this.props.children;
  }
}




