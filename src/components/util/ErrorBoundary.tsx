import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: any }> {
  state = { error: null };
  static getDerivedStateFromError(error: any) { return { error }; }
  render() {
    if (this.state.error) {
      return <div className="p-6 text-red-400">Something went wrong loading this page.</div>;
    }
    return this.props.children;
  }
}
























