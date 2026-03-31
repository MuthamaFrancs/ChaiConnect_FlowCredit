import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Uncaught error in component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8 bg-emerald-50 rounded-xl m-4 border border-emerald-100 shadow-sm">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops, something went wrong</h2>
            <p className="text-gray-600 mb-6">
              A temporary issue occurred while loading this section of the dashboard.
            </p>
            <div className="bg-white p-4 rounded-lg text-sm font-mono text-red-500 overflow-auto mb-6 border border-gray-100 text-left">
              {this.state.error?.message || 'Unknown error occurred'}
            </div>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
