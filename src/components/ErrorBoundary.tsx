import { Component, ReactNode } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional fallback message for context-specific boundaries */
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo) {
    // In production, this would send to an error reporting service (e.g., Sentry)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6" role="alert">
          <div className="max-w-md w-full rounded-lg border border-border bg-card p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {this.props.fallbackMessage || "This section encountered an error. Your data is safe."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Try Again
              </button>
              <a
                href="/dashboard"
                className="h-9 px-4 rounded-md border border-border bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors inline-flex items-center gap-2"
              >
                <Home className="h-4 w-4" /> Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
