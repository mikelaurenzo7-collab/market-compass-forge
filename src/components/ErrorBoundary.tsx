import { Component, ReactNode } from "react";
import { AlertCircle, RotateCcw, WifiOff } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error): boolean {
  const msg = error.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError") ||
    error.name === "ChunkLoadError"
  );
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const chunkError = this.state.error ? isChunkLoadError(this.state.error) : false;

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-md w-full rounded-lg border border-border bg-card p-6 text-center space-y-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto ${chunkError ? "bg-warning/10" : "bg-destructive/10"}`}>
              {chunkError ? <WifiOff className="h-6 w-6 text-warning" /> : <AlertCircle className="h-6 w-6 text-destructive" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {chunkError ? "Failed to load page" : "Something went wrong"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {chunkError
                  ? "A network error prevented this page from loading. Please check your connection and try again."
                  : (this.state.error?.message || "An unexpected error occurred.")}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={chunkError ? this.handleReload : this.handleReset}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" /> {chunkError ? "Reload Page" : "Try Again"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
