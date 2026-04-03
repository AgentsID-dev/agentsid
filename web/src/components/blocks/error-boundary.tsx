import { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { AgentsIDLogo } from "@/components/blocks/logo";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Uncaught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <AgentsIDLogo className="w-12 h-12" />

          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="size-5" />
            <span className="text-sm font-medium uppercase tracking-wider">
              Runtime Error
            </span>
          </div>

          <h1 className="text-3xl font-bold text-foreground">
            Something went wrong
          </h1>

          <p className="text-muted-foreground leading-relaxed">
            An unexpected error occurred while rendering the page. This has been
            logged for investigation.
          </p>

          {this.state.error && (
            <div className="w-full rounded-lg border border-border bg-muted/30 p-4 text-left">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {this.state.error.message}
              </p>
            </div>
          )}

          <Button onClick={this.handleReload} size="lg" className="mt-2">
            Reload Page
          </Button>
        </div>
      </div>
    );
  }
}

export { ErrorBoundary };
