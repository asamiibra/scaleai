// src/components/ErrorBoundary.tsx
"use client";

import React from "react";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type FallbackComponentProps = { error: Error; reset: () => void };

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<FallbackComponentProps>;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: props.showDetails || false,
    };
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    // TODO: send to error tracking in production
  }

  private reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: this.props.showDetails || false,
    });
  };

  private toggleDetails = () => {
    this.setState((prev) => ({
      showDetails: !prev.showDetails,
    }));
  };

  private reloadPage = () => {
    window.location.reload();
  };

  private goHome = () => {
    window.location.href = "/";
  };

  render() {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { fallback: Fallback } = this.props;

    if (hasError) {
      if (Fallback && error) {
        return <Fallback error={error} reset={this.reset} />;
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            {/* Main Error Card */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-slate-100 mb-1">
                      Something went wrong
                    </h2>
                    <p className="text-sm text-slate-400 mb-4">
                      {error?.message ||
                        "An unexpected error occurred."}
                    </p>
                    <button
                      onClick={this.toggleDetails}
                      className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      {showDetails ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show details
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Details */}
              {showDetails && (
                <div className="p-6 bg-slate-950 border-b border-slate-800">
                  <pre className="text-xs text-rose-400 overflow-x-auto whitespace-pre-wrap">
                    {error?.stack}
                    {errorInfo?.componentStack}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="p-6 flex gap-4">
                <button
                  onClick={this.reset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try again</span>
                </button>
                <button
                  onClick={this.reloadPage}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reload Page</span>
                </button>
                <button
                  onClick={this.goHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl font-medium transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>Go Home</span>
                </button>
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500">
                If this problem persists, please contact support with
                the error details above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// ERROR FALLBACK COMPONENT
// ============================================================================

export const ErrorFallback: React.FC<FallbackComponentProps> = ({
  error,
  reset,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center">
        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-100 mb-2">
          Oops! Something went wrong
        </h2>
        <p className="text-sm text-slate-400 mb-2">
          {error?.message || "An unexpected error occurred"}
        </p>
        <p className="text-xs text-slate-500 mb-6">
          Don't worry, your data is safe. You can try again or refresh
          the page.
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl font-medium transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HOC FOR WRAPPING COMPONENTS
// ============================================================================

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<FallbackComponentProps>
) {
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  Wrapped.displayName = `WithErrorBoundary(${
    Component.displayName || Component.name || "Component"
  })`;

  return Wrapped;
}
