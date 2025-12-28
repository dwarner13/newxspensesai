import { Component, type ReactNode } from "react";

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, errorInfo: null };
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }
  
  render() {
    if (this.state.error) {
      const isDev = import.meta.env.DEV;
      return (
        <div className="p-6 bg-red-950/50 border border-red-500/30 rounded-lg">
          <h2 className="text-lg font-semibold text-red-400 mb-2">
            Something went wrong loading this page.
          </h2>
          {isDev && this.state.error && (
            <div className="mt-4 space-y-2">
              <div className="text-sm text-red-300">
                <strong>Error:</strong> {this.state.error.message}
              </div>
              {this.state.error.stack && (
                <details className="text-xs text-red-400/80">
                  <summary className="cursor-pointer mb-2">Stack trace</summary>
                  <pre className="whitespace-pre-wrap bg-red-950/30 p-3 rounded border border-red-500/20 overflow-auto max-h-64">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              {this.state.errorInfo && (
                <details className="text-xs text-red-400/80">
                  <summary className="cursor-pointer mb-2">Component stack</summary>
                  <pre className="whitespace-pre-wrap bg-red-950/30 p-3 rounded border border-red-500/20 overflow-auto max-h-64">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
























